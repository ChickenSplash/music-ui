import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { recordPlay, type Track } from './music'
import { PlayerContext, type PlayContext, type Player, type Repeat } from './player-context'

const VOLUME_KEY = 'music.volume'

/** A play counts after 30 seconds, or halfway through anything shorter than a minute. */
const countsAsPlayed = (seconds: number, duration: number) => seconds >= Math.min(30, duration / 2 || 30)

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// One element for the app's lifetime. Outside React, so playback survives re-renders and remounts.
const audio = new Audio()
audio.preload = 'auto'

const storedVolume = () => {
  const value = Number(localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(value) && value >= 0 && value <= 1 && localStorage.getItem(VOLUME_KEY) !== null ? value : 0.8
}

/**
 * One <audio> element for the whole app, so playback carries on across pages. The queue is
 * kept in the order it was given; shuffle keeps a second order alongside it.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  // `order` is the play order (shuffled or not) as indexes into `queue`; `at` is where we are in it.
  const [queue, setQueue] = useState<Track[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [at, setAt] = useState(0)
  const [context, setContext] = useState<PlayContext | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [volume, setVolumeState] = useState(storedVolume)
  const [muted, setMuted] = useState(false)

  const track = queue[order[at]] ?? null
  const counted = useRef<number | null>(null)

  // Logging out unmounts the player: stop the music with it.
  useEffect(
    () => () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    },
    [],
  )

  // A new current track: load it. Only when the track itself changes, not on every queue edit.
  const trackKey = track ? `${track.id}:${at}:${order.join(',')}` : ''
  const loadedId = useRef<number | null>(null)
  const autoplay = useRef(false)
  useEffect(() => {
    if (!track) {
      audio.removeAttribute('src')
      audio.load()
      loadedId.current = null
      return
    }
    if (loadedId.current === track.id && audio.src) return
    loadedId.current = track.id
    counted.current = null
    setError(null)
    audio.src = `/api/music/tracks/${track.id}/stream`
    if (autoplay.current) audio.play().catch(() => setPlaying(false))
  }, [trackKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  const go = useCallback(
    (index: number) => {
      autoplay.current = true
      // Same track again (repeat on a one-track queue): just restart it.
      if (index === at) {
        audio.currentTime = 0
        audio.play().catch(() => setPlaying(false))
        counted.current = null
        return
      }
      // Reload even if it's the same track again (it can be in a playlist twice).
      loadedId.current = null
      setAt(index)
    },
    [at],
  )

  const next = useCallback(() => {
    if (!order.length) return
    if (at + 1 < order.length) go(at + 1)
    else if (repeat === 'all') go(0)
    else {
      audio.pause()
      audio.currentTime = 0
    }
  }, [at, order.length, repeat, go])

  const previous = useCallback(() => {
    if (audio.currentTime > 3 || at === 0) {
      audio.currentTime = 0
      return
    }
    go(at - 1)
  }, [at, go])

  // Audio element events. Handlers read the latest state through a ref.
  const latest = useRef({ next, repeat, track })
  useEffect(() => {
    latest.current = { next, repeat, track }
  })
  useEffect(() => {
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onReady = () => setLoading(false)
    const onEnded = () => {
      if (latest.current.repeat === 'one') {
        audio.currentTime = 0
        counted.current = null
        audio.play().catch(() => setPlaying(false))
      } else latest.current.next()
    }
    const onTime = () => {
      const current = latest.current.track
      if (current && counted.current !== current.id && countsAsPlayed(audio.currentTime, audio.duration)) {
        counted.current = current.id
        recordPlay(current.id)
      }
    }
    const onError = () => {
      if (!audio.getAttribute('src')) return
      setLoading(false)
      setPlaying(false)
      setError("Couldn't play this track.")
    }
    const events: [string, () => void][] = [
      ['play', onPlay],
      ['pause', onPause],
      ['waiting', onWaiting],
      ['loadstart', onWaiting],
      ['canplay', onReady],
      ['playing', onReady],
      ['ended', onEnded],
      ['timeupdate', onTime],
      ['error', onError],
    ]
    events.forEach(([name, handler]) => audio.addEventListener(name, handler))
    return () => events.forEach(([name, handler]) => audio.removeEventListener(name, handler))
  }, [])

  const playTracks = useCallback(
    (tracks: Track[], index: number, playContext: PlayContext) => {
      if (!tracks.length) return
      const indexes = tracks.map((_, i) => i)
      // Shuffling keeps the chosen track first and mixes the rest.
      const newOrder = shuffle ? [index, ...shuffled(indexes.filter((i) => i !== index))] : indexes
      autoplay.current = true
      loadedId.current = null
      setQueue(tracks)
      setOrder(newOrder)
      setAt(shuffle ? 0 : index)
      setContext(playContext)
    },
    [shuffle],
  )

  const togglePlay = useCallback(() => {
    if (!track) return
    if (audio.paused) {
      autoplay.current = true
      if (error) {
        // Try again from where it failed.
        setError(null)
        audio.load()
      }
      audio.play().catch(() => setPlaying(false))
    } else audio.pause()
  }, [track, error])

  const toggleShuffle = useCallback(() => {
    const current = order[at]
    if (current !== undefined) {
      if (shuffle) {
        // Back to the original order, carrying on from the current track.
        setOrder(queue.map((_, i) => i))
        setAt(current)
      } else {
        setOrder([...order.slice(0, at + 1), ...shuffled(order.slice(at + 1))])
      }
    }
    setShuffle(!shuffle)
  }, [order, at, queue, shuffle])

  const playNext = useCallback(
    (added: Track) => {
      if (!track) {
        playTracks([added], 0, { kind: 'track', id: added.id, label: added.title })
        return
      }
      const index = queue.length
      setQueue([...queue, added])
      setOrder([...order.slice(0, at + 1), index, ...order.slice(at + 1)])
    },
    [track, queue, order, at, playTracks],
  )

  const player = useMemo<Player>(
    () => ({
      track,
      upNext: order.slice(at + 1).map((i) => queue[i]),
      context,
      playing,
      loading,
      error,
      shuffle,
      repeat,
      volume,
      muted,
      audio,
      playTracks,
      togglePlay,
      next,
      previous,
      seek: (seconds) => {
        audio.currentTime = seconds
      },
      setVolume: (value) => {
        setVolumeState(value)
        setMuted(false)
        localStorage.setItem(VOLUME_KEY, String(value))
      },
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle,
      cycleRepeat: () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
      playNext,
      skipTo: (index) => go(at + 1 + index),
    }),
    [track, order, at, queue, context, playing, loading, error, shuffle, repeat, volume, muted, playTracks, togglePlay, next, previous, toggleShuffle, playNext, go],
  )

  useMediaSession(player)
  useSpaceToPlay(togglePlay)

  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>
}

/** Lock screen, headset buttons and the media keys. */
function useMediaSession(player: Player) {
  const { track, playing, togglePlay, next, previous, audio } = player

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = track
      ? new MediaMetadata({
          title: track.title,
          artist: track.creator.display_name,
          album: track.album?.title ?? '',
          artwork: track.cover_url ? [{ src: new URL(track.cover_url, location.origin).href }] : [],
        })
      : null
  }, [track])

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = track ? (playing ? 'playing' : 'paused') : 'none'
  }, [track, playing])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', togglePlay],
      ['pause', togglePlay],
      ['nexttrack', next],
      ['previoustrack', previous],
      ['seekto', (details) => details.seekTime !== undefined && (audio.currentTime = details.seekTime)],
    ]
    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Not every browser knows every action.
      }
    })
  }, [togglePlay, next, previous, audio])
}

/** Space plays and pauses, unless you're typing or on a control that uses it. */
function useSpaceToPlay(togglePlay: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, button, a, [contenteditable], [role="slider"], dialog')) return
      event.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])
}

import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Track } from './music'

export type Repeat = 'off' | 'all' | 'one'

/** Where the queue came from, for "Playing from …" and highlighting the right play button. */
export type PlayContext = { kind: 'album' | 'playlist' | 'liked' | 'creator' | 'search' | 'home' | 'track'; id?: string | number; label: string; href?: string }

export type Player = {
  track: Track | null
  /** What's left to play after the current track, in play order. */
  upNext: Track[]
  context: PlayContext | null
  playing: boolean
  loading: boolean
  error: string | null
  shuffle: boolean
  repeat: Repeat
  volume: number
  muted: boolean
  audio: HTMLAudioElement
  /** Plays `tracks` from `index`, replacing the queue. */
  playTracks: (tracks: Track[], index: number, context: PlayContext) => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  /** Plays right after the current track. */
  playNext: (track: Track) => void
  /** Jumps to a track already in the up-next list. */
  skipTo: (index: number) => void
}

export const PlayerContext = createContext<Player | null>(null)

export function usePlayer(): Player {
  const player = useContext(PlayerContext)
  if (!player) throw new Error('usePlayer needs a PlayerProvider')
  return player
}

/** Is this context the one playing, and is it actually playing (for the big green buttons). */
export function useContextState(kind: PlayContext['kind'], id?: string | number) {
  const player = usePlayer()
  const active = player.context?.kind === kind && String(player.context.id ?? '') === String(id ?? '')
  return { active, playing: active && player.playing }
}

/** Position and length in seconds, read straight from the audio element so only the progress bars re-render. */
export function useProgress(audio: HTMLAudioElement) {
  const subscribe = (listener: () => void) => {
    const events = ['timeupdate', 'durationchange', 'seeked', 'emptied', 'loadedmetadata']
    events.forEach((e) => audio.addEventListener(e, listener))
    return () => events.forEach((e) => audio.removeEventListener(e, listener))
  }
  const position = useSyncExternalStore(subscribe, () => audio.currentTime)
  const duration = useSyncExternalStore(subscribe, () => (Number.isFinite(audio.duration) ? audio.duration : 0))
  return { position, duration }
}

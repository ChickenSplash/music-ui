import { useEffect } from 'react'
import { Link } from 'react-router'
import { shadeFor } from '../lib/format'
import { useTrack, type Track } from '../lib/music'
import { usePlayer } from '../lib/player-context'
import { AiBadge, LikeButton } from './bits'
import { Cover } from './Cover'
import { Icon } from './icons'
import { Controls, Progress, type Panel } from './Player'

/** The right-hand panel on a desktop: the current track with its lyrics, or the queue. */
export function SidePanel({ panel, onClose }: { panel: Exclude<Panel, null>; onClose: () => void }) {
  const player = usePlayer()

  return (
    <aside aria-label={panel === 'now' ? 'Now playing' : 'Queue'} className="scroll-panel hidden w-80 shrink-0 overflow-y-auto rounded-lg bg-panel lg:block">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-panel px-4 py-3">
        <h2 className="truncate font-bold text-white">{panel === 'now' ? (player.context?.label ?? 'Now playing') : 'Queue'}</h2>
        <button type="button" onClick={onClose} aria-label="Close panel" title="Close" className="rounded-full p-1.5 text-zinc-400 hover:bg-hover hover:text-white">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <div className="px-4 pb-6">{panel === 'now' ? <NowPlayingDetails /> : <Queue />}</div>
    </aside>
  )
}

function NowPlayingDetails() {
  const { track } = usePlayer()
  if (!track) return <p className="text-sm text-zinc-400">Nothing playing yet. Pick something to listen to.</p>

  return (
    <div className="space-y-4">
      <Cover src={track.cover_url} seed={`t${track.id}`} className="aspect-square w-full" rounded="rounded-lg" />
      <TrackHeading track={track} />
      <Lyrics track={track} />
    </div>
  )
}

function TrackHeading({ track, large = false }: { track: Track; large?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`truncate font-bold text-white ${large ? 'text-2xl' : 'text-xl'}`}>{track.title}</p>
        <p className="flex items-center gap-1.5 text-zinc-400">
          {track.is_ai && <AiBadge />}
          <Link to={`/creator/${track.creator.id}`} className="truncate hover:text-white hover:underline">
            {track.creator.display_name}
          </Link>
        </p>
      </div>
      <LikeButton track={track} size="size-6" className="mt-1" />
    </div>
  )
}

function Lyrics({ track }: { track: Track }) {
  const details = useTrack(track.has_lyrics ? track.id : undefined)

  if (!track.has_lyrics) return null

  return (
    <section style={{ backgroundColor: shadeFor(`t${track.id}`) }} className="rounded-lg p-4">
      <h3 className="mb-3 font-bold text-white">Lyrics</h3>
      <p className="text-lg leading-relaxed font-bold whitespace-pre-line text-white/90" data-testid="lyrics">
        {details.data?.lyrics ?? '…'}
      </p>
    </section>
  )
}

function Queue() {
  const player = usePlayer()

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-bold text-white">Now playing</h3>
        {player.track ? <QueueRow track={player.track} current /> : <p className="text-sm text-zinc-400">Nothing playing.</p>}
      </section>
      {player.upNext.length > 0 && (
        <section>
          <h3 className="mb-2 font-bold text-white">Next {player.context ? `from: ${player.context.label}` : 'up'}</h3>
          <ol className="space-y-1">
            {player.upNext.map((track, index) => (
              <li key={`${track.id}-${index}`}>
                <QueueRow track={track} onPlay={() => player.skipTo(index)} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function QueueRow({ track, current = false, onPlay }: { track: Track; current?: boolean; onPlay?: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!onPlay}
      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/10 disabled:hover:bg-transparent"
    >
      <Cover src={track.cover_url} seed={`t${track.id}`} className="size-10" />
      <span className="min-w-0">
        <span className={`block truncate ${current ? 'text-accent' : 'text-white'}`}>{track.title}</span>
        <span className="block truncate text-sm text-zinc-400">{track.creator.display_name}</span>
      </span>
    </button>
  )
}

/** On a phone: the whole screen, with the lyrics underneath. Esc or the chevron closes it. */
export function FullPlayer({ onClose }: { onClose: () => void }) {
  const player = usePlayer()
  const { track } = player

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!track) onClose()
  }, [track, onClose])

  if (!track) return null

  return (
    <div
      role="dialog"
      aria-label="Player"
      style={{ backgroundColor: shadeFor(`t${track.id}`) }}
      className="fixed inset-0 z-40 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="min-h-full bg-linear-to-b from-black/10 to-black/70 px-6 pb-10">
        <div className="flex items-center justify-between py-4">
          <button type="button" onClick={onClose} aria-label="Close player" className="p-1 text-white">
            <Icon name="chevronDown" className="size-7" />
          </button>
          <p className="truncate px-4 text-center text-xs font-bold text-white">{player.context?.label}</p>
          <span className="size-9" />
        </div>
        <Cover src={track.cover_url} seed={`t${track.id}`} className="mx-auto mt-4 aspect-square w-full max-w-sm shadow-2xl" rounded="rounded-lg" />
        <div className="mx-auto mt-8 max-w-sm space-y-4">
          <TrackHeading track={track} large />
          <Progress />
          <Controls large />
          {player.error && (
            <p role="alert" className="text-center text-sm text-red-300">
              {player.error}
            </p>
          )}
          <div className="pt-6">
            <Lyrics track={track} />
          </div>
        </div>
      </div>
    </div>
  )
}

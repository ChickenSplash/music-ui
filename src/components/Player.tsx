import type { ChangeEvent, CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { clock } from '../lib/format'
import { usePlayer, useProgress } from '../lib/player-context'
import { AiBadge, LikeButton } from './bits'
import { Cover } from './Cover'
import { Icon, SolidIcon } from './icons'

export type Panel = 'now' | 'queue' | null

/** The seek bar with the elapsed and total times either side. */
export function Progress({ compact = false }: { compact?: boolean }) {
  const player = usePlayer()
  const { position, duration } = useProgress(player.audio)
  const total = duration || (player.track ? player.track.duration_ms / 1000 : 0)
  const value = total ? Math.min(100, (position / total) * 100) : 0

  const slider = (
    <input
      type="range"
      aria-label="Seek"
      min={0}
      max={total || 1}
      step={1}
      value={Math.min(position, total || 0)}
      disabled={!player.track}
      onChange={(event: ChangeEvent<HTMLInputElement>) => player.seek(Number(event.target.value))}
      style={{ '--value': `${value}%` } as CSSProperties}
      className="slider w-full"
      aria-valuetext={`${clock(position)} of ${clock(total)}`}
    />
  )

  if (compact) return slider

  return (
    <div className="flex w-full items-center gap-2 text-xs text-zinc-400 tabular-nums">
      <span className="w-10 text-right">{clock(position)}</span>
      {slider}
      <span className="w-10">{clock(total)}</span>
    </div>
  )
}

/** Shuffle, previous, play, next, repeat. */
export function Controls({ large = false }: { large?: boolean }) {
  const player = usePlayer()
  const icon = large ? 'size-7' : 'size-5'

  return (
    <div className={`flex items-center justify-center ${large ? 'gap-6' : 'gap-4'}`}>
      <ToggleButton label="Shuffle" on={player.shuffle} onClick={player.toggleShuffle}>
        <Icon name="shuffle" className={large ? 'size-6' : 'size-4'} />
      </ToggleButton>
      <button type="button" onClick={player.previous} disabled={!player.track} aria-label="Previous" title="Previous" className="text-zinc-300 transition hover:text-white disabled:opacity-40">
        <SolidIcon name="previous" className={icon} />
      </button>
      <button
        type="button"
        onClick={player.togglePlay}
        disabled={!player.track}
        aria-label={player.playing ? 'Pause' : 'Play'}
        title={player.playing ? 'Pause' : 'Play'}
        className={`flex items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-40 ${large ? 'size-16' : 'size-8'}`}
      >
        {player.loading && player.playing ? (
          <span className={`animate-spin rounded-full border-2 border-black/20 border-t-black ${large ? 'size-7' : 'size-4'}`} />
        ) : (
          <SolidIcon name={player.playing ? 'pause' : 'play'} className={large ? 'size-7' : 'size-4'} />
        )}
      </button>
      <button type="button" onClick={player.next} disabled={!player.track} aria-label="Next" title="Next" className="text-zinc-300 transition hover:text-white disabled:opacity-40">
        <SolidIcon name="next" className={icon} />
      </button>
      <ToggleButton
        label={player.repeat === 'off' ? 'Repeat' : player.repeat === 'all' ? 'Repeat one' : 'Repeat off'}
        on={player.repeat !== 'off'}
        pressed={player.repeat === 'off' ? 'false' : 'true'}
        onClick={player.cycleRepeat}
      >
        <span className="relative">
          <Icon name="repeat" className={large ? 'size-6' : 'size-4'} />
          {player.repeat === 'one' && (
            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-panel px-0.5 text-[9px] leading-3 font-bold text-accent">1</span>
          )}
        </span>
      </ToggleButton>
    </div>
  )
}

/** Green with a dot underneath when on, as on Spotify. */
function ToggleButton({
  label,
  on,
  pressed,
  onClick,
  children,
}: {
  label: string
  on: boolean
  pressed?: 'true' | 'false'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed ?? on}
      title={label}
      className={`relative flex flex-col items-center p-1 transition ${on ? 'text-accent hover:text-accent-strong' : 'text-zinc-400 hover:text-white'}`}
    >
      {children}
      {on && <span aria-hidden className="absolute -bottom-1 size-1 rounded-full bg-accent" />}
    </button>
  )
}

function Volume() {
  const player = usePlayer()
  const level = player.muted ? 0 : player.volume

  return (
    <div className="flex w-36 items-center gap-2">
      <button type="button" onClick={player.toggleMute} aria-label={player.muted ? 'Unmute' : 'Mute'} title={player.muted ? 'Unmute' : 'Mute'} className="text-zinc-400 hover:text-white">
        <Icon name={level === 0 ? 'mute' : 'volume'} className="size-5" />
      </button>
      <input
        type="range"
        aria-label="Volume"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(event: ChangeEvent<HTMLInputElement>) => player.setVolume(Number(event.target.value))}
        style={{ '--value': `${level * 100}%` } as CSSProperties}
        className="slider w-full"
      />
    </div>
  )
}

/** The bar along the bottom on a desktop. */
export function PlayerBar({ panel, setPanel }: { panel: Panel; setPanel: (panel: Panel) => void }) {
  const player = usePlayer()
  const { track } = player

  return (
    <footer aria-label="Player" className="hidden h-20 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 px-2 md:grid">
      <div className="flex min-w-0 items-center gap-3">
        {track && (
          <>
            <Cover src={track.cover_url} seed={`t${track.id}`} className="size-14" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white" data-testid="now-playing">
                {track.album ? (
                  <Link to={`/album/${track.album.id}`} className="hover:underline">
                    {track.title}
                  </Link>
                ) : (
                  track.title
                )}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                {track.is_ai && <AiBadge />}
                <Link to={`/creator/${track.creator.id}`} className="truncate hover:text-white hover:underline">
                  {track.creator.display_name}
                </Link>
              </p>
            </div>
            <LikeButton track={track} className="ml-2" />
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1">
        <Controls />
        <Progress />
        {player.error && (
          <p role="alert" className="text-xs text-red-400">
            {player.error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <PanelButton icon="mic" label="Now playing and lyrics" active={panel === 'now'} onClick={() => setPanel(panel === 'now' ? null : 'now')} />
        <PanelButton icon="queue" label="Queue" active={panel === 'queue'} onClick={() => setPanel(panel === 'queue' ? null : 'queue')} />
        <Volume />
      </div>
    </footer>
  )
}

function PanelButton({ icon, label, active, onClick }: { icon: 'mic' | 'queue'; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`relative p-1 transition ${active ? 'text-accent' : 'text-zinc-400 hover:text-white'}`}
    >
      <Icon name={icon} className="size-5" />
      {active && <span aria-hidden className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />}
    </button>
  )
}

/** On a phone: a strip above the tabs. Tapping it opens the full-screen player. */
export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const player = usePlayer()
  const { track } = player
  if (!track) return null

  return (
    <div className="mx-2 overflow-hidden rounded-md bg-raised md:hidden">
      <div className="flex items-center gap-3 p-2">
        <button type="button" onClick={onOpen} aria-label="Open player" className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Cover src={track.cover_url} seed={`t${track.id}`} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{track.title}</span>
            <span className="block truncate text-xs text-zinc-400">{track.creator.display_name}</span>
          </span>
        </button>
        <LikeButton track={track} size="size-6" className="p-1" />
        <button type="button" onClick={player.togglePlay} aria-label={player.playing ? 'Pause' : 'Play'} className="p-1 text-white">
          <SolidIcon name={player.playing ? 'pause' : 'play'} className="size-6" />
        </button>
      </div>
      <Progress compact />
    </div>
  )
}

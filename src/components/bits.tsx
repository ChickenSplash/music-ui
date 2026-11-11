import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useLiked, useToggleLike, type Track } from '../lib/music'
import { useToast } from '../lib/toast'
import { Icon, SolidIcon } from './icons'

/** The round green button: plays a list, or pauses it if it's what's playing. */
export function PlayButton({
  playing,
  onClick,
  label,
  size = 'lg',
  className = '',
}: {
  playing: boolean
  onClick: () => void
  label: string
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      title={playing ? 'Pause' : 'Play'}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-lg transition hover:scale-105 hover:bg-accent-strong active:scale-95 ${
        size === 'lg' ? 'size-14' : 'size-12'
      } ${className}`}
    >
      <SolidIcon name={playing ? 'pause' : 'play'} className={size === 'lg' ? 'size-6' : 'size-5'} />
    </button>
  )
}

export function LikeButton({ track, className = '', size = 'size-4' }: { track: Track; className?: string; size?: string }) {
  const liked = useLiked(track)
  const toggle = useToggleLike()
  const toast = useToast()

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        toggle.mutate({ id: track.id, liked: !liked })
        toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs')
      }}
      aria-label={liked ? `Remove ${track.title} from Liked Songs` : `Save ${track.title} to Liked Songs`}
      aria-pressed={liked}
      title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      className={`transition hover:scale-105 ${liked ? 'text-accent' : 'text-zinc-400 hover:text-white'} ${className}`}
    >
      {liked ? <SolidIcon name="heart" className={size} /> : <Icon name="heart" className={size} />}
    </button>
  )
}

/** Marks AI-generated music. */
export function AiBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="AI-generated"
      className={`inline-flex shrink-0 items-center rounded-sm bg-zinc-400/80 px-1 text-[9px] leading-[15px] font-bold tracking-wide text-black ${className}`}
    >
      AI
    </span>
  )
}

/** A cover-and-caption tile for a shelf. The play button rises in on hover. */
export function Card({
  to,
  image,
  title,
  subtitle,
  onPlay,
  playing = false,
  round = false,
}: {
  to: string
  image: ReactNode
  title: string
  subtitle: ReactNode
  onPlay?: () => void
  playing?: boolean
  round?: boolean
}) {
  return (
    <Link to={to} className="group relative flex w-full min-w-0 flex-col gap-2 rounded-md p-3 transition hover:bg-raised">
      <div className={`relative aspect-square w-full overflow-hidden shadow-lg shadow-black/50 ${round ? 'rounded-full' : 'rounded-md'}`}>
        {image}
        {onPlay && (
          <PlayButton
            playing={playing}
            onClick={onPlay}
            label={title}
            size="md"
            className={`absolute right-2 bottom-2 transition-all duration-200 ${
              playing ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
            }`}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{title}</p>
        <div className="line-clamp-2 text-sm text-zinc-400">{subtitle}</div>
      </div>
    </Link>
  )
}

/** A titled row of cards that wraps into as many columns as fit. */
export function Shelf({ title, to, children }: { title: string; to?: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <div className="flex items-baseline justify-between px-3">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {to && (
          <Link to={to} className="text-sm font-semibold text-zinc-400 hover:text-white hover:underline">
            Show all
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{children}</div>
    </section>
  )
}

/** The big gradient header on album, playlist and creator pages. */
export function PageHeader({
  shade,
  image,
  kind,
  title,
  meta,
  onTitleClick,
}: {
  shade: string
  image: ReactNode
  kind: string
  title: string
  meta: ReactNode
  onTitleClick?: () => void
}) {
  const size = title.length > 40 ? 'text-3xl md:text-5xl' : title.length > 18 ? 'text-4xl md:text-6xl' : 'text-5xl md:text-8xl'

  return (
    <header style={{ backgroundColor: shade }} className="relative">
      <div className="flex flex-col items-center gap-6 bg-linear-to-b from-transparent to-black/50 px-6 pt-16 pb-6 md:flex-row md:items-end md:pt-20">
        <div className="shrink-0 *:shadow-2xl *:shadow-black/60">{image}</div>
        <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
          <p className="text-sm font-semibold text-white">{kind}</p>
          {onTitleClick ? (
            <button type="button" onClick={onTitleClick} className={`block w-full text-left font-black tracking-tight break-words text-white max-md:text-center ${size}`}>
              <h1>{title}</h1>
            </button>
          ) : (
            <h1 className={`font-black tracking-tight break-words text-white ${size}`}>{title}</h1>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-zinc-200 md:justify-start">{meta}</div>
        </div>
      </div>
    </header>
  )
}

/** The darker band under a header that the action buttons sit on. */
export function ActionBar({ shade, children }: { shade: string; children: ReactNode }) {
  return (
    <div style={{ backgroundColor: shade }}>
      <div className="flex items-center gap-6 bg-linear-to-b from-black/60 to-panel px-6 py-6">{children}</div>
    </div>
  )
}

export const Dot = () => <span aria-hidden>•</span>

export function Empty({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <Icon name={icon} className="size-14 text-zinc-500" />
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {children && <div className="max-w-md text-zinc-400">{children}</div>}
    </div>
  )
}

export function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex justify-center py-24">
      <span className="size-8 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
    </div>
  )
}

export function NotFound({ what }: { what: string }) {
  return (
    <Empty icon="search" title={`Couldn't find that ${what}`}>
      <p>It may have been removed, or the link is wrong.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:scale-105">
        Home
      </Link>
    </Empty>
  )
}

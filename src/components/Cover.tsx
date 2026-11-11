import { shadeFor } from '../lib/format'
import { Icon } from './icons'

/** Cover art, or a coloured square with a note on it when there's none. */
export function Cover({
  src,
  seed,
  className = 'size-12',
  rounded = 'rounded',
}: {
  src: string | null | undefined
  /** Picks the blank cover's colour, so the same thing always looks the same. */
  seed: string
  className?: string
  rounded?: string
}) {
  if (src) {
    return <img src={src} alt="" loading="lazy" draggable={false} className={`shrink-0 bg-raised object-cover ${rounded} ${className}`} />
  }

  return (
    <span
      aria-hidden
      style={{ backgroundColor: shadeFor(seed) }}
      className={`flex shrink-0 items-center justify-center text-white/60 ${rounded} ${className}`}
    >
      <Icon name="note" className="size-2/5" />
    </span>
  )
}

/** A playlist's cover: its first four distinct covers in a square, or a blank one. */
export function Mosaic({ covers, seed, className = 'size-12', rounded = 'rounded' }: { covers: string[]; seed: string; className?: string; rounded?: string }) {
  if (covers.length < 4) return <Cover src={covers[0]} seed={seed} className={className} rounded={rounded} />

  return (
    <span aria-hidden className={`grid shrink-0 grid-cols-2 overflow-hidden ${rounded} ${className}`}>
      {covers.slice(0, 4).map((src) => (
        <img key={src} src={src} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
      ))}
    </span>
  )
}

/** Liked Songs' cover: a heart on a purple-blue gradient, as on Spotify. */
export function LikedCover({ className = 'size-12', rounded = 'rounded' }: { className?: string; rounded?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center bg-linear-135 from-indigo-700 via-violet-500 to-sky-300 text-white ${rounded} ${className}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-2/5">
        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    </span>
  )
}

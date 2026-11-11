// Spelled out in full so Tailwind finds the classes.
const COLOURS = [
  'bg-indigo-500',
  'bg-emerald-600',
  'bg-rose-500',
  'bg-amber-600',
  'bg-sky-600',
  'bg-fuchsia-600',
  'bg-teal-600',
  'bg-orange-600',
]

const SIZES = {
  sm: 'size-7 text-xs',
  md: 'size-10 text-base',
  lg: 'size-20 text-3xl',
  xl: 'size-36 text-6xl md:size-48 md:text-7xl',
  fill: 'size-full text-5xl',
}

function colourFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COLOURS[hash % COLOURS.length]
}

/** The first letter of their name on a colour picked from their ID, so it stays the same across renames. */
export function Avatar({
  user,
  size = 'md',
  className = '',
}: {
  user: { id: string; display_name: string } | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${SIZES[size]} ${
        user ? colourFor(user.id) : 'bg-zinc-600'
      } ${className}`}
    >
      {user ? [...user.display_name.trim()][0]?.toUpperCase() : '?'}
    </span>
  )
}

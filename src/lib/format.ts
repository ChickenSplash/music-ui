/** 3:07, or 1:02:03 past an hour. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`
}

export const duration = (ms: number) => clock(ms / 1000)

/** "1 hr 5 min" or "12 min 30 sec", for headers. */
export function totalLength(ms: number): string {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h} hr ${m} min`
  return m ? `${m} min ${s % 60} sec` : `${s} sec`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const DAY = 86_400_000

/** "Today", "3 days ago", or a date for anything older than a month (Spotify's "Date added"). */
export function added(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / DAY)
  if (days < 1) return 'Today'
  if (days < 2) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return plural(Math.floor(days / 7), 'week') + ' ago'
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const year = (iso: string | null | undefined) => (iso ? new Date(iso).getFullYear() : null)

export function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

// Spelled out in full so Tailwind finds them. Headers fade from one of these to the panel colour.
const SHADES = ['#4c1d95', '#1e3a8a', '#065f46', '#9a3412', '#831843', '#134e4a', '#3730a3', '#7c2d12', '#1f2937', '#5b21b6']

/** A colour that stays the same for the same thing, for header gradients and blank covers. */
export function shadeFor(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return SHADES[hash % SHADES.length]
}

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-raised p-6 shadow-xl ring-1 ring-black/20 ${className}`}>{children}</div>
}

const LOOKS = {
  primary: 'bg-accent text-black hover:bg-accent-strong hover:scale-[1.03] disabled:bg-accent/50 disabled:hover:scale-100',
  secondary: 'text-white ring-1 ring-zinc-500 hover:ring-white hover:scale-[1.03] disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/50 disabled:text-white/60',
  ghost: 'text-zinc-300 hover:text-white hover:scale-[1.03] disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof LOOKS }) {
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${LOOKS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-xs font-semibold tracking-wide text-zinc-300 uppercase">{children}</span>
}

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        className={`w-full rounded-md bg-field px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 transition placeholder:text-zinc-500 max-md:text-base focus:ring-2 ${
          error ? 'ring-red-500 focus:ring-red-500' : 'ring-transparent focus:ring-white'
        }`}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <span className="mt-1.5 block text-sm text-red-400">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-zinc-400">{hint}</span>
      )}
    </label>
  )
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null

  return (
    <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
      {children}
    </p>
  )
}

export function GuestBadge() {
  return (
    <span className="shrink-0 rounded bg-amber-500/15 px-1 py-px text-[10px] leading-4 font-semibold tracking-wide text-amber-300 uppercase">
      guest
    </span>
  )
}

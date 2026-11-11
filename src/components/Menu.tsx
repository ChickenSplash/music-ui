import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './icons'

export type MenuAnchor = { x: number; y: number }

/** Where to open a menu: under a button, or at the pointer for a right-click. */
export const anchorOf = (event: { currentTarget: Element; clientX?: number; clientY?: number; type: string }): MenuAnchor => {
  if (event.type === 'contextmenu' && event.clientX !== undefined) return { x: event.clientX, y: event.clientY! }
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: rect.right, y: rect.bottom + 4 }
}

/**
 * A small floating menu. Closes on Esc, a click elsewhere, scrolling or resizing. It opens
 * towards the left of its anchor and stays inside the window.
 */
export function Menu({ anchor, onClose, label, children }: { anchor: MenuAnchor; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    const left = Math.max(8, Math.min(anchor.x - width, window.innerWidth - width - 8))
    const top = anchor.y + height > window.innerHeight - 8 ? Math.max(8, anchor.y - height - 8) : anchor.y
    setPosition({ left, top })
  }, [anchor, children])

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && onClose()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
        const index = items.indexOf(document.activeElement as HTMLElement)
        items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }
    }
    const onScroll = (event: Event) => !ref.current?.contains(event.target as Node) && onClose()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={position ? { left: position.left, top: position.top } : { left: -9999, top: -9999 }}
      className="fixed z-50 max-h-[60vh] min-w-56 overflow-y-auto rounded-md bg-hover p-1 text-sm shadow-2xl ring-1 ring-black/40"
    >
      {children}
    </div>,
    document.body,
  )
}

export function MenuItem({
  icon,
  onClick,
  danger,
  disabled,
  trailing,
  children,
}: {
  icon?: IconName | ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left outline-none transition hover:bg-white/10 focus:bg-white/10 disabled:opacity-40 ${
        danger ? 'text-red-400' : 'text-zinc-100'
      }`}
    >
      {typeof icon === 'string' ? <Icon name={icon as IconName} className="size-4 shrink-0 text-zinc-400" /> : icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  )
}

export const MenuDivider = () => <hr className="my-1 border-white/10" />

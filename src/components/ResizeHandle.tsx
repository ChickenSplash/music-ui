import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

/** A width kept between visits. */
export function useStoredWidth(key: string, fallback: number) {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(key))
    return Number.isFinite(stored) && stored > 0 ? stored : fallback
  })

  const save = (value: number) => {
    setWidth(value)
    localStorage.setItem(key, String(value))
  }

  return [width, save] as const
}

/**
 * The strip between two panels. Drag it to resize, double-click (or Enter) to toggle, arrow
 * keys to nudge. `side` is where the panel being resized sits: dragging towards it shrinks it.
 */
export function ResizeHandle({
  label,
  side,
  width,
  min,
  max,
  onResize,
  onDragging,
  onToggle,
}: {
  label: string
  side: 'left' | 'right'
  width: number
  min: number
  max: number
  /** Gets the raw dragged width; the panel decides what to snap to. */
  onResize: (width: number, done: boolean) => void
  onDragging: (dragging: boolean) => void
  onToggle: () => void
}) {
  const start = useRef<{ x: number; width: number } | null>(null)

  const widthAt = (event: PointerEvent) => {
    const dx = event.clientX - start.current!.x
    return start.current!.width + (side === 'left' ? dx : -dx)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize, double-click to collapse or expand"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, width }
        onDragging(true)
      }}
      onPointerMove={(event) => start.current && onResize(widthAt(event), false)}
      onPointerUp={(event) => {
        if (!start.current) return
        onResize(widthAt(event), true)
        start.current = null
        onDragging(false)
      }}
      onPointerCancel={() => {
        start.current = null
        onDragging(false)
      }}
      onDoubleClick={onToggle}
      onKeyDown={(event: KeyboardEvent) => {
        const step = event.shiftKey ? 64 : 16
        const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft'
        const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight'
        if (event.key === grow) onResize(width + step, true)
        else if (event.key === shrink) onResize(width - step, true)
        else if (event.key === 'Enter') onToggle()
        else return
        event.preventDefault()
      }}
      // Wider than it looks, so it's easy to grab; the line shows on hover and while dragging.
      className="group relative z-20 hidden w-2 shrink-0 cursor-col-resize touch-none outline-none md:block"
    >
      <span className="absolute inset-y-2 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-transparent transition group-hover:bg-white/30 group-focus-visible:bg-white/60 group-active:bg-white/60" />
    </div>
  )
}

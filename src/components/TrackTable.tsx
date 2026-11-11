import { useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { added, duration } from '../lib/format'
import type { Track } from '../lib/music'
import { usePlayer, type PlayContext } from '../lib/player-context'
import { AiBadge, LikeButton } from './bits'
import { Cover } from './Cover'
import { Equaliser, Icon, SolidIcon } from './icons'
import { anchorOf, type MenuAnchor } from './Menu'
import { TrackMenu } from './TrackMenu'

export type Row = { key: string | number; track: Track; addedAt?: string | null; entryId?: number }

// Spelled out in full so Tailwind finds them: album? and added? columns.
const COLUMNS: Record<string, string> = {
  'false-false': 'md:grid-cols-[2.5rem_minmax(0,1fr)_8rem]',
  'true-false': 'md:grid-cols-[2.5rem_minmax(0,4fr)_minmax(0,3fr)_8rem]',
  'false-true': 'md:grid-cols-[2.5rem_minmax(0,4fr)_minmax(0,2fr)_8rem]',
  'true-true': 'md:grid-cols-[2.5rem_minmax(0,4fr)_minmax(0,3fr)_minmax(0,2fr)_8rem]',
}

const coarse = () => window.matchMedia('(pointer: coarse)').matches

/**
 * Spotify's track list. Double-click a row (or tap, on a phone) to play from there; the
 * number turns into a play button on hover. With `onMove`, rows can be dragged into a new order.
 */
export function TrackTable({
  rows,
  context,
  showAlbum = false,
  showAdded = false,
  showCover = true,
  numbering = 'index',
  onRemove,
  onMove,
  label,
}: {
  rows: Row[]
  context: PlayContext
  showAlbum?: boolean
  showAdded?: boolean
  showCover?: boolean
  numbering?: 'index' | 'track_no'
  onRemove?: (row: Row) => void
  onMove?: (row: Row, position: number) => void
  label: string
}) {
  const player = usePlayer()
  const [menu, setMenu] = useState<{ row: Row; anchor: MenuAnchor } | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  const columns = `grid-cols-[minmax(0,1fr)_auto] ${COLUMNS[`${showAlbum}-${showAdded}`]}`
  const tracks = rows.map((r) => r.track)

  const play = (index: number) => {
    const row = rows[index]
    const isCurrent = player.track?.id === row.track.id && player.context?.kind === context.kind && String(player.context.id) === String(context.id)
    if (isCurrent) player.togglePlay()
    else player.playTracks(tracks, index, context)
  }

  const drop = (event: DragEvent) => {
    event.preventDefault()
    if (dragging !== null && dropAt !== null && onMove) {
      const target = dropAt > dragging ? dropAt - 1 : dropAt
      if (target !== dragging) onMove(rows[dragging], target)
    }
    setDragging(null)
    setDropAt(null)
  }

  return (
    <div role="table" aria-label={label} className="px-2 md:px-6">
      <div role="row" className={`sticky top-0 z-10 hidden ${columns} items-center gap-4 border-b border-white/10 bg-panel px-4 py-2 text-sm text-zinc-400 md:grid`}>
        <span role="columnheader" className="text-right">
          #
        </span>
        <span role="columnheader">Title</span>
        {showAlbum && <span role="columnheader">Album</span>}
        {showAdded && <span role="columnheader">Date added</span>}
        <span role="columnheader" aria-label="Duration" className="flex justify-end pr-8">
          <Icon name="clock" className="size-4" />
        </span>
      </div>

      <div role="rowgroup" className="pt-2" onDragOver={(e) => onMove && e.preventDefault()} onDrop={drop}>
        {rows.map((row, index) => {
          const { track } = row
          const current = player.track?.id === track.id
          const playingThis = current && player.playing
          const openMenu = (event: MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            setMenu({ row, anchor: anchorOf(event) })
          }

          return (
            <div
              key={row.key}
              role="row"
              tabIndex={0}
              aria-label={track.title}
              aria-current={current ? 'true' : undefined}
              draggable={!!onMove}
              onDragStart={(event: DragEvent) => {
                setDragging(index)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', track.title)
              }}
              onDragOver={(event: DragEvent) => {
                if (dragging === null) return
                const rect = event.currentTarget.getBoundingClientRect()
                setDropAt(event.clientY < rect.top + rect.height / 2 ? index : index + 1)
              }}
              onDragEnd={() => {
                setDragging(null)
                setDropAt(null)
              }}
              onDoubleClick={() => play(index)}
              onClick={() => coarse() && play(index)}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' && event.target === event.currentTarget) play(index)
              }}
              onContextMenu={openMenu}
              className={`group relative grid ${columns} items-center gap-4 rounded-md px-2 py-2 outline-none select-none hover:bg-white/10 focus-visible:bg-white/10 md:px-4 ${
                dragging === index ? 'opacity-40' : ''
              }`}
            >
              {dropAt !== null && dragging !== null && (dropAt === index || (dropAt === rows.length && index === rows.length - 1)) && (
                <span aria-hidden className={`absolute inset-x-2 h-0.5 bg-accent ${dropAt === index ? '-top-px' : '-bottom-px'}`} />
              )}

              <span role="cell" className="relative hidden h-5 items-center justify-end text-zinc-400 tabular-nums md:flex">
                <span className={`group-hover:invisible group-focus-visible:invisible ${current ? 'text-accent' : ''}`}>
                  {playingThis ? <Equaliser /> : numbering === 'track_no' ? (track.track_no ?? index + 1) : index + 1}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    play(index)
                  }}
                  aria-label={playingThis ? `Pause ${track.title}` : `Play ${track.title}`}
                  className="invisible absolute right-0 text-white group-hover:visible group-focus-visible:visible"
                >
                  <SolidIcon name={playingThis ? 'pause' : 'play'} className="size-4" />
                </button>
              </span>

              <span role="cell" className="flex min-w-0 items-center gap-3">
                {showCover && <Cover src={track.cover_url} seed={`t${track.id}`} className="size-10" />}
                <span className="min-w-0">
                  <span className={`block truncate text-base ${current ? 'text-accent' : 'text-white'}`}>{track.title}</span>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                    {track.is_ai && <AiBadge />}
                    <Link
                      to={`/creator/${track.creator.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate hover:text-white hover:underline"
                    >
                      {track.creator.display_name}
                    </Link>
                  </span>
                </span>
              </span>

              {showAlbum && (
                <span role="cell" className="hidden min-w-0 truncate text-sm text-zinc-400 md:block">
                  {track.album && (
                    <Link to={`/album/${track.album.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-white hover:underline">
                      {track.album.title}
                    </Link>
                  )}
                </span>
              )}
              {showAdded && (
                <span role="cell" className="hidden truncate text-sm text-zinc-400 md:block">
                  {added(row.addedAt)}
                </span>
              )}

              <span role="cell" className="flex items-center justify-end gap-3 text-sm text-zinc-400 tabular-nums">
                <LikeButton
                  track={track}
                  className={`hidden md:block ${track.liked ? '' : 'md:invisible md:group-hover:visible md:group-focus-within:visible'}`}
                />
                <span className="hidden w-10 text-right md:block">{duration(track.duration_ms)}</span>
                <button
                  type="button"
                  onClick={openMenu}
                  aria-label={`More options for ${track.title}`}
                  title={`More options for ${track.title}`}
                  className="p-1 text-zinc-400 hover:text-white md:invisible md:group-hover:visible md:group-focus-within:visible"
                >
                  <Icon name="more" className="size-5" />
                </button>
              </span>
            </div>
          )
        })}
      </div>

      {menu && (
        <TrackMenu
          track={menu.row.track}
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onRemove={onRemove ? () => onRemove(menu.row) : undefined}
        />
      )}
    </div>
  )
}

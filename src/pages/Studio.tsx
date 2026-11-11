import { useState } from 'react'
import { Navigate } from 'react-router'
import { AiBadge, Empty, Loading } from '../components/bits'
import { Cover } from '../components/Cover'
import { Icon, SolidIcon } from '../components/icons'
import { AlbumEditor, TrackEditor } from '../components/StudioEditors'
import { Button, ErrorNote } from '../components/ui'
import { ApiError } from '../lib/api'
import type { User } from '../lib/auth'
import { added, duration, plural, year } from '../lib/format'
import { usePlayer } from '../lib/player-context'
import { useScan, useStudio, useUpdateTrack, useUpdateTracks, type StudioAlbum, type StudioTrack } from '../lib/studio'
import { useToast } from '../lib/toast'

type Tab = 'inbox' | 'published' | 'missing' | 'albums'

/**
 * Where creators look after their music. Files arrive by being put in their folder; they wait
 * in the inbox until they're given a title, an album and art and are published.
 */
export function Studio({ user }: { user: User }) {
  const studio = useStudio()
  const scan = useScan()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('inbox')
  const [editing, setEditing] = useState<StudioTrack | null>(null)
  const [album, setAlbum] = useState<StudioAlbum | 'new' | null>(null)

  if (user.is_guest) return <Navigate to="/" replace />
  if (studio.isPending) return <Loading />
  if (studio.isError) return <ErrorNote>Couldn't load the studio.</ErrorNote>

  const { tracks, albums, folder } = studio.data
  const groups: Record<Exclude<Tab, 'albums'>, StudioTrack[]> = {
    inbox: tracks.filter((t) => !t.published_at && !t.missing_at),
    published: tracks.filter((t) => t.published_at && !t.missing_at),
    missing: tracks.filter((t) => t.missing_at),
  }
  // An edited track may have moved tabs; show the one being edited from fresh data.
  const editingTrack = editing ? (tracks.find((t) => t.id === editing.id) ?? null) : null
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'inbox', label: 'Inbox', count: groups.inbox.length },
    { id: 'published', label: 'Published', count: groups.published.length },
    { id: 'albums', label: 'Albums', count: albums.length },
    ...(groups.missing.length ? [{ id: 'missing' as const, label: 'Missing files', count: groups.missing.length }] : []),
  ]

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (result) => {
        const changes = [
          result.added && `${plural(result.added, 'new track')}`,
          result.moved && `${plural(result.moved, 'moved file')}`,
          result.missing && `${plural(result.missing, 'missing file')}`,
          result.restored && `${plural(result.restored, 'file')} back`,
        ].filter(Boolean)
        toast(changes.length ? `Found ${changes.join(', ')}` : 'No changes found')
        if (result.added) setTab('inbox')
      },
      onError: (error) => toast(error instanceof ApiError && error.status === 409 ? 'A scan is already running' : "Couldn't scan right now"),
    })

  return (
    <div className="bg-linear-to-b from-emerald-900/40 to-panel to-40% px-4 pt-8 pb-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Creator tools</p>
          <h1 className="text-5xl font-black tracking-tight text-white">Studio</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={runScan} disabled={scan.isPending} className="flex items-center gap-2">
            <Icon name="refresh" className={`size-4 ${scan.isPending ? 'animate-spin' : ''}`} />
            {scan.isPending ? 'Scanning…' : 'Scan now'}
          </Button>
          <Button onClick={() => setAlbum('new')} className="flex items-center gap-2">
            <Icon name="plus" className="size-4" />
            New album
          </Button>
        </div>
      </div>

      <p className="mt-4 flex max-w-3xl items-start gap-2 rounded-md bg-black/30 p-3 text-sm text-zinc-300">
        <Icon name="folder" className="mt-0.5 size-4 shrink-0 text-zinc-400" />
        <span>
          Put MP3s in the <span className="font-mono text-white">Music/{folder}</span> folder in Files (subfolders are fine). New files land in
          your inbox within five minutes, or straight away with Scan now. Nothing is public until you publish it.
        </span>
      </p>

      <div role="tablist" className="mt-8 flex flex-wrap gap-2">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === id ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {label} <span className={tab === id ? 'text-black/60' : 'text-zinc-400'}>{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'albums' ? (
          <AlbumGrid albums={albums} onEdit={setAlbum} />
        ) : (
          <TrackList key={tab} tab={tab} tracks={groups[tab]} albums={albums} onEdit={setEditing} />
        )}
      </div>

      {editingTrack && <TrackEditor key={editingTrack.id} track={editingTrack} albums={albums} onClose={() => setEditing(null)} />}
      {album && <AlbumEditor album={album === 'new' ? undefined : album} onClose={() => setAlbum(null)} />}
    </div>
  )
}

const EMPTY: Record<Exclude<Tab, 'albums'>, { title: string; body: string }> = {
  inbox: { title: 'Your inbox is empty', body: 'New files you add to your folder appear here, ready to edit and publish.' },
  published: { title: 'Nothing published yet', body: 'Publish tracks from your inbox and listeners can find them.' },
  missing: { title: 'No missing files', body: '' },
}

function TrackList({
  tab,
  tracks,
  albums,
  onEdit,
}: {
  tab: Exclude<Tab, 'albums'>
  tracks: StudioTrack[]
  albums: StudioAlbum[]
  onEdit: (track: StudioTrack) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const bulk = useUpdateTracks()
  const update = useUpdateTrack()
  const player = usePlayer()
  const toast = useToast()

  if (!tracks.length) {
    return (
      <Empty icon={tab === 'inbox' ? 'inbox' : 'note'} title={EMPTY[tab].title}>
        {EMPTY[tab].body && <p>{EMPTY[tab].body}</p>}
      </Empty>
    )
  }

  const ids = [...selected].filter((id) => tracks.some((t) => t.id === id))
  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const apply = (changes: Parameters<typeof bulk.mutate>[0], message: string) =>
    bulk.mutate(changes, {
      onSuccess: () => {
        toast(message)
        setSelected(new Set())
      },
    })

  return (
    <div>
      {tab === 'missing' && (
        <p className="mb-4 text-sm text-zinc-400">
          These files were moved out of your folder or deleted. Listeners can't see them. Put them back (anywhere in your folder) and they'll return
          with their details, playlists and likes.
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-2 mb-2 flex min-h-12 flex-wrap items-center gap-2 bg-panel/95 px-2 py-2 backdrop-blur">
        <label className="flex items-center gap-2 pr-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={ids.length === tracks.length}
            ref={(el) => {
              if (el) el.indeterminate = ids.length > 0 && ids.length < tracks.length
            }}
            onChange={() => setSelected(ids.length === tracks.length ? new Set() : new Set(tracks.map((t) => t.id)))}
            className="size-4 accent-accent"
          />
          {ids.length ? `${ids.length} selected` : 'Select all'}
        </label>
        {ids.length > 0 && (
          <>
            {tab !== 'published' && (
              <Button onClick={() => apply({ ids, published: true }, `Published ${plural(ids.length, 'track')}`)} disabled={bulk.isPending} className="py-1.5!">
                Publish
              </Button>
            )}
            {tab === 'published' && (
              <Button variant="secondary" onClick={() => apply({ ids, published: false }, `Unpublished ${plural(ids.length, 'track')}`)} disabled={bulk.isPending} className="py-1.5!">
                Unpublish
              </Button>
            )}
            <select
              aria-label="Move to album"
              value=""
              onChange={(e) =>
                e.target.value &&
                apply({ ids, album_id: e.target.value === 'none' ? null : Number(e.target.value) }, e.target.value === 'none' ? 'Removed from album' : 'Moved to album')
              }
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white outline-none hover:bg-white/20 focus:ring-2 focus:ring-white"
            >
              <option value="">Move to album…</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
              <option value="none">No album</option>
            </select>
            <Button variant="ghost" onClick={() => apply({ ids, is_ai: true }, 'Marked as AI')} className="py-1.5!">
              Mark AI
            </Button>
            <Button variant="ghost" onClick={() => apply({ ids, is_ai: false }, 'Marked as not AI')} className="py-1.5!">
              Mark not AI
            </Button>
          </>
        )}
      </div>

      <ul aria-label={tab} className="divide-y divide-white/5">
        {tracks.map((track) => {
          const current = player.track?.id === track.id
          return (
            <li key={track.id} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5">
              <input type="checkbox" aria-label={`Select ${track.title}`} checked={selected.has(track.id)} onChange={() => toggle(track.id)} className="size-4 shrink-0 accent-accent" />
              <button
                type="button"
                onClick={() => (current ? player.togglePlay() : player.playTracks([track], 0, { kind: 'track', id: `studio-${track.id}`, label: 'Studio preview' }))}
                disabled={!!track.missing_at}
                aria-label={current && player.playing ? `Pause ${track.title}` : `Preview ${track.title}`}
                className="relative shrink-0 disabled:opacity-50"
              >
                <Cover src={track.cover_url} seed={`t${track.id}`} className="size-12" />
                {!track.missing_at && (
                  <span className={`absolute inset-0 flex items-center justify-center rounded bg-black/50 text-white ${current ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                    <SolidIcon name={current && player.playing ? 'pause' : 'play'} className="size-5" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-2 truncate ${current ? 'text-accent' : 'text-white'}`}>
                  <span className="truncate">{track.title}</span>
                  {track.is_ai && <AiBadge />}
                </p>
                <p className="truncate font-mono text-xs text-zinc-500" title={track.file}>
                  {track.file}
                </p>
              </div>
              <span className="hidden w-48 truncate text-sm text-zinc-400 lg:block">{track.album?.title ?? 'Single'}</span>
              <span className="hidden w-28 text-sm text-zinc-400 md:block">
                {track.published_at ? `Published ${added(track.published_at).toLowerCase()}` : `Added ${added(track.created_at).toLowerCase()}`}
              </span>
              <span className="hidden w-12 text-right text-sm text-zinc-400 tabular-nums sm:block">{duration(track.duration_ms)}</span>
              <button type="button" onClick={() => onEdit(track)} aria-label={`Edit ${track.title}`} title="Edit" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                <Icon name="pencil" className="size-4" />
              </button>
              {tab === 'inbox' && (
                <Button
                  onClick={() => update.mutate({ id: track.id, published: true }, { onSuccess: () => toast(`Published ${track.title}`) })}
                  disabled={update.isPending}
                  aria-label={`Publish ${track.title}`}
                  className="px-4! py-1.5!"
                >
                  Publish
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AlbumGrid({ albums, onEdit }: { albums: StudioAlbum[]; onEdit: (album: StudioAlbum | 'new') => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {albums.map((album) => (
        <button key={album.id} type="button" onClick={() => onEdit(album)} aria-label={`Edit ${album.title}`} className="rounded-md p-3 text-left transition hover:bg-raised">
          <Cover src={album.cover_url} seed={`a${album.id}`} className="aspect-square w-full shadow-lg" rounded="rounded-md" />
          <p className="mt-2 truncate font-semibold text-white">{album.title}</p>
          <p className="text-sm text-zinc-400">{[year(album.released_at), plural(album.track_count, 'track')].filter(Boolean).join(' · ')}</p>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onEdit('new')}
        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-white/15 text-zinc-400 transition hover:border-white/40 hover:text-white"
      >
        <Icon name="plus" className="size-8" />
        New album
      </button>
    </div>
  )
}

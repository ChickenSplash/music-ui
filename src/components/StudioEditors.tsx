import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../lib/api'
import { useConfirm } from '../lib/confirm'
import { duration } from '../lib/format'
import {
  useAlbumCover,
  useCreateAlbum,
  useDeleteAlbum,
  useTrackCover,
  useUpdateAlbum,
  useUpdateTrack,
  type StudioAlbum,
  type StudioTrack,
} from '../lib/studio'
import { useToast } from '../lib/toast'
import { Cover } from './Cover'
import { Icon } from './icons'
import { Dialog } from './Modal'
import { Button, ErrorNote, Field, Label } from './ui'

const problem = (error: unknown) => (error instanceof ApiError ? error : undefined)

/** Generic message for anything that isn't a field's own validation error. */
function General({ error, fields }: { error: ApiError | undefined; fields: string[] }) {
  return <ErrorNote>{error && !fields.some((f) => error.field(f)) ? error.message : undefined}</ErrorNote>
}

/** Click the art to pick a new image. Uploads straight away. */
function CoverPicker({
  cover,
  onPick,
  onRemove,
  pending,
  error,
  label,
}: {
  cover: ReactNode
  onPick: (file: File) => void
  onRemove?: () => void
  pending: boolean
  error?: string
  label: string
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={label}
        className="group relative block size-40 overflow-hidden rounded-md shadow-xl"
      >
        {cover}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icon name="upload" className="size-8" />
          {pending ? 'Uploading…' : 'Choose image'}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-xs text-zinc-400 hover:text-white hover:underline">
          Remove image
        </button>
      )}
      {error && <p className="max-w-40 text-xs text-red-400">{error}</p>}
      <p className="max-w-40 text-xs text-zinc-500">JPEG, PNG or WebP, up to 5 MB.</p>
    </div>
  )
}

export function TrackEditor({ track, albums, onClose }: { track: StudioTrack; albums: StudioAlbum[]; onClose: () => void }) {
  const update = useUpdateTrack()
  const cover = useTrackCover()
  const toast = useToast()
  const [form, setForm] = useState({
    title: track.title,
    album_id: track.album?.id ?? null,
    track_no: track.track_no?.toString() ?? '',
    genre: track.genre ?? '',
    is_ai: track.is_ai,
    lyrics: track.lyrics ?? '',
    published: track.published_at !== null,
  })
  const error = problem(update.error)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate(
      {
        id: track.id,
        title: form.title,
        album_id: form.album_id,
        track_no: form.track_no ? Number(form.track_no) : null,
        genre: form.genre.trim() || null,
        is_ai: form.is_ai,
        lyrics: form.lyrics.trim() || null,
        published: form.published,
      },
      {
        onSuccess: () => {
          toast('Saved')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      title="Edit track"
      description={
        <span className="font-mono text-xs">
          {track.file} · {duration(track.duration_ms)}
          {track.bitrate ? ` · ${Math.round(track.bitrate / 1000)} kbps` : ''}
        </span>
      }
      onClose={onClose}
      onSubmit={submit}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <General error={error} fields={['title', 'album_id', 'track_no', 'genre', 'lyrics']} />
      <div className="flex flex-col gap-6 sm:flex-row">
        <CoverPicker
          label="Change track cover"
          cover={<Cover src={track.cover_url} seed={`t${track.id}`} className="size-full" rounded="" />}
          pending={cover.isPending}
          error={problem(cover.error)?.field('cover') ?? problem(cover.error)?.message}
          onPick={(file) => cover.mutate({ id: track.id, file })}
          onRemove={track.has_own_cover ? () => cover.mutate({ id: track.id, file: null }) : undefined}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <Field label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required data-autofocus error={error?.field('title')} />
          <label className="block">
            <Label>Album</Label>
            <select
              value={form.album_id ?? ''}
              onChange={(e) => setForm({ ...form, album_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-md bg-field px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-white"
            >
              <option value="">No album (a single)</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Track number" type="number" min={1} max={999} value={form.track_no} onChange={(e) => setForm({ ...form, track_no: e.target.value })} error={error?.field('track_no')} />
            <Field label="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} maxLength={64} error={error?.field('genre')} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.is_ai} onChange={(e) => setForm({ ...form, is_ai: e.target.checked })} className="size-4 accent-accent" />
            AI-generated
          </label>
        </div>
      </div>
      <label className="block">
        <Label>Lyrics</Label>
        <textarea
          value={form.lyrics}
          onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
          rows={6}
          maxLength={20000}
          placeholder="Optional. Shown beside the player."
          className="w-full rounded-md bg-field px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-transparent outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-white max-md:text-base"
        />
      </label>
      <label className="flex items-start gap-3 rounded-md bg-raised p-3 text-sm">
        <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="mt-0.5 size-4 accent-accent" />
        <span>
          <span className="block font-semibold text-white">Published</span>
          <span className="text-zinc-400">Everyone signed in can find and play it. Unpublish to take it down; playlists keep it for when it's back.</span>
        </span>
      </label>
    </Dialog>
  )
}

/** Creates an album when there's no `album`, edits it otherwise. */
export function AlbumEditor({ album, onClose }: { album?: StudioAlbum; onClose: () => void }) {
  const create = useCreateAlbum()
  const update = useUpdateAlbum()
  const cover = useAlbumCover()
  const remove = useDeleteAlbum()
  const confirm = useConfirm()
  const toast = useToast()
  const [form, setForm] = useState({
    title: album?.title ?? '',
    description: album?.description ?? '',
    released_at: album?.released_at ?? '',
  })
  const saving = album ? update : create
  const error = problem(saving.error)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input = { title: form.title, description: form.description.trim() || null, released_at: form.released_at || null }
    if (album) update.mutate({ id: album.id, ...input }, { onSuccess: () => (toast('Saved'), onClose()) })
    else create.mutate(input, { onSuccess: () => (toast(`Created ${form.title}`), onClose()) })
  }

  const destroy = async () => {
    if (!album) return
    const ok = await confirm({
      title: `Delete ${album.title}?`,
      body: 'Its tracks stay, as singles. Only the album and its cover go.',
      action: 'Delete album',
      danger: true,
    })
    if (ok) remove.mutate(album.id, { onSuccess: () => (toast('Album deleted'), onClose()) })
  }

  return (
    <Dialog
      title={album ? 'Edit album' : 'New album'}
      onClose={onClose}
      onSubmit={submit}
      className="max-w-2xl"
      footer={
        <>
          {album && (
            <Button type="button" variant="ghost" onClick={destroy} className="mr-auto text-red-400!">
              Delete album
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving.isPending}>
            {album ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <General error={error} fields={['title', 'description', 'released_at']} />
      <div className="flex flex-col gap-6 sm:flex-row">
        {album ? (
          <CoverPicker
            label="Change album cover"
            cover={<Cover src={album.cover_url} seed={`a${album.id}`} className="size-full" rounded="" />}
            pending={cover.isPending}
            error={problem(cover.error)?.field('cover') ?? problem(cover.error)?.message}
            onPick={(file) => cover.mutate({ id: album.id, file })}
          />
        ) : (
          <p className="w-40 shrink-0 text-xs text-zinc-500">Add a cover once the album is created.</p>
        )}
        <div className="min-w-0 flex-1 space-y-4">
          <Field label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required data-autofocus error={error?.field('title')} />
          <Field label="Release date" type="date" value={form.released_at} onChange={(e) => setForm({ ...form, released_at: e.target.value })} error={error?.field('released_at')} />
          <label className="block">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={2000}
              className="w-full rounded-md bg-field px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-white max-md:text-base"
            />
          </label>
        </div>
      </div>
    </Dialog>
  )
}

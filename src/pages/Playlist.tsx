import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ActionBar, Dot, Empty, Loading, NotFound, PageHeader, PlayButton } from '../components/bits'
import { Mosaic } from '../components/Cover'
import { Icon } from '../components/icons'
import { Menu, MenuItem, anchorOf, type MenuAnchor } from '../components/Menu'
import { Dialog } from '../components/Modal'
import { TrackTable } from '../components/TrackTable'
import { Button, ErrorNote, Field } from '../components/ui'
import { ApiError } from '../lib/api'
import { useConfirm } from '../lib/confirm'
import { plural, shadeFor, totalLength } from '../lib/format'
import { useDeletePlaylist, useMoveEntry, usePlaylist, useRemoveEntry, useUpdatePlaylist, type PlaylistPage } from '../lib/music'
import { useToast } from '../lib/toast'
import { usePlayList } from '../lib/use-play-list'

export function Playlist() {
  const { id = '' } = useParams()
  const playlist = usePlaylist(id)
  const remove = useRemoveEntry(Number(id))
  const move = useMoveEntry(Number(id))
  const destroy = useDeletePlaylist()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const tracks = playlist.data?.entries.map((e) => e.track)
  const list = usePlayList(tracks, { kind: 'playlist', id: Number(id), label: playlist.data?.name ?? 'Playlist', href: `/playlist/${id}` })

  if (playlist.isPending) return <Loading />
  if (playlist.isError) return <NotFound what="playlist" />

  const { data } = playlist
  const shade = shadeFor(`p${data.id}`)

  const deletePlaylist = async () => {
    setMenu(null)
    const ok = await confirm({ title: 'Delete from Your Library?', body: `This will delete ${data.name}.`, action: 'Delete', danger: true })
    if (ok) destroy.mutate(data.id, { onSuccess: () => (toast('Removed from Your Library'), navigate('/')) })
  }

  return (
    <div className="pb-10">
      <PageHeader
        shade={shade}
        kind="Playlist"
        title={data.name}
        onTitleClick={() => setEditing(true)}
        image={<Mosaic covers={data.covers} seed={`p${data.id}`} className="size-48 md:size-56" rounded="rounded-md" />}
        meta={
          <>
            {data.description && <p className="mb-1 w-full text-zinc-300">{data.description}</p>}
            <span className="font-bold text-white">{data.owner.display_name}</span>
            <Dot />
            <span>
              {plural(data.track_count, 'song')}
              {data.track_count > 0 && `, ${totalLength(data.duration_ms)}`}
            </span>
          </>
        }
      />
      <ActionBar shade={shade}>
        {data.entries.length > 0 && <PlayButton playing={list.playing} onClick={list.toggle} label={data.name} />}
        <button type="button" onClick={(e) => setMenu(anchorOf(e))} aria-label={`More options for ${data.name}`} title="More options" className="text-zinc-400 hover:text-white">
          <Icon name="more" className="size-8" />
        </button>
      </ActionBar>

      {data.entries.length ? (
        <TrackTable
          label={data.name}
          rows={data.entries.map((entry) => ({ key: entry.entry_id, track: entry.track, addedAt: entry.added_at, entryId: entry.entry_id }))}
          context={{ kind: 'playlist', id: data.id, label: data.name, href: `/playlist/${data.id}` }}
          showAlbum
          showAdded
          onRemove={(row) => remove.mutate(row.entryId!, { onSuccess: () => toast(`Removed from ${data.name}`) })}
          onMove={(row, position) => move.mutate({ entry: row.entryId!, position })}
        />
      ) : (
        <Empty icon="note" title="Let's find something for your playlist">
          <p>Use the “…” menu on any song and pick “Add to playlist”.</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/search')}>
            Browse songs
          </Button>
        </Empty>
      )}

      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)} label={`Options for ${data.name}`}>
          <MenuItem icon="pencil" onClick={() => (setMenu(null), setEditing(true))}>
            Edit details
          </MenuItem>
          <MenuItem icon="trash" onClick={deletePlaylist}>
            Delete
          </MenuItem>
        </Menu>
      )}
      {editing && <EditDetails playlist={data} onClose={() => setEditing(false)} />}
    </div>
  )
}

function EditDetails({ playlist, onClose }: { playlist: PlaylistPage; onClose: () => void }) {
  const update = useUpdatePlaylist(playlist.id)
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description ?? '')
  const error = update.error instanceof ApiError ? update.error : undefined

  const submit = (event: FormEvent) => {
    event.preventDefault()
    update.mutate({ name, description: description.trim() || null }, { onSuccess: onClose })
  }

  return (
    <Dialog
      title="Edit details"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <Button type="submit" disabled={update.isPending}>
          Save
        </Button>
      }
    >
      <ErrorNote>{error && !error.field('name') && !error.field('description') ? error.message : undefined}</ErrorNote>
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required data-autofocus error={error?.field('name')} />
      <label className="block">
        <span className="mb-2 block text-xs font-semibold tracking-wide text-zinc-300 uppercase">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Add an optional description"
          className="w-full resize-none rounded-md bg-field px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-transparent outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-white max-md:text-base"
        />
      </label>
    </Dialog>
  )
}

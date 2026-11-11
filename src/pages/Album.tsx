import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ActionBar, Dot, Loading, NotFound, PageHeader, PlayButton } from '../components/bits'
import { Cover } from '../components/Cover'
import { Icon } from '../components/icons'
import { Menu, anchorOf, type MenuAnchor } from '../components/Menu'
import { PlaylistChoices } from '../components/TrackMenu'
import { TrackTable } from '../components/TrackTable'
import { plural, shadeFor, totalLength, year } from '../lib/format'
import { useAlbum } from '../lib/music'
import { usePlayList } from '../lib/use-play-list'

export function Album() {
  const { id = '' } = useParams()
  const album = useAlbum(id)
  const list = usePlayList(album.data?.tracks, { kind: 'album', id: Number(id), label: album.data?.title ?? 'Album', href: `/album/${id}` })
  const [menu, setMenu] = useState<MenuAnchor | null>(null)

  if (album.isPending) return <Loading />
  if (album.isError) return <NotFound what="album" />

  const { data } = album
  const shade = shadeFor(`a${data.id}`)

  return (
    <div className="pb-10">
      <PageHeader
        shade={shade}
        kind="Album"
        title={data.title}
        image={<Cover src={data.cover_url} seed={`a${data.id}`} className="size-48 md:size-56" rounded="rounded-md" />}
        meta={
          <>
            <Avatar user={data.creator} size="sm" className="mr-1" />
            <Link to={`/creator/${data.creator.id}`} className="font-bold text-white hover:underline">
              {data.creator.display_name}
            </Link>
            {year(data.released_at) && (
              <>
                <Dot />
                <span>{year(data.released_at)}</span>
              </>
            )}
            <Dot />
            <span>
              {plural(data.track_count, 'song')}, {totalLength(data.duration_ms)}
            </span>
          </>
        }
      />
      <ActionBar shade={shade}>
        <PlayButton playing={list.playing} onClick={list.toggle} label={data.title} />
        <button
          type="button"
          onClick={(e) => setMenu(anchorOf(e))}
          disabled={!data.tracks.length}
          aria-label={`Add ${data.title} to a playlist`}
          title="Add to playlist"
          className="text-zinc-400 hover:text-white disabled:opacity-40"
        >
          <Icon name="plus" className="size-8" />
        </button>
      </ActionBar>

      {data.description && <p className="max-w-3xl px-6 pb-4 text-sm whitespace-pre-line text-zinc-400">{data.description}</p>}

      <TrackTable
        label={data.title}
        rows={data.tracks.map((track) => ({ key: track.id, track }))}
        context={{ kind: 'album', id: data.id, label: data.title, href: `/album/${data.id}` }}
        numbering="track_no"
        showCover={false}
      />

      {data.released_at && (
        <p className="px-6 pt-6 text-sm text-zinc-400">
          {new Date(data.released_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)} label="Add to playlist">
          <PlaylistChoices trackIds={data.tracks.map((t) => t.id)} onDone={() => setMenu(null)} />
        </Menu>
      )}
    </div>
  )
}

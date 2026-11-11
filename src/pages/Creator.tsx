import { useState } from 'react'
import { useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { ActionBar, Empty, Loading, NotFound, PageHeader, PlayButton, Shelf } from '../components/bits'
import { TrackTable } from '../components/TrackTable'
import { plural, shadeFor } from '../lib/format'
import { useCreator } from '../lib/music'
import { usePlayList } from '../lib/use-play-list'
import { AlbumCard } from './Home'

export function Creator() {
  const { id = '' } = useParams()
  const page = useCreator(id)
  const [showAll, setShowAll] = useState(false)
  const list = usePlayList(page.data?.popular, { kind: 'creator', id, label: page.data?.creator.display_name ?? 'Creator', href: `/creator/${id}` })

  if (page.isPending) return <Loading />
  if (page.isError) return <NotFound what="creator" />

  const { creator, popular, tracks, albums, track_count } = page.data
  const shade = shadeFor(creator.id)

  return (
    <div className="pb-10">
      <PageHeader
        shade={shade}
        kind="Creator"
        title={creator.display_name}
        image={<Avatar user={creator} size="xl" className="shadow-2xl" />}
        meta={<span>{plural(track_count, 'published track')}</span>}
      />
      <ActionBar shade={shade}>
        <PlayButton playing={list.playing} onClick={list.toggle} label={creator.display_name} />
      </ActionBar>

      {track_count === 0 ? (
        <Empty icon="note" title="Nothing published yet">
          <p>Publish tracks from the Studio and they'll show here.</p>
        </Empty>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="px-6 pb-2 text-2xl font-bold text-white">Popular</h2>
            <TrackTable
              label="Popular"
              rows={(showAll ? popular : popular.slice(0, 5)).map((track) => ({ key: track.id, track }))}
              context={{ kind: 'creator', id, label: creator.display_name, href: `/creator/${id}` }}
              showAlbum
            />
            {popular.length > 5 && (
              <button type="button" onClick={() => setShowAll(!showAll)} className="px-6 pt-3 text-sm font-bold text-zinc-400 hover:text-white">
                {showAll ? 'Show less' : 'See more'}
              </button>
            )}
          </section>

          {albums.length > 0 && (
            <div className="px-3">
              <Shelf title="Discography">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} showCreator={false} />
                ))}
              </Shelf>
            </div>
          )}

          <section>
            <h2 className="px-6 pb-2 text-2xl font-bold text-white">All tracks</h2>
            <TrackTable
              label="All tracks"
              rows={tracks.map((track) => ({ key: track.id, track }))}
              context={{ kind: 'creator', id: `${id}#all`, label: creator.display_name, href: `/creator/${id}` }}
              showAlbum
            />
          </section>
        </div>
      )}
    </div>
  )
}

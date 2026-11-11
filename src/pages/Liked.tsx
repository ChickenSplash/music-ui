import { useNavigate } from 'react-router'
import { ActionBar, Dot, Empty, Loading, PageHeader, PlayButton } from '../components/bits'
import { LikedCover } from '../components/Cover'
import { TrackTable } from '../components/TrackTable'
import { Button, ErrorNote } from '../components/ui'
import type { User } from '../lib/auth'
import { plural } from '../lib/format'
import { useLikes } from '../lib/music'
import { usePlayList } from '../lib/use-play-list'

const SHADE = '#4c3b9a'

export function Liked({ user }: { user: User }) {
  const likes = useLikes()
  const navigate = useNavigate()
  const list = usePlayList(likes.data, { kind: 'liked', label: 'Liked Songs', href: '/liked' })

  if (likes.isPending) return <Loading />
  if (likes.isError) return <ErrorNote>Couldn't load your liked songs.</ErrorNote>

  return (
    <div className="pb-10">
      <PageHeader
        shade={SHADE}
        kind="Playlist"
        title="Liked Songs"
        image={<LikedCover className="size-48 md:size-56" rounded="rounded-md" />}
        meta={
          <>
            <span className="font-bold text-white">{user.display_name}</span>
            <Dot />
            <span>{plural(likes.data.length, 'song')}</span>
          </>
        }
      />
      <ActionBar shade={SHADE}>{likes.data.length > 0 && <PlayButton playing={list.playing} onClick={list.toggle} label="Liked Songs" />}</ActionBar>

      {likes.data.length ? (
        <TrackTable
          label="Liked Songs"
          rows={likes.data.map((track) => ({ key: track.id, track, addedAt: track.added_at }))}
          context={{ kind: 'liked', label: 'Liked Songs', href: '/liked' }}
          showAlbum
          showAdded
        />
      ) : (
        <Empty icon="heart" title="Songs you like will appear here">
          <p>Save songs by tapping the heart icon.</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/search')}>
            Find songs
          </Button>
        </Empty>
      )}
    </div>
  )
}

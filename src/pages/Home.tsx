import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { Card, Empty, Loading, Shelf } from '../components/bits'
import { Cover, LikedCover } from '../components/Cover'
import { Equaliser, SolidIcon } from '../components/icons'
import { ErrorNote } from '../components/ui'
import type { User } from '../lib/auth'
import { greeting, plural, year } from '../lib/format'
import { api } from '../lib/api'
import { MUSIC, useHome, useLikes, type Album, type AlbumPage, type Track } from '../lib/music'
import { useContextState, usePlayer } from '../lib/player-context'
import { usePlayList } from '../lib/use-play-list'

export function Home({ user }: { user: User }) {
  const home = useHome()
  const likes = useLikes()
  const player = usePlayer()

  if (home.isPending) return <Loading />
  if (home.isError) return <ErrorNote>Couldn't load your home page. Try again in a moment.</ErrorNote>

  const { recently_played, new_tracks, albums, creators } = home.data
  const nothing = !new_tracks.length && !albums.length

  return (
    <div className="bg-linear-to-b from-indigo-900/60 via-panel to-panel pb-10">
      <div className="space-y-8 px-3 pt-6 md:px-5">
        <h1 className="px-3 text-3xl font-bold text-white">{greeting()}, {user.display_name}</h1>

        {nothing ? (
          <Empty icon="note" title="No music yet">
            <p>Nothing has been published so far. Check back soon.</p>
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 px-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickTile to="/liked" title="Liked Songs" image={<LikedCover className="size-full" rounded="" />} />
              {recently_played.slice(0, 7).map((track, index) => (
                <QuickTile
                  key={track.id}
                  to={track.album ? `/album/${track.album.id}` : `/creator/${track.creator.id}`}
                  title={track.title}
                  image={<Cover src={track.cover_url} seed={`t${track.id}`} className="size-full" rounded="" />}
                  current={player.track?.id === track.id && player.context?.kind === 'home'}
                  playing={player.playing}
                  onPlay={() =>
                    player.track?.id === track.id && player.context?.kind === 'home'
                      ? player.togglePlay()
                      : player.playTracks(recently_played, index, { kind: 'home', id: 'recent', label: 'Recently played' })
                  }
                />
              ))}
            </div>

            {new_tracks.length > 0 && (
              <Shelf title="New releases" to="/search">
                {new_tracks.map((track, index) => (
                  <TrackCard key={track.id} track={track} onPlay={() => player.playTracks(new_tracks, index, { kind: 'home', id: 'new', label: 'New releases' })} />
                ))}
              </Shelf>
            )}

            {albums.length > 0 && (
              <Shelf title="Albums">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </Shelf>
            )}

            {creators.length > 0 && (
              <Shelf title="Creators">
                {creators.map((creator) => (
                  <Card
                    key={creator.id}
                    to={`/creator/${creator.id}`}
                    round
                    image={<Avatar user={creator} size="fill" />}
                    title={creator.display_name}
                    subtitle={`Creator · ${plural(creator.track_count ?? 0, 'track')}`}
                  />
                ))}
              </Shelf>
            )}
          </>
        )}

        {likes.data && likes.data.length === 0 && !nothing && (
          <p className="px-3 text-sm text-zinc-400">Tip: tap the heart on any track to save it to your Liked Songs.</p>
        )}
      </div>
    </div>
  )
}

/** The compact tiles at the top of Spotify's home page. */
function QuickTile({
  to,
  title,
  image,
  onPlay,
  current = false,
  playing = false,
}: {
  to: string
  title: string
  image: ReactNode
  onPlay?: () => void
  current?: boolean
  playing?: boolean
}) {
  return (
    <Link to={to} className="group flex h-14 items-center gap-3 overflow-hidden rounded bg-white/10 pr-2 transition hover:bg-white/20 md:h-16">
      <span className="aspect-square h-full shrink-0 shadow-lg">{image}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</span>
      {current && playing && <Equaliser className="mr-1 h-3 w-3 group-hover:hidden" />}
      {onPlay && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            onPlay()
          }}
          aria-label={current && playing ? `Pause ${title}` : `Play ${title}`}
          className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-lg group-hover:flex group-focus-within:flex"
        >
          <SolidIcon name={current && playing ? 'pause' : 'play'} className="size-4" />
        </button>
      )}
    </Link>
  )
}

export function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const player = usePlayer()
  const current = player.track?.id === track.id

  return (
    <Card
      to={track.album ? `/album/${track.album.id}` : `/creator/${track.creator.id}`}
      image={<Cover src={track.cover_url} seed={`t${track.id}`} className="size-full" rounded="" />}
      title={track.title}
      subtitle={track.creator.display_name}
      playing={current && player.playing}
      onPlay={() => (current ? player.togglePlay() : onPlay())}
    />
  )
}

export function AlbumCard({ album, showCreator = true }: { album: Album; showCreator?: boolean }) {
  const { playing } = useContextState('album', album.id)
  const { toggle } = useAlbumPlayer(album)

  return (
    <Card
      to={`/album/${album.id}`}
      image={<Cover src={album.cover_url} seed={`a${album.id}`} className="size-full" rounded="" />}
      title={album.title}
      subtitle={[year(album.released_at), showCreator ? album.creator.display_name : plural(album.track_count ?? 0, 'track')].filter(Boolean).join(' · ')}
      playing={playing}
      onPlay={toggle}
    />
  )
}

/** Album cards can play without opening the album, so they fetch its tracks on demand. */
function useAlbumPlayer(album: Album) {
  const player = usePlayer()
  const queryClient = useQueryClient()
  const { active } = useContextState('album', album.id)
  const list = usePlayList(undefined, { kind: 'album', id: album.id, label: album.title })

  const toggle = async () => {
    if (active) return list.toggle()
    const page = await queryClient.fetchQuery({
      queryKey: [...MUSIC, 'album', String(album.id)],
      queryFn: () => api<AlbumPage>('GET', `/api/music/albums/${album.id}`),
    })
    if (page.tracks.length) player.playTracks(page.tracks, 0, { kind: 'album', id: album.id, label: album.title, href: `/album/${album.id}` })
  }

  return { toggle }
}

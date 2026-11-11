import { Link, useNavigate } from 'react-router'
import { LikedCover, Mosaic } from '../components/Cover'
import { Icon } from '../components/icons'
import type { User } from '../lib/auth'
import { plural } from '../lib/format'
import { useCreatePlaylist, useLikes, usePlaylists } from '../lib/music'

/** Phones have no sidebar, so Your Library is a tab of its own. */
export function LibraryPage({ user }: { user: User }) {
  const playlists = usePlaylists()
  const likes = useLikes()
  const create = useCreatePlaylist()
  const navigate = useNavigate()

  return (
    <div className="space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <button
          type="button"
          onClick={() => create.mutate({}, { onSuccess: (playlist) => navigate(`/playlist/${playlist.id}`) })}
          aria-label="Create playlist"
          className="rounded-full p-2 text-white hover:bg-hover"
        >
          <Icon name="plus" className="size-6" />
        </button>
      </div>

      {!user.is_guest && (
        <Link to="/studio" className="flex items-center gap-3 rounded-md bg-raised p-3 text-white">
          <Icon name="studio" className="size-5" />
          <span className="font-semibold">Studio</span>
          <span className="text-sm text-zinc-400">Publish your music</span>
        </Link>
      )}

      <ul className="space-y-2">
        <li>
          <Link to="/liked" className="flex items-center gap-3">
            <LikedCover className="size-16" />
            <span>
              <span className="block font-semibold text-white">Liked Songs</span>
              <span className="text-sm text-zinc-400">Playlist · {plural(likes.data?.length ?? 0, 'song')}</span>
            </span>
          </Link>
        </li>
        {playlists.data?.map((playlist) => (
          <li key={playlist.id}>
            <Link to={`/playlist/${playlist.id}`} className="flex items-center gap-3">
              <Mosaic covers={playlist.covers} seed={`p${playlist.id}`} className="size-16" />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-white">{playlist.name}</span>
                <span className="text-sm text-zinc-400">Playlist · {plural(playlist.track_count, 'song')}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {user.is_guest && (
        <p className="rounded-md bg-raised p-3 text-sm text-zinc-400">
          You're a guest: your playlists and liked songs are deleted when you log out. Register an account to keep them.
        </p>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAddToPlaylist, useCreatePlaylist, useLiked, usePlaylists, useToggleLike, type Track } from '../lib/music'
import { usePlayer } from '../lib/player-context'
import { useToast } from '../lib/toast'
import { Icon } from './icons'
import { Menu, MenuDivider, MenuItem, type MenuAnchor } from './Menu'

/** The "…" menu on a track. "Add to playlist" swaps the menu for the list of playlists. */
export function TrackMenu({
  track,
  anchor,
  onClose,
  onRemove,
}: {
  track: Track
  anchor: MenuAnchor
  onClose: () => void
  /** Given on a playlist page. */
  onRemove?: () => void
}) {
  const [view, setView] = useState<'main' | 'playlists'>('main')
  const navigate = useNavigate()
  const player = usePlayer()
  const liked = useLiked(track)
  const like = useToggleLike()
  const toast = useToast()

  const done = (action: () => void) => () => {
    action()
    onClose()
  }

  if (view === 'playlists') {
    return (
      <Menu anchor={anchor} onClose={onClose} label="Add to playlist">
        <MenuItem icon="chevronLeft" onClick={() => setView('main')}>
          Back
        </MenuItem>
        <MenuDivider />
        <PlaylistChoices trackIds={[track.id]} onDone={onClose} />
      </Menu>
    )
  }

  return (
    <Menu anchor={anchor} onClose={onClose} label={`Options for ${track.title}`}>
      <MenuItem icon="plus" onClick={() => setView('playlists')} trailing={<Icon name="chevronRight" className="size-4 text-zinc-400" />}>
        Add to playlist
      </MenuItem>
      {onRemove && (
        <MenuItem icon="trash" onClick={done(onRemove)}>
          Remove from this playlist
        </MenuItem>
      )}
      <MenuItem
        icon="heart"
        onClick={done(() => {
          like.mutate({ id: track.id, liked: !liked })
          toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs')
        })}
      >
        {liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      </MenuItem>
      <MenuItem
        icon="queue"
        onClick={done(() => {
          player.playNext(track)
          toast('Playing next')
        })}
      >
        Play next
      </MenuItem>
      <MenuDivider />
      <MenuItem icon="user" onClick={done(() => navigate(`/creator/${track.creator.id}`))}>
        Go to creator
      </MenuItem>
      {track.album && (
        <MenuItem icon="album" onClick={done(() => navigate(`/album/${track.album!.id}`))}>
          Go to album
        </MenuItem>
      )}
    </Menu>
  )
}

/** "New playlist" and then every playlist, newest activity first. */
export function PlaylistChoices({ trackIds, onDone }: { trackIds: number[]; onDone: () => void }) {
  const playlists = usePlaylists()
  const add = useAddToPlaylist()
  const create = useCreatePlaylist()
  const toast = useToast()
  const navigate = useNavigate()

  return (
    <>
      <MenuItem
        icon="plus"
        disabled={create.isPending}
        onClick={() =>
          create.mutate(
            { track_ids: trackIds },
            {
              onSuccess: (playlist) => {
                toast(`Added to ${playlist.name}`)
                navigate(`/playlist/${playlist.id}`)
                onDone()
              },
            },
          )
        }
      >
        New playlist
      </MenuItem>
      {playlists.data?.map((playlist) => (
        <MenuItem
          key={playlist.id}
          disabled={add.isPending}
          onClick={() =>
            add.mutate(
              { playlist: playlist.id, trackIds },
              {
                onSuccess: () => {
                  toast(`Added to ${playlist.name}`)
                  onDone()
                },
              },
            )
          }
        >
          {playlist.name}
        </MenuItem>
      ))}
    </>
  )
}

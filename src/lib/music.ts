import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { api } from './api'

export type Creator = { id: string; display_name: string; is_guest: boolean; track_count?: number }

export type Track = {
  id: number
  title: string
  duration_ms: number
  is_ai: boolean
  genre: string | null
  track_no: number | null
  has_lyrics: boolean
  cover_url: string | null
  creator: Creator
  album: { id: number; title: string } | null
  liked: boolean
  published_at: string | null
  /** When it was liked, on the Liked Songs list. */
  added_at?: string | null
}

export type Album = {
  id: number
  title: string
  description: string | null
  cover_url: string | null
  released_at: string | null
  creator: Creator
  track_count?: number
}

export type AlbumPage = Album & { track_count: number; duration_ms: number; tracks: Track[] }

export type CreatorPage = { creator: Creator; track_count: number; popular: Track[]; tracks: Track[]; albums: Album[] }

export type Home = { recently_played: Track[]; new_tracks: Track[]; albums: Album[]; creators: Creator[] }

export type SearchResults = { tracks: Track[]; albums: Album[]; creators: Creator[] }

export type PlaylistSummary = {
  id: number
  name: string
  description: string | null
  track_count: number
  covers: string[]
  updated_at: string
}

export type PlaylistEntry = { entry_id: number; added_at: string | null; track: Track }

export type PlaylistPage = PlaylistSummary & { owner: Creator; duration_ms: number; entries: PlaylistEntry[] }

// Every music query sits under 'music', so one invalidation refreshes them all.
export const MUSIC = ['music']

export const useHome = () => useQuery({ queryKey: [...MUSIC, 'home'], queryFn: () => api<Home>('GET', '/api/music/home') })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: [...MUSIC, 'search', q],
    queryFn: () => api<SearchResults>('GET', `/api/music/search?q=${encodeURIComponent(q)}`),
    placeholderData: keepPreviousData,
  })

export const useTrack = (id: number | undefined) =>
  useQuery({
    queryKey: [...MUSIC, 'track', id],
    queryFn: () => api<Track & { lyrics: string | null }>('GET', `/api/music/tracks/${id}`),
    enabled: id !== undefined,
  })

export const useAlbum = (id: string) =>
  useQuery({ queryKey: [...MUSIC, 'album', id], queryFn: () => api<AlbumPage>('GET', `/api/music/albums/${id}`), retry: false })

export const useCreator = (id: string) =>
  useQuery({ queryKey: [...MUSIC, 'creator', id], queryFn: () => api<CreatorPage>('GET', `/api/music/creators/${id}`), retry: false })

export const useLikes = () => useQuery({ queryKey: [...MUSIC, 'likes'], queryFn: () => api<Track[]>('GET', '/api/music/likes') })

export const usePlaylists = () =>
  useQuery({ queryKey: [...MUSIC, 'playlists'], queryFn: () => api<PlaylistSummary[]>('GET', '/api/music/playlists') })

export const usePlaylist = (id: string) =>
  useQuery({ queryKey: [...MUSIC, 'playlist', id], queryFn: () => api<PlaylistPage>('GET', `/api/music/playlists/${id}`), retry: false })

/** After any change, refetch what's on screen. The library is small enough not to bother with anything finer. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: MUSIC })
}

// Likes flip at once everywhere a track shows (lists, the player bar), before the server answers.
const likeOverrides = new Map<number, boolean>()
const likeListeners = new Set<() => void>()
const emitLikes = () => likeListeners.forEach((listener) => listener())

/**
 * Whether a track is liked. Liked Songs is the source of truth: the player keeps the track it
 * was given when playback started, so that copy's `liked` goes stale.
 */
export function useLiked(track: Pick<Track, 'id' | 'liked'>): boolean {
  const override = useSyncExternalStore(
    (listener) => {
      likeListeners.add(listener)
      return () => likeListeners.delete(listener)
    },
    () => likeOverrides.get(track.id),
  )
  const likes = useLikes()
  return override ?? (likes.data ? likes.data.some((t) => t.id === track.id) : track.liked)
}

export function useToggleLike() {
  const refresh = useRefresh()

  return useMutation({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) =>
      api<void>(liked ? 'PUT' : 'DELETE', `/api/music/likes/${id}`),
    onMutate: ({ id, liked }) => {
      likeOverrides.set(id, liked)
      emitLikes()
    },
    onError: (_error, { id }) => {
      likeOverrides.delete(id)
      emitLikes()
    },
    onSuccess: async (_data, { id }) => {
      await refresh()
      likeOverrides.delete(id)
      emitLikes()
    },
  })
}

export function useCreatePlaylist() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { name?: string; track_ids?: number[] }) => api<PlaylistSummary>('POST', '/api/music/playlists', input),
    onSuccess: refresh,
  })
}

export function useUpdatePlaylist(id: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { name?: string; description?: string | null }) =>
      api<PlaylistSummary>('PATCH', `/api/music/playlists/${id}`, input),
    onSuccess: refresh,
  })
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>('DELETE', `/api/music/playlists/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: [...MUSIC, 'playlist', String(id)] })
      return queryClient.invalidateQueries({ queryKey: [...MUSIC, 'playlists'] })
    },
  })
}

export function useAddToPlaylist() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ playlist, trackIds }: { playlist: number; trackIds: number[] }) =>
      api<PlaylistSummary & { added: number }>('POST', `/api/music/playlists/${playlist}/tracks`, { track_ids: trackIds }),
    onSuccess: refresh,
  })
}

export function useRemoveEntry(playlist: number) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (entry: number) => api<void>('DELETE', `/api/music/playlists/${playlist}/tracks/${entry}`),
    onSuccess: refresh,
  })
}

export function useMoveEntry(playlist: number) {
  const queryClient = useQueryClient()
  const key = [...MUSIC, 'playlist', String(playlist)]

  return useMutation({
    mutationFn: ({ entry, position }: { entry: number; position: number }) =>
      api<void>('PUT', `/api/music/playlists/${playlist}/tracks/${entry}`, { position }),
    // Reorder on screen straight away, so the row doesn't jump back while the request runs.
    onMutate: ({ entry, position }) => {
      queryClient.setQueryData<PlaylistPage>(key, (page) => {
        if (!page) return page
        const entries = page.entries.filter((e) => e.entry_id !== entry)
        const moved = page.entries.find((e) => e.entry_id === entry)
        if (moved) entries.splice(position, 0, moved)
        return { ...page, entries }
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export const recordPlay = (id: number) => api<void>('POST', `/api/music/tracks/${id}/play`).catch(() => undefined)

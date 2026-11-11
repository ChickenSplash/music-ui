import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { MUSIC, type Album, type Track } from './music'

export type StudioTrack = Track & {
  lyrics: string | null
  bitrate: number | null
  has_own_cover: boolean
  /** Where the file is, below your own folder. */
  file: string
  missing_at: string | null
  created_at: string
}

export type StudioAlbum = Album & { track_count: number }

export type Studio = { folder: string; tracks: StudioTrack[]; albums: StudioAlbum[] }

export type ScanResult = Record<'added' | 'updated' | 'moved' | 'missing' | 'restored' | 'skipped', number>

export type TrackChanges = Partial<{
  title: string
  album_id: number | null
  track_no: number | null
  genre: string | null
  is_ai: boolean
  lyrics: string | null
  published: boolean
}>

export type AlbumChanges = Partial<{ title: string; description: string | null; released_at: string | null }>

export const useStudio = () => useQuery({ queryKey: [...MUSIC, 'studio'], queryFn: () => api<Studio>('GET', '/api/music/studio') })

/** Studio edits change what listeners see too, so everything music is refetched. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: MUSIC })
}

export function useUpdateTrack() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, ...changes }: TrackChanges & { id: number }) => api<StudioTrack>('PATCH', `/api/music/studio/tracks/${id}`, changes),
    onSuccess: refresh,
  })
}

export function useUpdateTracks() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { ids: number[] } & Pick<TrackChanges, 'album_id' | 'is_ai' | 'published'>) => api<void>('PATCH', '/api/music/studio/tracks', input),
    onSuccess: refresh,
  })
}

const coverForm = (file: File) => {
  const form = new FormData()
  form.append('cover', file)
  return form
}

export function useTrackCover() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File | null }) =>
      file ? api<StudioTrack>('POST', `/api/music/studio/tracks/${id}/cover`, coverForm(file)) : api<StudioTrack>('DELETE', `/api/music/studio/tracks/${id}/cover`),
    onSuccess: refresh,
  })
}

export function useCreateAlbum() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: AlbumChanges & { title: string }) => api<StudioAlbum>('POST', '/api/music/studio/albums', input),
    onSuccess: refresh,
  })
}

export function useUpdateAlbum() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, ...changes }: AlbumChanges & { id: number }) => api<StudioAlbum>('PATCH', `/api/music/studio/albums/${id}`, changes),
    onSuccess: refresh,
  })
}

export function useAlbumCover() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => api<StudioAlbum>('POST', `/api/music/studio/albums/${id}/cover`, coverForm(file)),
    onSuccess: refresh,
  })
}

export function useDeleteAlbum() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: number) => api<void>('DELETE', `/api/music/studio/albums/${id}`),
    onSuccess: refresh,
  })
}

export function useScan() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: () => api<ScanResult>('POST', '/api/music/studio/scan'),
    onSuccess: refresh,
  })
}

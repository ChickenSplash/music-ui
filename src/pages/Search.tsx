import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { AiBadge, Card, Empty, Loading, PlayButton, Shelf } from '../components/bits'
import { Cover } from '../components/Cover'
import { Icon } from '../components/icons'
import { TrackTable } from '../components/TrackTable'
import { ErrorNote } from '../components/ui'
import { plural } from '../lib/format'
import { useSearch, type Track } from '../lib/music'
import { usePlayer } from '../lib/player-context'
import { AlbumCard } from './Home'

/** Waits for a pause in typing before searching. */
function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export function Search() {
  const [params] = useSearchParams()
  const q = useDebounced((params.get('q') ?? '').trim())
  const results = useSearch(q)

  return (
    <div className="space-y-8 px-3 py-6 md:px-5">
      <PhoneSearchBox />

      {results.isPending ? (
        <Loading />
      ) : results.isError ? (
        <ErrorNote>Search isn't working right now. Try again in a moment.</ErrorNote>
      ) : !results.data.tracks.length && !results.data.albums.length && !results.data.creators.length ? (
        q ? (
          <Empty icon="search" title={`No results found for “${q}”`}>
            <p>Check the spelling, or try fewer or different words.</p>
          </Empty>
        ) : (
          <Empty icon="note" title="No music yet" />
        )
      ) : (
        <>
          {results.data.tracks.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {q && (
                <section className="px-3">
                  <h2 className="mb-3 text-2xl font-bold text-white">Top result</h2>
                  <TopResult q={q} tracks={results.data.tracks} />
                </section>
              )}
              <section className={q ? '' : 'lg:col-span-2'}>
                <h2 className="mb-2 px-3 text-2xl font-bold text-white">{q ? 'Songs' : 'All songs'}</h2>
                <div className="-mx-2 md:-mx-6">
                  <TrackTable
                    label={q ? 'Songs' : 'All songs'}
                    rows={(q ? results.data.tracks.slice(0, 4) : results.data.tracks).map((track) => ({ key: track.id, track }))}
                    context={{ kind: 'search', id: q, label: q ? `Search: ${q}` : 'All songs', href: `/search?q=${encodeURIComponent(q)}` }}
                    showAlbum={!q}
                  />
                </div>
                {q && results.data.tracks.length > 4 && (
                  <details className="group">
                    <summary className="cursor-pointer list-none px-3 pt-2 text-sm font-semibold text-zinc-400 hover:text-white">
                      <span className="group-open:hidden">Show all {results.data.tracks.length} songs</span>
                    </summary>
                    <div className="-mx-2 md:-mx-6">
                      <TrackTable
                        label="More songs"
                        rows={results.data.tracks.slice(4).map((track) => ({ key: track.id, track }))}
                        context={{ kind: 'search', id: `${q}#more`, label: `Search: ${q}` }}
                      />
                    </div>
                  </details>
                )}
              </section>
            </div>
          )}

          {results.data.albums.length > 0 && (
            <Shelf title="Albums">
              {results.data.albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </Shelf>
          )}

          {results.data.creators.length > 0 && (
            <Shelf title="Creators">
              {results.data.creators.map((creator) => (
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
    </div>
  )
}

function TopResult({ q, tracks }: { q: string; tracks: Track[] }) {
  const player = usePlayer()
  const top = tracks[0]
  const current = player.track?.id === top.id

  return (
    <div className="group relative rounded-lg bg-raised p-5 transition hover:bg-hover">
      <Cover src={top.cover_url} seed={`t${top.id}`} className="size-24 shadow-xl" rounded="rounded-md" />
      <p className="mt-5 truncate pr-16 text-3xl font-bold text-white">{top.title}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
        {top.is_ai && <AiBadge />}
        Song ·{' '}
        <Link to={`/creator/${top.creator.id}`} className="font-semibold text-white hover:underline">
          {top.creator.display_name}
        </Link>
      </p>
      <PlayButton
        playing={current && player.playing}
        label={top.title}
        onClick={() => (current ? player.togglePlay() : player.playTracks(tracks, 0, { kind: 'search', id: `${q}#top`, label: `Search: ${q}` }))}
        className={`absolute right-5 bottom-5 transition-all ${current && player.playing ? '' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
      />
    </div>
  )
}

/** On a phone the top bar has no search box, so the page brings its own. */
function PhoneSearchBox() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  return (
    <div className="md:hidden">
      <h1 className="mb-4 text-2xl font-bold text-white">Search</h1>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-700" />
        <input
          type="search"
          value={params.get('q') ?? ''}
          onChange={(e) => navigate(e.target.value ? `/search?q=${encodeURIComponent(e.target.value)}` : '/search', { replace: true })}
          placeholder="What do you want to listen to?"
          aria-label="Search"
          className="h-12 w-full rounded-md bg-white pr-3 pl-11 text-base text-black outline-none placeholder:text-zinc-600"
        />
      </div>
    </div>
  )
}

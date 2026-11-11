import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { ErrorNote } from './components/ui'
import { useMe } from './lib/auth'
import { PlayerProvider } from './lib/player'
import { Album } from './pages/Album'
import { Creator } from './pages/Creator'
import { Home } from './pages/Home'
import { LibraryPage } from './pages/LibraryPage'
import { Liked } from './pages/Liked'
import { Playlist } from './pages/Playlist'
import { Search } from './pages/Search'
import { Studio } from './pages/Studio'
import { Terms } from './pages/Terms'
import { Welcome } from './pages/Welcome'

export default function App() {
  return (
    <Routes>
      <Route path="terms" element={<Terms />} />
      <Route path="*" element={<Main />} />
    </Routes>
  )
}

function Main() {
  const me = useMe()

  if (me.isPending) return null

  if (me.isError) {
    return (
      <main className="mx-auto max-w-md px-4 py-24">
        <ErrorNote>Can't reach the server right now. Try again in a moment.</ErrorNote>
      </main>
    )
  }

  const user = me.data

  if (!user) return <Welcome />

  // Keyed by user, so logging out and in as someone else never keeps the last person's queue.
  return (
    <PlayerProvider key={user.id}>
      <Routes>
        <Route element={<Layout user={user} />}>
          <Route index element={<Home user={user} />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<LibraryPage user={user} />} />
          <Route path="liked" element={<Liked user={user} />} />
          <Route path="album/:id" element={<Album />} />
          <Route path="creator/:id" element={<Creator />} />
          <Route path="playlist/:id" element={<Playlist />} />
          <Route path="studio" element={<Studio user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PlayerProvider>
  )
}

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useSignOut, type User } from '../lib/auth'
import { plural } from '../lib/format'
import { useCreatePlaylist, useLikes, usePlaylists } from '../lib/music'
import { usePlayer } from '../lib/player-context'
import { Avatar } from './Avatar'
import { LikedCover, Mosaic } from './Cover'
import { Equaliser, Icon, type IconName } from './icons'
import { Menu, MenuDivider, MenuItem, anchorOf, type MenuAnchor } from './Menu'
import { FullPlayer, SidePanel } from './NowPlaying'
import { MiniPlayer, PlayerBar, type Panel } from './Player'
import { ResizeHandle, useStoredWidth } from './ResizeHandle'
import { Settings } from './Settings'

// Library widths. Dragged narrower than SNAP, it collapses to a strip of covers.
const LIBRARY = { collapsed: 80, snap: 160, min: 220, max: 440, initial: 288 }
const PANEL = { min: 280, max: 520, initial: 320 }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Opening, closing and snapping all glide; while a handle is dragged the width follows the pointer.
const GLIDE = 'transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none'

/**
 * Spotify's desktop layout: a top bar with search, the library on the left, the page in the
 * middle, an optional now-playing or queue panel on the right, and the player along the
 * bottom. Phones get the page, a mini player and tabs.
 */
export function Layout({ user }: { user: User }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [fullPlayer, setFullPlayer] = useState(false)
  const [settings, setSettings] = useState(false)
  const main = useRef<HTMLElement>(null)
  const location = useLocation()
  const player = usePlayer()

  // Each page starts at the top, as if it were its own document.
  useEffect(() => {
    main.current?.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    document.title = player.track ? `${player.track.title} · ${player.track.creator.display_name}` : 'Music'
  }, [player.track])

  const closeFullPlayer = useCallback(() => setFullPlayer(false), [])

  // The library: its expanded width and whether it's collapsed are kept between visits.
  const [libraryWidth, setLibraryWidth] = useStoredWidth('music.library-width', LIBRARY.initial)
  const [collapsed, setCollapsedState] = useState(() => localStorage.getItem('music.library-collapsed') === '1')
  const [libraryDrag, setLibraryDrag] = useState<number | null>(null)
  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    localStorage.setItem('music.library-collapsed', value ? '1' : '0')
  }
  const libraryShown = libraryDrag !== null ? clamp(libraryDrag, LIBRARY.collapsed, LIBRARY.max) : collapsed ? LIBRARY.collapsed : libraryWidth
  const libraryCollapsed = libraryDrag !== null ? libraryDrag < LIBRARY.snap : collapsed

  const resizeLibrary = (width: number, done: boolean) => {
    if (!done) return setLibraryDrag(width)
    setLibraryDrag(null)
    if (width < LIBRARY.snap) setCollapsed(true)
    else {
      setCollapsed(false)
      setLibraryWidth(clamp(width, LIBRARY.min, LIBRARY.max))
    }
  }

  // The right panel stays mounted while it slides shut, showing what it showed last.
  const [panelWidth, setPanelWidth] = useStoredWidth('music.panel-width', PANEL.initial)
  const [panelDrag, setPanelDrag] = useState<number | null>(null)
  const [lastPanel, setLastPanel] = useState<Exclude<Panel, null>>('now')
  if (panel && panel !== lastPanel) setLastPanel(panel)
  const panelShown = panelDrag !== null ? clamp(panelDrag, PANEL.min, PANEL.max) : panelWidth

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell pt-[env(safe-area-inset-top)] text-zinc-100">
      <TopBar user={user} onSettings={() => setSettings(true)} />

      <div className={`flex min-h-0 flex-1 md:px-2 ${libraryDrag !== null || panelDrag !== null ? 'cursor-col-resize select-none' : ''}`}>
        <div style={{ width: libraryShown }} className={`hidden shrink-0 md:flex ${libraryDrag === null ? GLIDE : ''}`}>
          <Library user={user} collapsed={libraryCollapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
        <ResizeHandle
          label="Resize Your Library"
          side="left"
          width={libraryShown}
          min={LIBRARY.collapsed}
          max={LIBRARY.max}
          onResize={resizeLibrary}
          onDragging={(dragging) => !dragging && setLibraryDrag(null)}
          onToggle={() => setCollapsed(!collapsed)}
        />
        <main ref={main} id="main" className="scroll-panel relative min-w-0 flex-1 overflow-y-auto bg-panel md:rounded-lg">
          <Outlet />
        </main>
        <div
          style={{ width: panel ? panelShown + 8 : 0 }}
          inert={!panel}
          className={`hidden shrink-0 overflow-hidden lg:flex ${panelDrag === null ? GLIDE : ''}`}
        >
          {panel && (
            <ResizeHandle
              label="Resize the side panel"
              side="right"
              width={panelShown}
              min={PANEL.min}
              max={PANEL.max}
              onResize={(width, done) => {
                if (!done) return setPanelDrag(width)
                setPanelDrag(null)
                setPanelWidth(clamp(width, PANEL.min, PANEL.max))
              }}
              onDragging={(dragging) => !dragging && setPanelDrag(null)}
              onToggle={() => setPanel(null)}
            />
          )}
          {/* Fixed width inside a sliding box, so the content doesn't reflow as it opens. */}
          <div style={{ width: panelShown }} className={`shrink-0 ${panel ? '' : 'ml-2'}`}>
            <SidePanel panel={panel ?? lastPanel} onClose={() => setPanel(null)} />
          </div>
        </div>
      </div>

      <PlayerBar panel={panel} setPanel={setPanel} />
      <div className="space-y-1 bg-linear-to-t from-black via-black/95 to-transparent pt-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        <MiniPlayer onOpen={() => setFullPlayer(true)} />
        <TabBar />
      </div>

      {fullPlayer && <FullPlayer onClose={closeFullPlayer} />}
      {settings && <Settings user={user} onClose={() => setSettings(false)} />}
    </div>
  )
}

function TopBar({ user, onSettings }: { user: User; onSettings: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onSearch = location.pathname === '/search'
  // The URL holds the query, so back and forward (and leaving the page) keep the box in step.
  const query = onSearch ? (params.get('q') ?? '') : ''
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const { signOut } = useSignOut(user)

  const search = (value: string) => navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search', { replace: onSearch })

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-6">
      <Link to="/" aria-label="Music home" className="mr-2 hidden shrink-0 text-white md:block">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
          <circle cx="16" cy="16" r="15" fill="currentColor" />
          <path fill="#000" d="M13 22.5V10.2l9-2.2v11.3a2.8 2.8 0 1 1-1.6-2.5V11.8l-5.8 1.4v9.3a2.8 2.8 0 1 1-1.6-2.5z" />
        </svg>
      </Link>

      <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
        <NavLink
          to="/"
          end
          aria-label="Home"
          title="Home"
          className={({ isActive }) => `flex size-12 shrink-0 items-center justify-center rounded-full bg-raised transition hover:scale-105 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          <Icon name="home" className="size-6" />
        </NavLink>
        <form role="search" onSubmit={(e: FormEvent) => e.preventDefault()} className="relative w-full max-w-md">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => !onSearch && navigate('/search')}
            placeholder="What do you want to play?"
            aria-label="Search"
            className="h-12 w-full rounded-full bg-raised pr-4 pl-11 text-white ring-1 ring-transparent outline-none transition placeholder:text-zinc-400 hover:bg-hover hover:ring-white/10 focus:ring-2 focus:ring-white"
          />
        </form>
      </div>

      <h1 className="flex-1 text-xl font-bold md:hidden">Music</h1>

      <div className="flex shrink-0 items-center gap-2">
        {!user.is_guest && (
          <NavLink
            to="/studio"
            className={({ isActive }) =>
              `hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition hover:scale-105 sm:flex ${isActive ? 'bg-white text-black' : 'bg-raised text-white'}`
            }
          >
            <Icon name="studio" className="size-4" />
            Studio
          </NavLink>
        )}
        <button
          type="button"
          onClick={(e) => setMenu(anchorOf(e))}
          aria-label="Account"
          title={user.display_name}
          data-testid="me"
          className="rounded-full bg-raised p-1 transition hover:scale-105"
        >
          <Avatar user={user} size="sm" />
          <span className="sr-only">{user.display_name}</span>
        </button>
      </div>

      {menu && (
        <Menu anchor={menu} onClose={() => setMenu(null)} label="Account">
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-white">{user.display_name}</p>
            <p className="text-xs text-zinc-400">{user.is_guest ? 'Guest' : `#${user.id}`}</p>
          </div>
          <MenuDivider />
          <MenuItem icon="cog" onClick={() => (setMenu(null), onSettings())}>
            Account settings
          </MenuItem>
          {!user.is_guest && (
            <>
              <MenuItem icon="user" onClick={() => (setMenu(null), navigate(`/creator/${user.id}`))}>
                Your creator page
              </MenuItem>
              <MenuItem icon="studio" onClick={() => (setMenu(null), navigate('/studio'))}>
                Studio
              </MenuItem>
            </>
          )}
          <MenuItem icon="info" onClick={() => (setMenu(null), navigate('/terms'))}>
            Terms and privacy
          </MenuItem>
          <MenuDivider />
          <MenuItem icon="logout" onClick={() => (setMenu(null), signOut())}>
            Log out
          </MenuItem>
        </Menu>
      )}
    </header>
  )
}

/**
 * "Your Library": Liked Songs pinned on top, then your playlists, most recently changed first.
 * Collapsed, it's a strip of covers; the heading toggles it, like Spotify's.
 */
function Library({ user, collapsed, onToggle }: { user: User; collapsed: boolean; onToggle: () => void }) {
  const playlists = usePlaylists()
  const likes = useLikes()
  const create = useCreatePlaylist()
  const navigate = useNavigate()

  const newPlaylist = (
    <button
      type="button"
      onClick={() => create.mutate({}, { onSuccess: (playlist) => navigate(`/playlist/${playlist.id}`) })}
      disabled={create.isPending}
      aria-label="Create playlist"
      title="Create playlist"
      className="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-hover hover:text-white"
    >
      <Icon name="plus" className="size-5" />
    </button>
  )

  return (
    <nav aria-label="Your Library" className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg bg-panel">
      <div className={`flex items-center pt-3 pb-2 ${collapsed ? 'flex-col gap-1 px-2' : 'justify-between gap-2 px-4'}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand Your Library' : 'Collapse Your Library'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand Your Library' : 'Collapse Your Library'}
          className={`flex min-w-0 items-center gap-3 font-bold text-zinc-400 transition hover:text-white ${collapsed ? 'rounded-full p-2' : ''}`}
        >
          <Icon name="library" className="size-6 shrink-0" />
          {!collapsed && <span className="truncate">Your Library</span>}
        </button>
        {newPlaylist}
      </div>

      <ul className={`scroll-panel flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto pb-2 ${collapsed ? 'px-1' : 'px-2'}`}>
        <LibraryItem
          to="/liked"
          title="Liked Songs"
          subtitle={`Playlist · ${plural(likes.data?.length ?? 0, 'song')}`}
          image={<LikedCover className="size-12" />}
          kind="liked"
          collapsed={collapsed}
        />
        {playlists.data?.map((playlist) => (
          <LibraryItem
            key={playlist.id}
            to={`/playlist/${playlist.id}`}
            title={playlist.name}
            subtitle={`Playlist · ${user.display_name}`}
            image={<Mosaic covers={playlist.covers} seed={`p${playlist.id}`} className="size-12" />}
            kind="playlist"
            id={playlist.id}
            collapsed={collapsed}
          />
        ))}
      </ul>

      {user.is_guest && !collapsed && (
        <p className="m-2 rounded-md bg-raised p-3 text-xs text-zinc-400">
          You're a guest: your playlists and liked songs are deleted when you log out. Register an account to keep them.
        </p>
      )}
    </nav>
  )
}

function LibraryItem({
  to,
  title,
  subtitle,
  image,
  kind,
  id,
  collapsed,
}: {
  to: string
  title: string
  subtitle: string
  image: ReactNode
  kind: 'liked' | 'playlist'
  id?: number
  collapsed: boolean
}) {
  const player = usePlayer()
  const playingHere = player.playing && player.context?.kind === kind && String(player.context.id ?? '') === String(id ?? '')

  return (
    <li>
      <NavLink
        to={to}
        title={collapsed ? title : undefined}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md p-2 transition ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-hover' : 'hover:bg-white/5'}`
        }
      >
        <span className="relative shrink-0">
          {image}
          {collapsed && playingHere && (
            <span className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
              <Equaliser className="h-3 w-3" />
            </span>
          )}
        </span>
        <span className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
          <span className={`block truncate ${playingHere ? 'text-accent' : 'text-white'}`}>{title}</span>
          <span className="block truncate text-sm text-zinc-400">{subtitle}</span>
        </span>
        {playingHere && !collapsed && <Equaliser className="mr-2 h-3 w-3 shrink-0" />}
      </NavLink>
    </li>
  )
}

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/library', label: 'Your Library', icon: 'library' },
]

function TabBar() {
  return (
    <nav aria-label="Tabs" className="grid grid-cols-3 pt-1 pb-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `flex flex-col items-center gap-1 text-[11px] ${isActive ? 'text-white' : 'text-zinc-400'}`}
        >
          <Icon name={tab.icon} className="size-6" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

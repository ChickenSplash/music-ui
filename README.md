# music-ui

The front end of a homelab music streaming app for AI-generated music, loosely laid out like
Spotify, at `music.chickensplash.dpdns.org`. The back end is
[HMS](https://github.com/ChickenSplash/homelab-management-system); its plan is in
`docs/plans/music-service.md` there.

## Stack

- React 19 + TypeScript, Vite, Tailwind CSS 4
- TanStack Query for API data, React Router
- Hearts read Liked Songs (`useLiked`), not the track object they were given: the player keeps
  its own copy of each track, whose `liked` goes stale
- One `<audio>` element for the whole app (`src/lib/player.tsx`), so playback carries on
  between pages

Same skeleton as [chat-ui](https://github.com/ChickenSplash/chat-ui): its `api.ts`, sign-in,
`Modal`/`useConfirm()` and form controls, without the WebSocket.

## How it talks to HMS

Everything is same-origin: nginx (or the Vite dev server) forwards `/api/` and `/sanctum/` to
`hms:3000`. Streams are checked by HMS and then sent by this nginx: HMS answers
`X-Accel-Redirect: /_music/<path>`, an internal location serving the music folder (mounted
read-only at `/music`, the same folder HMS reads). So the container needs `MUSIC_PATH` too.

There's no sign-in screen here. Accounts live on HMS's shared sign-in site
(`https://chickensplash.dpdns.org`, `VITE_ACCOUNTS_URL` at build time, `src/lib/accounts.ts`):
signed out, the app sends you to its `/login?return=<this page>`, and you come back signed in
to every app at once. Logging out here logs you out everywhere and lands on that site. The
terms page is there too (`/terms` here redirects). nginx expires the per-host cookies HMS set
before the switch, which would otherwise break every write with a 419.

## Screens

- **Signing in:** on the shared sign-in site, the same accounts as chat (see below)
- **Layout:** top bar (home, search, Studio, account menu), Your Library on the left (Liked
  Songs, playlists, +), the page, an optional right panel (now playing with lyrics, or the
  queue) and the player bar. Both sidebars resize by dragging their edge (or arrow keys on the
  focused edge). The library snaps to a strip of covers when dragged narrow, and its heading,
  a double-click or Enter on the edge toggles it. Widths are remembered; opening, closing and
  snapping glide. Under 768 px: the page, a mini player, a full-screen player and
  Home / Search / Your Library tabs.
- **Home** (`/`), **Search** (`/search?q=`; empty lists all songs), **Album** (`/album/:id`),
  **Creator** (`/creator/:id`), **Playlist** (`/playlist/:id`: rename, delete, drag rows to
  reorder), **Liked Songs** (`/liked`), **Your Library** (`/library`, phones)
- **Track lists:** double-click (tap on a phone) to play from there, hover for the heart and
  the "…" menu (add to playlist, remove, like, play next, go to creator or album); right-click
  works too
- **Studio** (`/studio`, registered accounts): Inbox, Published, Albums and Missing files tabs,
  Scan now, bulk publish / move to album / mark AI, track and album editors with covers
- **Player:** shuffle, repeat (all, one), seek, volume (remembered), Space to play or pause,
  lock-screen and media-key controls, and a play counted after 30 s

## Develop

Needs a running HMS (`php artisan serve`), without `MUSIC_ACCEL_PREFIX` so it sends the files
itself:

```bash
npm install
VITE_ACCOUNTS_URL=http://localhost:8000 npm run dev   # proxies to localhost:8000; override with HMS_URL
```

Or the whole thing in Docker (`dev/docker-compose.yml`, expects the HMS repo next to this one):
the app on `http://localhost:8090`, the sign-in site on `http://localhost:8091`:

```bash
mkdir -p ~/scratch/music-dev
MUSIC_PATH=~/scratch/music-dev docker compose -f dev/docker-compose.yml up -d --build
```

Register, then put MP3s in `~/scratch/music-dev/<your public ID>/` and use Scan now.

## Deploy

On the homelab, in `~/homelab/music-ui`:

```bash
git pull
docker compose up -d --build
```

The container joins the external `edge` network and mounts `MUSIC_PATH` (default
`/srv/files/Music`); point the tunnel's public hostname at `http://music-ui:80`. The hostname
must be in HMS's `SANCTUM_STATEFUL_DOMAINS`, and its URL in HMS's `MUSIC_URL`.

## End-to-end tests

Playwright, against the local Docker stack. The tests put MP3s straight into creators'
folders, so they need the same `MUSIC_PATH`:

```bash
MUSIC_PATH=~/scratch/music-dev BASE_URL=http://localhost:8090 npx playwright test --project=chromium --project=firefox
```

The `mobile` project (WebKit at iPhone size) runs in Playwright's image:

```bash
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp -e BASE_URL=http://localhost:8090 \
  -e MUSIC_PATH=/music-dev -v ~/scratch/music-dev:/music-dev \
  -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.0-noble npx playwright test --project=mobile
```

Registered test accounts use `e2e-*@example.com` addresses. Never run these against production:
they create accounts and tracks.

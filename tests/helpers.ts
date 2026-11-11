import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * HMS rate limits sign-ins per CF-Connecting-IP. Off Cloudflare nothing overwrites the
 * header, so each browser context claims its own address instead of sharing one budget.
 */
export async function ownIp(context: BrowserContext) {
  const octet = () => Math.floor(Math.random() * 254) + 1
  await context.setExtraHTTPHeaders({ 'CF-Connecting-IP': `10.${octet()}.${octet()}.${octet()}` })
}

export const unique = () => Math.random().toString(36).slice(2, 10)

async function signedIn(page: Page): Promise<string> {
  await expect(page.getByTestId('me')).toBeVisible()
  return page.evaluate(async () => (await (await fetch('/api/auth/me', { headers: { Accept: 'application/json' } })).json()).id)
}

/** Joins as a guest and returns their public ID. */
export async function joinAsGuest(page: Page, name = 'Listener'): Promise<string> {
  await page.goto('/')
  await page.getByLabel('Display name').fill(name)
  await page.getByRole('checkbox', { name: /agree to the terms/ }).check()
  await page.getByRole('button', { name: 'Join' }).click()
  return signedIn(page)
}

/** Registers an `e2e-*@example.com` account (delete them afterwards) and returns its public ID. */
export async function register(page: Page, name = 'Creator'): Promise<string> {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Register' }).click()
  await page.getByLabel('Display name').fill(name)
  await page.getByLabel('Email').fill(`e2e-${unique()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('password-1234')
  await page.getByLabel('Confirm password').fill('password-1234')
  await page.getByRole('checkbox', { name: /agree to the terms/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  return signedIn(page)
}

/**
 * Puts the test MP3 into a creator's folder. The tests run next to the stack, so MUSIC_PATH
 * is the same folder HMS has mounted (see dev/docker-compose.yml).
 */
export function placeFile(creator: string, file: string) {
  const root = process.env.MUSIC_PATH
  if (!root) throw new Error('Set MUSIC_PATH to the folder the test stack mounts as /music')
  const target = join(root, creator, file)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(join(import.meta.dirname, 'fixtures', 'tone.mp3'), target)
}

/** A JSON request from inside the page, with its session and CSRF token, for setting up data quickly. */
export async function apiCall<T = unknown>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const token = decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? '')
      const response = await fetch(path, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
      return response.status === 204 ? undefined : response.json()
    },
    { method, path, body },
  ) as Promise<T>
}

/**
 * A registered creator with published tracks titled as given (each a copy of the test tone),
 * set up through the API. Returns the creator's page and ID.
 */
export async function creatorWithTracks(browser: Browser, titles: string[], name = `Creator ${unique()}`) {
  const context = await browser.newContext()
  await ownIp(context)
  const page = await context.newPage()
  const id = await register(page, name)

  titles.forEach((_, i) => placeFile(id, `track-${i}.mp3`))
  await apiCall(page, 'POST', '/api/music/studio/scan')
  const studio = await apiCall<{ tracks: { id: number; file: string }[] }>(page, 'GET', '/api/music/studio')
  for (const track of studio.tracks) {
    const index = Number(track.file.match(/track-(\d+)/)![1])
    await apiCall(page, 'PATCH', `/api/music/studio/tracks/${track.id}`, { title: titles[index], published: true })
  }

  return { page, id, name, context }
}

/** The note that pops up at the bottom, like "Added to Liked Songs". */
export const toast = (page: Page) => page.locator('[aria-live] [role=status]')

/** Accepts the confirmation modal on top (the app's own, not the browser's). */
export async function confirmModal(page: Page) {
  await page.getByRole('dialog').last().locator('button[type="submit"]').click()
}

export async function logOut(page: Page) {
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await confirmModal(page)
  await expect(page.getByRole('tab', { name: 'Join as guest' })).toBeVisible()
}

/** Seconds into the current track, read off the audio element through the seek bar. */
export const position = (page: Page) => page.getByRole('slider', { name: 'Seek' }).first().inputValue().then(Number)

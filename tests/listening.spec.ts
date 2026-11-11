import { expect, test, type Page } from '@playwright/test'
import { confirmModal, creatorWithTracks, joinAsGuest, logOut, ownIp, toast, unique } from './helpers'

test.beforeEach(({ context }) => ownIp(context))

const row = (page: Page, table: string, title: string) => page.getByRole('table', { name: table }).getByRole('row', { name: title })

/** The "…" on a row only shows on hover, as on Spotify. */
async function trackMenu(page: Page, table: string, title: string) {
  await row(page, table, title).hover()
  await row(page, table, title).getByRole('button', { name: `More options for ${title}` }).click()
}

test('likes, playlists and the queue', async ({ page, browser }) => {
  const tag = unique()
  const [a, b, c] = [`Alpha ${tag}`, `Bravo ${tag}`, `Charlie ${tag}`]
  const creator = await creatorWithTracks(browser, [a, b, c])

  await joinAsGuest(page)
  await page.goto(`/creator/${creator.id}`)
  await expect(page.getByRole('heading', { name: creator.name })).toBeVisible()

  // Like one from the list; it shows in Liked Songs.
  await row(page, 'All tracks', b).hover()
  await row(page, 'All tracks', b).getByRole('button', { name: `Save ${b} to Liked Songs` }).click()
  await expect(toast(page)).toHaveText('Added to Liked Songs')
  await page.getByRole('link', { name: /Liked Songs/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Liked Songs' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Liked Songs' }).getByRole('row')).toHaveCount(2)
  await expect(row(page, 'Liked Songs', b)).toBeVisible()

  // A new playlist from a track's menu, then a second track added to it.
  await page.goto(`/creator/${creator.id}`)
  await trackMenu(page, 'All tracks', a)
  await page.getByRole('menuitem', { name: 'Add to playlist' }).click()
  await page.getByRole('menuitem', { name: 'New playlist' }).click()
  await expect(page.getByRole('heading', { name: 'My Playlist #1' })).toBeVisible()
  await page.goBack()
  await trackMenu(page, 'All tracks', c)
  await page.getByRole('menuitem', { name: 'Add to playlist' }).click()
  await page.getByRole('menuitem', { name: 'My Playlist #1' }).click()
  await expect(toast(page)).toHaveText('Added to My Playlist #1')

  // Rename it.
  await page.getByRole('navigation', { name: 'Your Library' }).getByRole('link', { name: /My Playlist #1/ }).click()
  await page.getByRole('button', { name: 'My Playlist #1', exact: true }).click()
  await page.getByLabel('Name').fill(`Road trip ${tag}`)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: `Road trip ${tag}` })).toBeVisible()
  const playlist = `Road trip ${tag}`
  await expect(page.getByRole('table', { name: playlist }).getByRole('row')).toHaveCount(3)

  // Play it: the first track starts, Next moves on, and it's marked as playing in the library.
  await page.getByRole('button', { name: `Play ${playlist}` }).click()
  await expect(page.getByTestId('now-playing')).toHaveText(a)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByTestId('now-playing')).toHaveText(c)
  await expect(page.getByRole('button', { name: `Pause ${playlist}` })).toBeVisible()

  // Play next puts a track straight after the current one, in the queue panel. (Moving
  // around inside the app: a page load would stop the music.)
  await page.getByRole('contentinfo', { name: 'Player' }).getByRole('link', { name: creator.name }).click()
  await trackMenu(page, 'All tracks', b)
  await page.getByRole('menuitem', { name: 'Play next' }).click()
  await page.getByRole('button', { name: 'Queue' }).click()
  await expect(page.getByRole('complementary', { name: 'Queue' }).getByRole('listitem').first()).toContainText(b)

  // Remove a track from the playlist.
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Your Library' }).getByRole('link', { name: new RegExp(playlist) }).click()
  await trackMenu(page, playlist, a)
  await page.getByRole('menuitem', { name: 'Remove from this playlist' }).click()
  await expect(page.getByRole('table', { name: playlist }).getByRole('row')).toHaveCount(2)

  // Delete it.
  await page.getByRole('button', { name: `More options for ${playlist}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await confirmModal(page)
  await expect(page.getByRole('navigation', { name: 'Your Library' }).getByRole('link', { name: new RegExp(playlist) })).toHaveCount(0)

  await logOut(page)
  await creator.context.close()
})

test('the player keeps going across pages, and shuffle and repeat toggle', async ({ page, browser }) => {
  const tag = unique()
  const creator = await creatorWithTracks(browser, [`One ${tag}`, `Two ${tag}`])

  await joinAsGuest(page)
  await page.goto(`/creator/${creator.id}`)
  await page.getByRole('button', { name: `Play ${creator.name}` }).click()
  await expect(page.getByTestId('now-playing')).toContainText(tag)
  await expect.poll(() => page.getByRole('slider', { name: 'Seek' }).inputValue().then(Number)).toBeGreaterThan(0)

  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.getByTestId('now-playing')).toContainText(tag)
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Shuffle' }).click()
  await expect(page.getByRole('button', { name: 'Shuffle' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Repeat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Repeat one' })).toHaveAttribute('aria-pressed', 'true')

  // Pausing with the keyboard (away from the buttons, where Space presses the button instead).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()


  await creator.context.close()
})

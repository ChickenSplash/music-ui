import { expect, test } from '@playwright/test'
import { creatorWithTracks, joinAsGuest, ownIp, unique } from './helpers'

test.beforeEach(({ context }) => ownIp(context))

test('the hearts in the player bar and side panel follow a like made there', async ({ page, browser }) => {
  const title = `Heart ${unique()}`
  const creator = await creatorWithTracks(browser, [title])

  await joinAsGuest(page)
  await page.goto(`/creator/${creator.id}`)
  await page.getByRole('button', { name: `Play ${creator.name}` }).click()
  await page.getByRole('button', { name: 'Now playing and lyrics' }).click()

  const bar = page.getByRole('contentinfo', { name: 'Player' })
  const panel = page.getByRole('complementary', { name: 'Now playing' })
  await bar.getByRole('button', { name: `Save ${title} to Liked Songs` }).click()
  // Still on once Liked Songs has been fetched again, not just for a moment.
  await expect(page.getByRole('link', { name: /Liked Songs Playlist · 1 song/ })).toBeVisible()
  await expect(bar.getByRole('button', { name: `Remove ${title} from Liked Songs` })).toHaveAttribute('aria-pressed', 'true')
  await expect(panel.getByRole('button', { name: `Remove ${title} from Liked Songs` })).toHaveAttribute('aria-pressed', 'true')

  await panel.getByRole('button', { name: `Remove ${title} from Liked Songs` }).click()
  await expect(page.getByRole('link', { name: /Liked Songs Playlist · 0 songs/ })).toBeVisible()
  await expect(bar.getByRole('button', { name: `Save ${title} to Liked Songs` })).toHaveAttribute('aria-pressed', 'false')

  await creator.context.close()
})

test('the library can be dragged wider, collapsed and expanded, and remembers it', async ({ page }) => {
  await joinAsGuest(page)
  const handle = page.getByRole('separator', { name: 'Resize Your Library' })
  const box = (await handle.boundingBox())!

  await page.mouse.move(box.x + 4, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 84, box.y + 100, { steps: 5 })
  await page.mouse.up()
  await expect(handle).toHaveAttribute('aria-valuenow', '368')

  // Dragged most of the way in, it snaps to a strip of covers.
  await page.mouse.move(box.x + 84, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x - 200, box.y + 100, { steps: 5 })
  await page.mouse.up()
  await expect(handle).toHaveAttribute('aria-valuenow', '80')
  await expect(page.getByRole('button', { name: 'Expand Your Library' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand Your Library' })).toBeVisible()
  await page.getByRole('button', { name: 'Expand Your Library' }).click()
  await expect(handle).toHaveAttribute('aria-valuenow', '368')

  // The keyboard works too.
  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(handle).toHaveAttribute('aria-valuenow', '352')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Expand Your Library' })).toBeVisible()
})

test('the side panel opens and closes', async ({ page }) => {
  await joinAsGuest(page)
  const panel = page.getByRole('complementary', { name: 'Queue' })
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: 'Queue' }).click()
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Close panel' }).click()
  await expect(page.getByRole('button', { name: 'Queue' })).toHaveAttribute('aria-pressed', 'false')
})

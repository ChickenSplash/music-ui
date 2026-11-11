import { expect, test } from '@playwright/test'
import { creatorWithTracks, joinAsGuest, ownIp, unique } from './helpers'

test.beforeEach(({ context }) => ownIp(context))

test('on a phone: tabs, tap to play, the mini player and the full-screen player', async ({ page, browser }) => {
  const title = `Pocket ${unique()}`
  const creator = await creatorWithTracks(browser, [title])

  await joinAsGuest(page)
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Search' }).click()
  await page.getByRole('searchbox', { name: 'Search' }).fill(title)
  await page.getByRole('table', { name: 'Songs' }).getByRole('row', { name: title }).click()

  await page.getByRole('button', { name: 'Open player' }).click()
  const player = page.getByRole('dialog', { name: 'Player' })
  await expect(player.getByText(title)).toBeVisible()
  await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await player.getByRole('button', { name: 'Close player' }).click()
  await expect(player).toBeHidden()

  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Your Library' }).click()
  await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Liked Songs/ })).toBeVisible()

  await creator.context.close()
})

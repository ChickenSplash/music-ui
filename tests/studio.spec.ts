import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { joinAsGuest, ownIp, placeFile, register, toast, unique } from './helpers'

test.beforeEach(({ context }) => ownIp(context))

test('a creator picks up new files, edits, groups and publishes them, and a guest finds them', async ({ page, browser }) => {
  const name = `Nova ${unique()}`
  const title = `Night Drive ${unique()}`
  const album = `Neon ${unique()}`
  const id = await register(page, name)

  await page.getByRole('link', { name: 'Studio' }).click()
  await expect(page.getByText(`Music/${id}`)).toBeVisible()
  await expect(page.getByText('Your inbox is empty')).toBeVisible()

  placeFile(id, 'Demos/first.mp3')
  placeFile(id, 'Demos/second.mp3')
  await page.getByRole('button', { name: 'Scan now' }).click()
  // Another test's scan (they cover every folder) may have found them first.
  await expect(toast(page)).toHaveText(/Found 2 new tracks|No changes found/)
  const inbox = page.getByRole('list', { name: 'inbox' })
  await expect(inbox.getByRole('listitem')).toHaveCount(2)
  await expect(inbox.getByText('Demos/first.mp3')).toBeVisible()

  // Edit the first one: title, lyrics, not AI, and its own cover.
  await inbox.getByRole('listitem').filter({ hasText: 'Demos/first.mp3' }).getByRole('button', { name: /^Edit/ }).click()
  const editor = page.getByRole('dialog', { name: 'Edit track' })
  await editor.getByLabel('Title').fill(title)
  await editor.getByLabel('AI-generated').uncheck()
  await editor.getByPlaceholder('Optional. Shown beside the player.').fill('Lights on the motorway')
  await editor.locator('input[type=file]').setInputFiles(join(import.meta.dirname, 'fixtures', 'cover.png'))
  await expect(editor.locator('img')).toHaveAttribute('src', /\/api\/music\/tracks\/\d+\/cover/)
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(editor).toBeHidden()

  // An album, then both tracks into it and published in one go.
  await page.getByRole('button', { name: 'New album' }).first().click()
  const albumEditor = page.getByRole('dialog', { name: 'New album' })
  await albumEditor.getByLabel('Title').fill(album)
  await albumEditor.getByRole('button', { name: 'Create' }).click()
  await expect(albumEditor).toBeHidden()

  await page.getByRole('tab', { name: /Inbox/ }).click()
  await page.getByLabel('Select all').check()
  await page.getByLabel('Move to album').selectOption({ label: album })
  await expect(toast(page)).toHaveText('Moved to album')
  await page.getByLabel('Select all').check()
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(toast(page)).toHaveText('Published 2 tracks')
  await expect(page.getByText('Your inbox is empty')).toBeVisible()
  await page.getByRole('tab', { name: /Published/ }).click()
  await expect(page.getByRole('list', { name: 'published' }).getByRole('listitem')).toHaveCount(2)

  // A guest, in their own browser, finds it by search and plays it.
  const context = await browser.newContext()
  await ownIp(context)
  const guest = await context.newPage()
  await joinAsGuest(guest)
  await guest.getByRole('searchbox', { name: 'Search' }).fill(title)
  await expect(guest.getByRole('heading', { name: 'Top result' })).toBeVisible()
  await guest.getByRole('table', { name: 'Songs' }).getByRole('row', { name: title }).dblclick()
  await expect(guest.getByTestId('now-playing')).toHaveText(title)
  await expect.poll(() => guest.getByRole('slider', { name: 'Seek' }).inputValue().then(Number)).toBeGreaterThan(0)

  // Not AI, so no badge on it; lyrics in the now playing panel.
  await expect(guest.getByRole('table', { name: 'Songs' }).getByRole('row', { name: title }).getByTitle('AI-generated')).toHaveCount(0)
  await guest.getByRole('button', { name: 'Now playing and lyrics' }).click()
  await expect(guest.getByTestId('lyrics')).toHaveText('Lights on the motorway')

  // The album page lists both, and the creator page shows the album.
  await guest.getByTestId('now-playing').getByRole('link').click()
  await expect(guest.getByRole('heading', { name: album })).toBeVisible()
  await expect(guest.getByRole('table', { name: album }).getByRole('row')).toHaveCount(3)
  await guest.getByRole('link', { name: name }).first().click()
  await expect(guest.getByRole('heading', { name: name })).toBeVisible()
  await expect(guest.getByRole('heading', { name: 'Discography' })).toBeVisible()

  await context.close()
})

test('guests have no studio', async ({ page }) => {
  await joinAsGuest(page)
  await expect(page.getByRole('link', { name: 'Studio' })).toHaveCount(0)
  await page.goto('/studio')
  await expect(page).toHaveURL(/\/$/)
})

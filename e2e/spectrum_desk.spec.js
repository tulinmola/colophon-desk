import { chordLeftToThePage, expectTyped, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"

const PAGE = "/spectrum48.html"

test("the 48K runs, and takes its keys", async function ({ page }) {
  await expectTyped(page, PAGE)
})

test("a 48K's desk has a cassette recorder to put a tape in, and no drive or datacorder", async function ({
  page
}) {
  await stand(page, PAGE)

  const desk = page.locator("colophon-spectrum-desk"),
    monitor = desk.getByRole("button", { name: "The monitor" }),
    recorder = desk.getByRole("button", { name: "The cassette recorder" }),
    drive = desk.getByRole("button", { name: "The disc drive" }),
    datacorder = desk.getByRole("button", { name: "The datacorder" }),
    chooser = desk.locator("input[type='file']")

  await expect(monitor).toBeVisible()
  await expect(recorder).toBeVisible()
  await expect(drive).toHaveCount(0)
  await expect(datacorder).toHaveCount(0)
  await expect(chooser).toHaveAttribute("accept", ".tap,.tzx,.zip")
})

test("a SYMBOL SHIFT chord is the machine's, and opens nothing of the browser's", async function ({
  page
}) {
  await stand(page, PAGE)

  const desk = page.locator("colophon-spectrum-desk"),
    left = await chordLeftToThePage(desk, "KeyP")

  expect(left).toBe(false)
})

import { SLOW_WAIT, scene, settled, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"

test("the desk lays a canvas the size of itself", async function ({ page }) {
  await page.goto("/")

  const desk = page.locator("colophon-cpc-desk"),
    canvas = desk.locator("canvas")

  await expect(canvas).toBeVisible()

  const deskBox = await desk.boundingBox(),
    canvasBox = await canvas.boundingBox()

  expect(canvasBox.width).toBeCloseTo(deskBox.width, 0)
  expect(canvasBox.height).toBeCloseTo(deskBox.height, 0)
})

test("the desk stands once its machine has booted", async function ({ page }) {
  await page.goto("/")

  const options = page.locator("colophon-options")

  await expect(options).toBeVisible({ timeout: 30000 })
})

// Nothing on either machine moves on its own at the prompt, so a picture that
// changed has been typed on.
async function expectTyped(page, path) {
  const desk = page.locator("colophon-cpc-desk")

  await stand(page, path)
  await desk.focus()

  const quiet = await settled(page)

  await page.keyboard.press("KeyA")

  await expect
    .poll(async function () {
      const typed = await scene(page)

      return typed.equals(quiet)
    }, SLOW_WAIT)
    .toBe(false)
}

test("a keystroke let go of within the frame still reaches the machine", async function ({ page }) {
  await expectTyped(page, "/")
})

test("the options keep their own arrow keys, which the machine also reads", async function ({
  page
}) {
  await page.goto("/")

  const options = page.locator("colophon-options"),
    travel = options.locator("input[name='keyTravel']")

  await expect(options).toBeVisible({ timeout: 30000 })
  await options.getByRole("button", { name: "Options" }).click()

  const before = await travel.inputValue()

  await travel.focus()
  await page.keyboard.press("ArrowRight")

  expect(await travel.inputValue()).not.toBe(before)
})

test("a desk laid again lays one canvas, not two", async function ({ page }) {
  await page.goto("/")

  const desk = page.locator("colophon-cpc-desk"),
    canvas = desk.locator("canvas")

  await expect(canvas).toBeVisible()

  await desk.evaluate(function (element) {
    element.remove()
    document.body.append(element)
  })

  await expect(canvas).toHaveCount(1)
})

test("a desk that names no machine stands the 6128, with its drive to put a disc in and no datacorder", async function ({
  page
}) {
  await stand(page)

  const desk = page.locator("colophon-cpc-desk"),
    drive = desk.getByRole("button", { name: "The disc drive" }),
    datacorder = desk.getByRole("button", { name: "The datacorder" }),
    chooser = desk.locator("input[type='file']"),
    tapeNotice = desk.locator("output[name='datacorder']")

  await expect(drive).toBeVisible()
  await expect(chooser).toHaveAttribute("accept", ".dsk,.zip")
  await expect(datacorder).toHaveCount(0)
  await expect(tapeNotice).toHaveCount(0)
})

test("a desk that names the 464 stands it, with a datacorder to put a tape in and no drive", async function ({
  page
}) {
  await stand(page, "/cpc464.html")

  const desk = page.locator("colophon-cpc-desk"),
    drive = desk.getByRole("button", { name: "The disc drive" }),
    datacorder = desk.getByRole("button", { name: "The datacorder" }),
    chooser = desk.locator("input[type='file']"),
    driveNotice = desk.locator("output[name='drive']")

  await expect(datacorder).toBeVisible()
  await expect(chooser).toHaveAttribute("accept", ".cdt,.tzx,.zip")
  await expect(drive).toHaveCount(0)
  await expect(driveNotice).toHaveCount(0)
})

test("a 464 given a DDI-1 stands with its drive to put a disc in beside its datacorder", async function ({
  page
}) {
  await stand(page, "/cpc464-ddi1.html")

  const desk = page.locator("colophon-cpc-desk"),
    drive = desk.getByRole("button", { name: "The disc drive" }),
    datacorder = desk.getByRole("button", { name: "The datacorder" }),
    discs = desk.locator("input[name='discs']"),
    tapes = desk.locator("input[name='tapes']")

  await expect(drive).toBeVisible()
  await expect(datacorder).toBeVisible()
  await expect(discs).toHaveAttribute("accept", ".dsk,.zip")
  await expect(tapes).toHaveAttribute("accept", ".cdt,.tzx,.zip")
})

test("the 464 runs, and takes its keys", async function ({ page }) {
  await expectTyped(page, "/cpc464.html")
})

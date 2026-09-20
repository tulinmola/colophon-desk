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

// Nothing on this machine moves on its own at the prompt, so a picture that
// changed has been typed on.
test("a keystroke let go of within the frame still reaches the machine", async function ({ page }) {
  const desk = page.locator("colophon-cpc-desk")

  await stand(page)
  await desk.focus()

  const quiet = await settled(page)

  await page.keyboard.press("KeyA")

  await expect
    .poll(async function () {
      const typed = await scene(page)

      return typed.equals(quiet)
    }, SLOW_WAIT)
    .toBe(false)
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

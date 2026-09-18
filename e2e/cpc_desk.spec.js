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

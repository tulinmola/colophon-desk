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

test("the desk fetches the machine that stands on it", async function ({ page }) {
  const fetched = page.waitForResponse(response => response.url().endsWith("/cpc6128.glb"))

  await page.goto("/")

  const response = await fetched,
    headers = response.headers()

  expect(headers["content-type"]).toBe("model/gltf-binary")
})

test("the desk fetches the print its drive plate names", async function ({ page }) {
  const fetched = page.waitForResponse(response =>
    response.url().endsWith("/cpc6128-drive-plate.png")
  )

  await page.goto("/")

  const response = await fetched,
    headers = response.headers()

  expect(headers["content-type"]).toBe("image/png")
})

test("the desk fetches the legends its keycaps name", async function ({ page }) {
  const fetched = page.waitForResponse(response => response.url().endsWith("/cpc6128-legends.png"))

  await page.goto("/")

  const response = await fetched,
    headers = response.headers()

  expect(headers["content-type"]).toBe("image/png")
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

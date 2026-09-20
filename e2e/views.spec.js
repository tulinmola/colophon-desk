import { DRIVE, SLOW_WAIT, pointAt, scene, settled, stand } from "./desk_scene.js"
import { expect, test } from "@playwright/test"

const WINDOWS = [
  { width: 200, height: 900 },
  { width: 800, height: 300 },
  { width: 480, height: 480 }
]

// Where the glass stands on the canvas in the whole desk's view, as a fraction of its size.
const GLASS = { x: 0.48, y: 0.38 }

const BESIDE = { x: 0.1, y: 0.5 },
  MIDDLE = { x: 0.5, y: 0.5 }

// The colours along the canvas's outermost whole pixels, and the one at its middle.
async function readEdge(page) {
  const box = await page.locator("colophon-cpc-desk canvas").boundingBox(),
    picture = await scene(page),
    encoded = picture.toString("base64")

  return page.evaluate(
    async function ([png, { x, y, width, height }]) {
      const decoded = atob(png),
        bytes = Uint8Array.from(decoded, letter => letter.charCodeAt(0)),
        blob = new Blob([bytes], { type: "image/png" }),
        bitmap = await createImageBitmap(blob),
        canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
        context = canvas.getContext("2d")

      context.drawImage(bitmap, 0, 0)

      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height),
        left = Math.ceil(x),
        top = Math.ceil(y),
        right = Math.floor(x + width) - 1,
        bottom = Math.floor(y + height) - 1,
        edge = new Set()

      function colourAt(across, down) {
        const start = (down * bitmap.width + across) * 4

        return data.slice(start, start + 3).join()
      }

      for (let across = left; across <= right; across++) {
        edge.add(colourAt(across, top))
        edge.add(colourAt(across, bottom))
      }

      for (let down = top; down <= bottom; down++) {
        edge.add(colourAt(left, down))
        edge.add(colourAt(right, down))
      }

      const across = Math.round((left + right) / 2),
        down = Math.round((top + bottom) / 2),
        middle = colourAt(across, down)

      return { edge: [...edge], middle }
    },
    [encoded, box]
  )
}

async function drag(page, from, by) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: 4 })
  await page.mouse.up()
}

test("the whole desk stands inside a window of any shape", async function ({ page }) {
  const allowed = WINDOWS.length * SLOW_WAIT.timeout

  test.setTimeout(allowed)
  await stand(page)

  const desk = page.locator("colophon-cpc-desk"),
    canvas = desk.locator("canvas")

  for (const size of WINDOWS) {
    await page.setViewportSize(size)

    await expect
      .poll(async function () {
        const deskBox = await desk.boundingBox(),
          canvasBox = await canvas.boundingBox()

        return Math.abs(deskBox.width - canvasBox.width) < 1
      })
      .toBe(true)

    await expect
      .poll(async function () {
        const { edge, middle } = await readEdge(page)

        return edge.length == 1 && middle != edge[0]
      }, SLOW_WAIT)
      .toBe(true)
  }
})

test("the monitor's button carries the eye to the glass, and the desk's brings it back", async function ({
  page
}) {
  await stand(page)

  const desk = page.locator("colophon-cpc-desk"),
    monitor = desk.getByRole("button", { name: "The monitor" }),
    whole = desk.getByRole("button", { name: "The whole desk" }),
    original = await settled(page)

  await expect(whole).toHaveAttribute("aria-pressed", "true")
  await monitor.click()
  await expect(monitor).toHaveAttribute("aria-pressed", "true")
  await expect(whole).toHaveAttribute("aria-pressed", "false")
  await expect(desk).toBeFocused()

  await expect
    .poll(async function () {
      const moved = await scene(page)

      return moved.equals(original)
    }, SLOW_WAIT)
    .toBe(false)

  await whole.click()

  await expect
    .poll(async function () {
      const returned = await scene(page)

      return returned.equals(original)
    }, SLOW_WAIT)
    .toBe(true)
})

test("the monitor and the drive answer the pointer, and a turn begun on one leaves its view", async function ({
  page
}) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await stand(page)

  const desk = page.locator("colophon-cpc-desk"),
    canvas = desk.locator("canvas"),
    monitor = desk.getByRole("button", { name: "The monitor" }),
    drive = desk.getByRole("button", { name: "The disc drive" }),
    glass = await pointAt(page, GLASS),
    slot = await pointAt(page, DRIVE),
    beside = await pointAt(page, BESIDE)

  await page.mouse.move(slot.x, slot.y)
  await expect(canvas).toHaveAttribute("data-answers")
  await expect(drive).toHaveAttribute("data-pointed")

  await page.mouse.move(glass.x, glass.y)
  await expect(monitor).toHaveAttribute("data-pointed")
  await expect(drive).not.toHaveAttribute("data-pointed")

  await page.mouse.move(beside.x, beside.y)
  await expect(canvas).not.toHaveAttribute("data-answers")
  await expect(monitor).not.toHaveAttribute("data-pointed")

  await page.mouse.click(glass.x, glass.y)
  await expect(monitor).toHaveAttribute("aria-pressed", "true")

  await drag(page, glass, { x: 60, y: 0 })
  const pressed = desk.locator("button[aria-pressed='true']")

  await expect(pressed).toHaveCount(0)
})

test("the eye turns and backs away no further than its bounds", async function ({ page }) {
  await stand(page)

  const middle = await pointAt(page, MIDDLE),
    turn = { x: 200, y: -100 },
    original = await settled(page)

  await drag(page, middle, turn)
  await page.mouse.wheel(0, 5000)

  const bounded = await settled(page),
    moved = !bounded.equals(original)

  expect(moved).toBe(true)

  await drag(page, middle, turn)
  await page.mouse.wheel(0, 5000)

  const further = await settled(page),
    stopped = further.equals(bounded)

  expect(stopped).toBe(true)
})

test("a view chosen while the eye still glides is reached exactly", async function ({ page }) {
  await stand(page)

  const desk = page.locator("colophon-cpc-desk"),
    whole = desk.getByRole("button", { name: "The whole desk" }),
    middle = await pointAt(page, MIDDLE),
    original = await settled(page)

  await drag(page, middle, { x: 60, y: 0 })
  await expect(whole).toHaveAttribute("aria-pressed", "false")
  await whole.click()

  await expect
    .poll(async function () {
      const returned = await scene(page)

      return returned.equals(original)
    }, SLOW_WAIT)
    .toBe(true)
})

test("a view chosen while a pointer still holds the eye is reached", async function ({ page }) {
  const errors = []

  page.on("pageerror", error => errors.push(error.message))
  await stand(page)

  const whole = page.getByRole("button", { name: "The whole desk" }),
    middle = await pointAt(page, MIDDLE),
    original = await settled(page)

  await page.mouse.move(middle.x, middle.y)
  await page.mouse.down()
  await page.mouse.move(middle.x + 40, middle.y, { steps: 4 })
  await whole.focus()
  await page.keyboard.press("Enter")
  await page.mouse.up()

  await expect
    .poll(async function () {
      const returned = await scene(page)

      return returned.equals(original)
    }, SLOW_WAIT)
    .toBe(true)

  expect(errors).toEqual([])
})

test("motion reduced while the desk stands stops a released turn at once", async function ({
  page
}) {
  await stand(page)
  await settled(page)
  await page.emulateMedia({ reducedMotion: "reduce" })

  const middle = await pointAt(page, MIDDLE)

  await drag(page, middle, { x: -30, y: 0 })

  const released = await scene(page),
    later = await scene(page),
    still = later.equals(released)

  expect(still).toBe(true)
})

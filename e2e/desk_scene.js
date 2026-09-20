import { expect } from "@playwright/test"

const SCENE_ONLY = {
  fullPage: true,
  style: `colophon-cpc-desk { outline: none !important; }
    colophon-cpc-desk > :not(canvas) { visibility: hidden; }`
}

// Where frames are slow the desk takes seconds to stand and a picture seconds
// to take, so a wait on either allows this long.
const SLOW_WAIT = { timeout: 30000 }

// Where the drive's face stands on the canvas in the whole desk's view, as a fraction of its size.
const DRIVE = { x: 0.8, y: 0.645 }

async function stand(page) {
  const options = page.locator("colophon-options")

  await page.setViewportSize({ width: 480, height: 360 })
  await page.goto("/")
  await expect(options).toBeVisible(SLOW_WAIT)
}

function scene(page) {
  return page.screenshot(SCENE_ONLY)
}

// The machine goes on drawing its prompt after the desk stands, for longer
// where frames are slow: each runs at most 80 ms of the machine's time.
async function settled(page) {
  let previous = null

  await expect
    .poll(async function () {
      const current = await scene(page),
        still = previous != null && current.equals(previous)

      previous = current

      return still
    }, SLOW_WAIT)
    .toBe(true)

  return previous
}

// A page with nothing on it: the desk fetches a firmware of its own as it
// loads, which would race the routes and the machines a test sets up itself.
async function blank(page) {
  await page.route("**/machine-test", function (route) {
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html></html>" })
  })

  await page.goto("/machine-test")
}

async function pointAt(page, { x, y }) {
  const box = await page.locator("colophon-cpc-desk canvas").boundingBox()

  return { x: box.x + box.width * x, y: box.y + box.height * y }
}

export { DRIVE, SLOW_WAIT, blank, pointAt, scene, settled, stand }

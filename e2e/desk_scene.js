import { expect } from "@playwright/test"

const DESK = ":is(colophon-cpc-desk, colophon-spectrum-desk)"

const SCENE_ONLY = {
  fullPage: true,
  style: `${DESK} { outline: none !important; }
    ${DESK} > :not(canvas) { visibility: hidden; }`
}

// Where frames are slow the desk takes seconds to stand and a picture seconds
// to take, so a wait on either allows this long.
const SLOW_WAIT = { timeout: 30000 }

// Where the drive's face stands on the canvas in the whole desk's view, as a fraction of its size.
const DRIVE = { x: 0.8, y: 0.645 }

async function stand(page, path = "/") {
  const options = page.locator("colophon-options")

  await page.setViewportSize({ width: 480, height: 360 })
  await page.goto(path)
  await expect(options).toBeVisible(SLOW_WAIT)
}

function scene(page) {
  return page.screenshot(SCENE_ONLY)
}

// The machine goes on drawing its prompt after the desk stands, for longer
// where frames are slow: each runs at most 80 ms of the machine's time.
async function settled(page, wait = SLOW_WAIT) {
  let previous = null

  await expect
    .poll(async function () {
      const current = await scene(page),
        still = previous != null && current.equals(previous)

      previous = current

      return still
    }, wait)
    .toBe(true)

  return previous
}

// Nothing on any machine moves on its own at its prompt, so a picture that
// changed has been typed on.
async function expectTyped(page, path) {
  const desk = page.locator(DESK)

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

// Whether a CONTROL chord typed on the desk was left for the page's own
// shortcut: dispatchEvent answers false once a listener has taken the default.
function chordLeftToThePage(desk, code) {
  return desk.evaluate(function (element, typed) {
    const chord = { code: typed, ctrlKey: true, bubbles: true, cancelable: true },
      down = new KeyboardEvent("keydown", chord),
      up = new KeyboardEvent("keyup", chord),
      left = element.dispatchEvent(down)

    element.dispatchEvent(up)

    return left
  }, code)
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
  const box = await page.locator(`${DESK} canvas`).boundingBox()

  return { x: box.x + box.width * x, y: box.y + box.height * y }
}

export { DRIVE, SLOW_WAIT, blank, chordLeftToThePage, expectTyped, pointAt, scene, settled, stand }

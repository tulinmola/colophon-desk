import { expect, test } from "@playwright/test"
import { resolve } from "node:path"

const FIRMWARE = "/js/emulator/firmware.js",
  PROBE = resolve(import.meta.dirname, "picture_probe.js")

const CPC6128_BYTES = 0x8000,
  PART_BYTES = 0x4000

// Two hardware colour codes far enough apart that no filtering could confuse
// them, and what an eight-bit channel may lose crossing sRGB and back.
const TOP_CODE = 26,
  BOTTOM_CODE = 4,
  ROUNDING = 3

// The desk fetches a firmware of its own as it loads, which would race the
// routes below, so these stand on a page with nothing else on it.
async function blank(page) {
  await page.route("**/machine-test", function (route) {
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html></html>" })
  })

  await page.goto("/machine-test")
}

function fetchImage(page, name) {
  return page.evaluate(
    async function ([url, image]) {
      const { default: fetchFirmware } = await import(url)

      try {
        const bytes = await fetchFirmware(image)

        return { length: bytes.length }
      } catch (problem) {
        return { refused: problem.message }
      }
    },
    [FIRMWARE, name]
  )
}

test("an image that is not what it is pinned to is refused", async function ({ page }) {
  await blank(page)
  await page.route("**/*.rom", function (route) {
    return route.fulfill({ body: Buffer.alloc(PART_BYTES) })
  })

  const answer = await fetchImage(page, "cpc6128es")

  expect(answer.refused).toContain("is pinned to")
})

test("an image once fetched is kept, and answers when its sources do not", async function ({
  page
}) {
  await blank(page)

  const fetched = await fetchImage(page, "cpc6128es")

  await page.route("**/*.rom", function (route) {
    return route.abort()
  })

  const kept = await fetchImage(page, "cpc6128es")

  expect(fetched.length).toBe(CPC6128_BYTES)
  expect(kept.length).toBe(CPC6128_BYTES)
})

test("a colour code reaches the glass as the Gate Array's own colour, top at the top", async function ({
  page
}) {
  await blank(page)

  const lit = await page.evaluate(
    async function ([url, codes]) {
      const { default: readPicture } = await import(url)

      return readPicture(...codes)
    },
    [`/@fs${PROBE}`, [TOP_CODE, BOTTOM_CODE]]
  )

  expect(lit.wantTop).not.toEqual(lit.wantBottom)

  for (let channel = 0; channel < 3; channel++) {
    expect(Math.abs(lit.top[channel] - lit.wantTop[channel])).toBeLessThanOrEqual(ROUNDING)
    expect(Math.abs(lit.bottom[channel] - lit.wantBottom[channel])).toBeLessThanOrEqual(ROUNDING)
  }
})

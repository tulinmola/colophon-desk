import { expect, test } from "@playwright/test"
import { resolve } from "node:path"

const PROBE = resolve(import.meta.dirname, "../perf/screen_probe.js"),
  MATERIAL = resolve(import.meta.dirname, "../src/js/models/screen_material.js")

async function prepare(page) {
  const fixture = `/@fs${PROBE}`

  await page.route("**/screen-test", function (route) {
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html></html>" })
  })
  await page.goto("/screen-test")
  await page.evaluate(async function (url) {
    const { default: createScreen } = await import(url)

    window.screenTest = await createScreen()
  }, fixture)
}

test("a full-screen colour draws once and lights only its own channel", async function ({ page }) {
  await prepare(page)

  const frames = await page.evaluate(async function () {
    const screen = window.screenTest,
      results = []

    for (const colour of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255]
    ]) {
      screen.frame(...colour)

      const result = await screen.render(0.5)

      results.push(result)
    }

    screen.dispose()

    return results
  })

  for (let lit = 0; lit < frames.length; lit++) {
    const result = frames[lit]

    expect(result.draws).toBe(1)
    expect(result.means[lit]).toBeGreaterThan(0.1)

    for (let channel = 0; channel < 3; channel++) {
      const unlit = channel != lit

      if (unlit) {
        expect(result.means[channel]).toBeLessThan(0.005)
      }
    }
  }
})

test("the mask keeps its mean light through zoom, angle and movement", async function ({ page }) {
  await prepare(page)

  const views = await page.evaluate(async function () {
    const screen = window.screenTest,
      results = []

    for (const view of [
      [0.1, 0, 0],
      [0.3, 0, 0],
      [0.6, 0, 0],
      [0.3, 0.8, 0],
      [0.3, 0.8, 0.0003]
    ]) {
      const result = await screen.render(...view)

      results.push(result.means)
    }

    screen.settings.pictureWidth.value = 0.8
    screen.settings.pictureX.value = 0.01

    const movedPicture = await screen.render(0.3, 0.8, 0.0003)

    results.push(movedPicture.means)
    screen.dispose()

    return results
  })

  for (const view of views) {
    for (let channel = 0; channel < 3; channel++) {
      const difference = Math.abs(view[channel] - views[0][channel])

      expect(view[channel]).toBeGreaterThan(0.1)
      expect(difference).toBeLessThan(0.008)
    }
  }
})

test("picture adjustments leave resolved phosphors fixed to the glass", async function ({ page }) {
  await prepare(page)

  const pictures = await page.evaluate(async function () {
    const screen = window.screenTest,
      before = await screen.render(0.03)

    screen.settings.pictureWidth.value = 0.8
    screen.settings.pictureX.value = 0.01

    const after = await screen.render(0.03)

    screen.dispose()

    return { before: before.pixels, after: after.pixels }
  })

  expect(pictures.after).toEqual(pictures.before)

  const red = pictures.before.filter((_value, index) => index % 4 == 0),
    brightest = Math.max(...red),
    darkest = Math.min(...red)

  expect(brightest - darkest).toBeGreaterThan(100)
})

test("horizontal excitation spreads a colour edge without exciting other colours", async function ({
  page
}) {
  await prepare(page)

  const edges = await page.evaluate(async function () {
    const screen = window.screenTest

    screen.frame(0, 255, 0, 512)
    screen.settings.compensation.value = 0
    screen.settings.glow.value = 0
    screen.settings.excitationWidth.value = 0

    const before = await screen.render(0.03)

    screen.settings.excitationWidth.value = 0.4

    const after = await screen.render(0.03),
      left = { before: 0, after: 0 }

    for (let row = 0; row < 64; row++) {
      for (let column = 0; column < 30; column++) {
        const green = (row * 64 + column) * 4 + 1

        left.before += before.pixels[green]
        left.after += after.pixels[green]
      }
    }

    screen.dispose()

    return { left, means: after.means }
  })

  expect(edges.left.after).toBeGreaterThan(edges.left.before + 100)
  expect(edges.means[0]).toBe(0)
  expect(edges.means[2]).toBe(0)
})

test("picture glow fills phosphor gaps while preserving average light", async function ({ page }) {
  await prepare(page)

  const glow = await page.evaluate(async function () {
    const screen = window.screenTest

    screen.frame(0, 255, 0)
    screen.settings.compensation.value = 0
    screen.settings.glow.value = 0

    const before = await screen.render(0.03)

    screen.settings.glow.value = 0.5
    screen.settings.glowRadius.value = 0.1

    const after = await screen.render(0.03)
    let filled = 0

    for (let index = 1; index < before.pixels.length; index += 4) {
      const newlyLit = before.pixels[index] == 0 && after.pixels[index] > 2

      if (newlyLit) {
        filled++
      }
    }

    screen.dispose()

    return { filled, before: before.means[1], after: after.means[1] }
  })

  const difference = Math.abs(glow.after - glow.before)

  expect(glow.filled).toBeGreaterThan(100)
  expect(difference).toBeLessThan(0.01)
})

test("brightness compensation keeps uniform light stable across pattern widths and distance", async function ({
  page
}) {
  await prepare(page)

  const measured = await page.evaluate(async function () {
    const screen = window.screenTest,
      level = screen.settings.light.value,
      means = []

    for (const [width, pitch, distance] of [
      [0.2, 0.4, 0.3],
      [0.45, 1.2, 0.3],
      [0.3, 0.54, 0.03]
    ]) {
      screen.settings.scanlineWidth.value = width
      screen.settings.phosphorPitch.value = pitch

      const result = await screen.render(distance)

      means.push(result.means)
    }

    screen.dispose()

    return { level, means }
  })

  for (const channels of measured.means) {
    for (const light of channels) {
      const fromLevel = Math.abs(light - measured.level),
        fromFirst = Math.abs(light - measured.means[0][0])

      expect(fromLevel).toBeLessThan(0.05)
      expect(fromFirst).toBeLessThan(0.025)
    }
  }
})

test("picture glow crosses a source edge while distant black stays black", async function ({
  page
}) {
  await prepare(page)

  const result = await page.evaluate(async function () {
    const screen = window.screenTest

    screen.frame(0, 255, 0, 512)
    screen.settings.excitationWidth.value = 0
    screen.settings.compensation.value = 0
    screen.settings.glow.value = 0

    const before = await screen.render(0.03)

    screen.settings.glow.value = 0.8
    screen.settings.glowRadius.value = 0.5

    const after = await screen.render(0.03),
      sums = { before: 0, after: 0, far: 0 }

    for (let row = 0; row < 64; row++) {
      for (let column = 0; column < 30; column++) {
        const index = (row * 64 + column) * 4 + 1,
          distant = column < 10

        sums.before += before.pixels[index]
        sums.after += after.pixels[index]

        if (distant) {
          sums.far += after.pixels[index]
        }
      }
    }

    screen.dispose()

    return { sums, means: after.means }
  })

  expect(result.sums.after).toBeGreaterThan(result.sums.before + 100)
  expect(result.sums.far).toBe(0)
  expect(result.means[0]).toBe(0)
  expect(result.means[2]).toBe(0)
})

test("a disposed material leaves the picture it shared still drawable", async function ({ page }) {
  await prepare(page)

  const result = await page.evaluate(async function (url) {
    const { default: ScreenMaterial } = await import(url),
      screen = window.screenTest,
      other = new ScreenMaterial(screen.geometry, screen.picture),
      before = await screen.render(0.3)
    let disposals = 0

    screen.picture.addEventListener("dispose", function () {
      disposals++
    })
    other.dispose()

    const after = await screen.render(0.3),
      whileShared = disposals

    screen.dispose()

    return { before: before.pixels, after: after.pixels, whileShared, afterRelease: disposals }
  }, `/@fs${MATERIAL}`)

  expect(result.after).toEqual(result.before)
  expect(result.whileShared).toBe(0)
  expect(result.afterRelease).toBe(1)
})

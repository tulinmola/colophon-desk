import { expect, test } from "@playwright/test"
import { stand } from "./desk_scene.js"

test("the options turn the tube and put it back", async function ({ page }) {
  const errors = []

  page.on("pageerror", error => errors.push(error.message))
  page.on("console", function (message) {
    const failed = message.type() == "error"

    if (failed) {
      const text = message.text()

      errors.push(text)
    }
  })

  await page.setViewportSize({ width: 480, height: 360 })
  await page.goto("/")

  const controls = page.locator("colophon-options"),
    capture = { style: "colophon-options { visibility: hidden; }" }

  await expect(controls).toBeVisible()
  await controls.getByRole("button", { name: "Options" }).click()

  const original = await page.screenshot(capture)

  await controls.locator('[name="pictureWidth"]').fill("0.8")

  await expect
    .poll(async function () {
      const adjusted = await page.screenshot(capture)

      return adjusted.equals(original)
    })
    .toBe(false)

  await controls.getByRole("button", { name: "Reset" }).click()

  await expect
    .poll(async function () {
      const restored = await page.screenshot(capture)

      return restored.equals(original)
    })
    .toBe(true)

  await controls.locator('[name="enabled"]').uncheck()

  await expect
    .poll(async function () {
      const plain = await page.screenshot(capture)

      return plain.equals(original)
    })
    .toBe(false)

  const excitation = controls.locator('[name="excitationWidth"]'),
    glow = controls.locator('[name="glow"]'),
    enabled = controls.locator('[name="enabled"]'),
    initialExcitation = await excitation.inputValue(),
    initialGlow = await glow.inputValue()

  await controls.getByRole("button", { name: "Direct phosphor light" }).click()
  await expect(excitation).toHaveValue("0")
  await expect(glow).toHaveValue("0")
  await expect(enabled).toBeChecked()
  await controls.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(excitation).toHaveValue(initialExcitation)
  await expect(glow).toHaveValue(initialGlow)

  expect(errors).toEqual([])
})

test("a green tube offers no mask to turn, and a colour tube no black level", async function ({
  page
}) {
  const controls = page.locator("colophon-options"),
    mask = controls.locator('[name="phosphorPitch"], [name="slotPitch"]'),
    blackLevel = controls.locator('[name="blackLevel"]')

  await stand(page, "/cpc464.html")
  await expect(mask).toHaveCount(0)
  await expect(blackLevel).toHaveCount(1)

  await stand(page, "/")
  await expect(mask).toHaveCount(2)
  await expect(blackLevel).toHaveCount(0)
})

test("a television offers its grille to turn, and no slots", async function ({ page }) {
  const controls = page.locator("colophon-options"),
    slots = controls.locator('[name="phosphorPitch"], [name="slotPitch"]'),
    grille = controls.locator('[name="grillePitch"]')

  await stand(page, "/spectrum48.html")
  await expect(grille).toHaveCount(1)
  await expect(slots).toHaveCount(0)

  await stand(page, "/")
  await expect(grille).toHaveCount(0)
})

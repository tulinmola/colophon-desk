import { NeutralToneMapping, WebGPURenderer } from "three/webgpu"
import COMPUTERS from "../computers"
import Element from "./element"
import { LineUp } from "../models"
import html from "../html"

function itemOf({ name, title, maker, year, features }) {
  const listed = features.map(feature => html`<li>${feature}</li>`).join("")

  return html`<li data-computer="${name}">
    <button type="button" aria-pressed="false" aria-describedby="${name}-features">
      <span class="frame"></span>
      <span class="name">${title}</span>
      <span class="made">${maker} · ${year}</span>
    </button>
    <ul id="${name}-features">
      ${listed}
    </ul>
  </li>`
}

const ITEMS = COMPUTERS.map(itemOf).join(""),
  LIST = html`<ol aria-label="Computers, in the order they came out" hidden>
    ${ITEMS}
  </ol>`

class LineUpElement extends Element {
  #chosen
  #drawing
  #focused
  #hovered
  #initialising
  #lineUp
  #list
  #observer
  #onFrame
  #renderer
  #standing

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      lineUp = new LineUp(),
      resized = this.onResized.bind(this),
      { signal } = this

    renderer.setPixelRatio(devicePixelRatio)
    renderer.toneMapping = NeutralToneMapping
    this.innerHTML = LIST
    this.prepend(renderer.domElement)

    for (const button of this.querySelectorAll("button")) {
      const { computer } = button.closest("li").dataset

      button.addEventListener("pointerenter", () => this.onPointerEnter(computer), { signal })
      button.addEventListener("pointerleave", () => this.onPointerLeave(computer), { signal })
      button.addEventListener("focus", () => this.onFocus(computer), { signal })
      button.addEventListener("blur", () => this.onBlur(computer), { signal })
      button.addEventListener("click", () => this.onChosen(computer), { signal })
    }

    this.#chosen = null
    this.#drawing = false
    this.#focused = null
    this.#hovered = null
    this.#lineUp = lineUp
    this.#list = this.querySelector("ol")
    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)
    this.#onFrame = this.onFrame.bind(this)
    this.#renderer = renderer
    this.#standing = false
    this.#initialising = this.#load(lineUp, renderer, signal)
  }

  async #load(lineUp, renderer, signal) {
    await renderer.init()

    const names = COMPUTERS.map(computer => computer.name)

    await lineUp.load(names, renderer)

    const standing = !signal.aborted

    if (standing) {
      const spans = []

      for (const item of this.#list.children) {
        const { span, aspect } = lineUp.frameOf(item.dataset.computer)

        item.style.setProperty("--span", span)
        item.style.setProperty("--aspect", aspect)
        spans.push(span)
      }

      const widest = Math.max(...spans)

      this.#list.style.setProperty("--widest", widest)
      this.#list.hidden = false
      this.#standing = true
      this.#draw()
    }

    return lineUp
  }

  onPointerEnter(computer) {
    this.#hovered = computer
    this.#show()
  }

  onPointerLeave(computer) {
    const leaving = this.#hovered == computer

    if (leaving) {
      this.#hovered = null
      this.#show()
    }
  }

  onFocus(computer) {
    this.#focused = computer
    this.#show()
  }

  onBlur(computer) {
    const leaving = this.#focused == computer

    if (leaving) {
      this.#focused = null
      this.#show()
    }
  }

  onChosen(computer) {
    this.#chosen = computer

    for (const item of this.#list.children) {
      const button = item.querySelector("button"),
        pressed = String(item.dataset.computer == computer)

      button.setAttribute("aria-pressed", pressed)
    }

    this.#show()
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height)
    this.#draw()
  }

  onFrame(now) {
    const moving = this.#lineUp.advance(now)

    this.#render()

    if (!moving) {
      this.#renderer.setAnimationLoop(null)
      this.#drawing = false
    }
  }

  #show() {
    const shown = this.#hovered ?? this.#focused ?? this.#chosen

    this.#lineUp.show(shown)
    this.#draw()
  }

  #draw() {
    const idle = this.#standing && !this.#drawing

    if (idle) {
      this.#drawing = true
      this.#renderer.setAnimationLoop(this.#onFrame)
    }
  }

  #render() {
    const origin = this.getBoundingClientRect(),
      frames = Array.from(this.#list.children, function (item) {
        const frame = item.querySelector(".frame"),
          { left, top, width, height } = frame.getBoundingClientRect()

        return {
          name: item.dataset.computer,
          left: left - origin.left,
          top: top - origin.top,
          width,
          height
        }
      })

    this.#lineUp.render(this.#renderer, frames)
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#observer.disconnect()
    this.#release(renderer)
    renderer.domElement.remove()
    this.#list.remove()
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const lineUp = await this.#initialising

      lineUp.dispose()
    } catch {
      // Reported there; catching it here only keeps it from being told twice.
    } finally {
      renderer.dispose()
    }
  }
}

LineUpElement.define("colophon-line-up")

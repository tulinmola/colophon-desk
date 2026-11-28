import { Desk, Studio, drawViews } from "../models"
import { NeutralToneMapping, PerspectiveCamera, WebGPURenderer } from "three/webgpu"
import Element from "./element"

// Each piece is asked for by the attribute naming its kind, of the kinds a
// desk that runs takes.
const KINDS = ["monitor", "recorder"]

// A desk asked for no language is lettered and started up in English, the
// models' own.
const ENGLISH = "en"

// A desk standing on a page of its own, on a canvas the size of the element:
// the computer, and each piece it is given, by their models' names.
class DeskElement extends Element {
  #camera = new PerspectiveCamera()
  #canvas
  #loading
  #observer
  #renderer

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      resized = this.onResized.bind(this)

    renderer.setPixelRatio(devicePixelRatio)
    renderer.toneMapping = NeutralToneMapping
    renderer.autoClear = false
    this.prepend(canvas)
    this.#canvas = canvas
    this.#renderer = renderer
    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(canvas)
    this.#loading = this.#load()
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#observer.disconnect()
    this.replaceChildren()
    this.#release(renderer)
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height, false)
  }

  async #load() {
    const renderer = this.#renderer,
      { signal } = this

    await renderer.init()

    const studio = new Studio(renderer),
      desk = new Desk(),
      anisotropy = renderer.getMaxAnisotropy(),
      asked = {
        computer: this.getAttribute("computer"),
        language: this.getAttribute("language") ?? ENGLISH,
        pieces: this.#piecesAsked()
      },
      options = { anisotropy, studio, signal },
      standing = { desk, studio }

    try {
      await desk.load(asked, options)
    } catch (problem) {
      studio.dispose()
      throw problem
    }

    const laidAway = signal.aborted

    if (laidAway) {
      return standing
    }

    const controls = document.createElement("colophon-desk-controls"),
      optionsPanel = document.createElement("colophon-options")

    this.append(controls, optionsPanel)
    controls.use(desk)
    optionsPanel.use(desk)
    renderer.setAnimationLoop(now => this.#frame(desk, now))

    return standing
  }

  #piecesAsked() {
    const pieces = {}

    for (const kind of KINDS) {
      const name = this.getAttribute(kind),
        asked = name != null

      if (asked) {
        pieces[kind] = name
      }
    }

    return pieces
  }

  #frame(desk, now) {
    const { clientWidth: width, clientHeight: height } = this.#canvas,
      canvas = { width, height },
      frame = { left: 0, top: 0, width, height }

    desk.advance(now)

    const views = desk.views(() => frame)

    drawViews(this.#renderer, this.#camera, views, canvas)
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const { desk, studio } = await this.#loading

      desk.dispose()
      studio.dispose()
    } catch {
      // Reported there; catching it here only keeps it from being told twice.
    } finally {
      renderer.dispose()
    }
  }
}

DeskElement.define("colophon-desk")

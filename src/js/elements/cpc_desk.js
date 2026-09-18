import { Cpc, KEY_MATRIX } from "../emulator"
import { Desk } from "../models"
import Element from "./element"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { WebGPURenderer } from "three/webgpu"

class CpcDeskElement extends Element {
  #camera
  #controls
  #cpc = null
  #heldByCode = new Map()
  #initialising
  #observer
  #renderer

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      desk = new Desk(),
      camera = desk.camera,
      controls = new OrbitControls(camera, renderer.domElement)

    controls.target.copy(desk.target)
    controls.update()

    renderer.setPixelRatio(devicePixelRatio)
    this.append(renderer.domElement)

    this.#camera = camera
    this.#controls = controls
    this.#renderer = renderer

    const resized = this.onResized.bind(this),
      { signal } = this

    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)

    this.addEventListener("keydown", this.onKeyDown.bind(this), { signal })
    this.addEventListener("keyup", this.onKeyUp.bind(this), { signal })
    this.addEventListener("blur", this.onBlur.bind(this), { signal })

    this.#initialising = this.#load(desk, renderer, signal)
  }

  onKeyDown(event) {
    const keys = this.#takeKeys(event)

    if (!keys) {
      return
    }

    this.#heldByCode.set(event.code, keys)

    for (const key of keys) {
      this.#cpc.pressKey(key)
    }
  }

  // A release is never withheld. A key let go of while a modifier happens to
  // be down is still let go of, and a press left standing repeats for ever.
  onKeyUp(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      known = standing && Boolean(keys)

    if (!known) {
      return
    }

    const wasHeld = this.#heldByCode.delete(event.code)

    if (wasHeld) {
      this.#letGo(keys)
    }
  }

  onBlur() {
    const standing = this.#cpc != null

    if (standing) {
      this.#heldByCode.clear()
      this.#cpc.releaseAllKeys()
    }
  }

  // A switch two browser keys close is still closed while either is down:
  // SHIFT and CONTROL are each one position under two keys.
  #letGo(keys) {
    const stillHeld = new Set()

    for (const held of this.#heldByCode.values()) {
      for (const key of held) {
        stillHeld.add(key)
      }
    }

    for (const key of keys) {
      if (!stillHeld.has(key)) {
        this.#cpc.releaseKey(key)
      }
    }
  }

  #takeKeys(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      systemChord = event.metaKey || event.altKey,
      // The options panel stands inside this element, and a slider being
      // turned with the arrow keys is not the machine's keyboard.
      onTheDesk = event.target == this,
      reaches = standing && onTheDesk && Boolean(keys) && !systemChord

    if (!reaches) {
      return null
    }

    // CONTROL is a key this machine reads, so a chord holding it is sent on
    // with the page's own default left alone.
    const heldWithControl = event.ctrlKey

    if (!heldWithControl) {
      event.preventDefault()
    }

    return keys
  }

  async #load(desk, renderer, signal) {
    await renderer.init()

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      cpc = await Cpc.create(signal, anisotropy)

    await desk.load(anisotropy, cpc)
    desk.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        object.material.wireframe = wireframe
      }
    })

    const standing = !signal.aborted

    if (standing) {
      const options = this.querySelector("colophon-options")

      this.#cpc = cpc
      options.use(desk.settings)
      renderer.setAnimationLoop(function (now) {
        cpc.advance(now)
        renderer.render(desk.scene, desk.camera)
      })
    }

    return { cpc, desk }
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#cpc = null
    this.#observer.disconnect()
    this.#controls.dispose()
    this.#release(renderer)
    renderer.domElement.remove()
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const { cpc, desk } = await this.#initialising

      cpc.dispose()
      desk.dispose()
    } catch {
      // Reported there; catching it here only keeps it from being told twice.
    } finally {
      renderer.dispose()
    }
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height)
    this.#camera.aspect = width / height
    this.#camera.updateProjectionMatrix()
  }
}

CpcDeskElement.define("colophon-cpc-desk")

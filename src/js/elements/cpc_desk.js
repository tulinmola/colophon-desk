import { Cpc } from "../emulator"
import { Desk } from "../models"
import Element from "./element"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { WebGPURenderer } from "three/webgpu"

class CpcDeskElement extends Element {
  #camera
  #controls
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

    const resized = this.onResized.bind(this)

    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)

    this.#initialising = this.#load(desk, renderer, this.signal)
  }

  async #load(desk, renderer, signal) {
    await renderer.init()

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      cpc = await Cpc.create(signal, anisotropy)

    await desk.load(anisotropy, cpc.picture)
    desk.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        object.material.wireframe = wireframe
      }
    })

    const standing = !signal.aborted

    if (standing) {
      const options = this.querySelector("colophon-options")

      options.use(desk.screen.settings)
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

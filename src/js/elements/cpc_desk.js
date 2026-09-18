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
      anisotropy = renderer.getMaxAnisotropy()

    await desk.load(anisotropy)
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
      renderer.setAnimationLoop(() => renderer.render(desk.scene, desk.camera))
    }

    return desk
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#observer.disconnect()
    this.#controls.dispose()
    this.#initialising.then(function (desk) {
      desk.dispose()

      renderer.dispose()
    })
    renderer.domElement.remove()
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height)
    this.#camera.aspect = width / height
    this.#camera.updateProjectionMatrix()
  }
}

CpcDeskElement.define("colophon-cpc-desk")

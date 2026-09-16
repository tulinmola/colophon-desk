import {
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGPURenderer
} from "three/webgpu"
import { Element } from "./element"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { loadModel } from "../models"

const CPC6128_URL = new URL("../../assets/models/cpc6128.glb", import.meta.url)

const LANGUAGE = "es"

const FIELD_OF_VIEW = 35,
  NEAREST = 0.01,
  FARTHEST = 5

const EYE = [-0.45, 0.35, 0.65],
  TARGET = [0, 0.02, 0]

const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  INTENSITY = 2

class CpcDeskElement extends Element {
  #camera
  #controls
  #initialising
  #observer
  #renderer

  async init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAREST, FARTHEST),
      controls = new OrbitControls(camera, renderer.domElement),
      sky = new HemisphereLight(SKY, GROUND, INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, INTENSITY),
      scene = new Scene()

    camera.position.set(...EYE)
    controls.target.set(...TARGET)
    controls.update()
    sun.position.set(...SUN)
    scene.add(sky, sun)

    renderer.setPixelRatio(devicePixelRatio)
    this.append(renderer.domElement)

    this.#camera = camera
    this.#controls = controls
    this.#renderer = renderer

    const resized = this.onResized.bind(this)

    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)

    renderer.setAnimationLoop(() => renderer.render(scene, camera))

    this.#initialising = renderer.init()
    await this.#initialising

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      model = await loadModel(CPC6128_URL, LANGUAGE, anisotropy)

    model.traverse(function (object) {
      if (object.isMesh) {
        object.material.wireframe = wireframe
      }
    })

    scene.add(model)
  }

  dispose() {
    const renderer = this.#renderer

    this.#observer.disconnect()
    this.#controls.dispose()
    this.#initialising.then(() => renderer.dispose())
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

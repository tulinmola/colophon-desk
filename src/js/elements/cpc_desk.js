import {
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGPURenderer
} from "three/webgpu"
import { loadModel, showPicture } from "../models"
import { Element } from "./element"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const CPC6128_URL = new URL("../../assets/models/cpc6128.glb", import.meta.url),
  CTM644_URL = new URL("../../assets/models/ctm644.glb", import.meta.url)

// A frame the machine drew itself, taken with the emulator standing beside this one: `emulator boot --machine cpc6128 --roms ROMS --full-raster --screenshot PATH`, on the Spanish firmware, Amstrad part 40038, SHA-256 49c5b2da99bf3230dec3e4bfbb136609ae5f8d250d8920be0ebda1e5a256f88a, fetched for the capture and never kept here.
const READY_URL = new URL("../../assets/screens/es/cpc6128-ready.png", import.meta.url)

const LANGUAGE = "es"

const FIELD_OF_VIEW = 35,
  NEAREST = 0.01,
  FARTHEST = 5

const EYE = [-0.6, 0.45, 0.85],
  TARGET = [0, 0.12, -0.12]

// The machine is 170 deep and the monitor 365 [A], and 30 is taken between the machine's rear edge and the monitor's face, which sets their middles 0.2975 apart [E].
const MONITOR_BEHIND = -0.2975

const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  SKY_INTENSITY = 0.5,
  SUN_INTENSITY = 1.6

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
      sky = new HemisphereLight(SKY, GROUND, SKY_INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, SUN_INTENSITY),
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
      loading = [
        loadModel(CPC6128_URL, LANGUAGE, anisotropy),
        loadModel(CTM644_URL, LANGUAGE, anisotropy)
      ],
      [machine, monitor] = await Promise.all(loading)

    await showPicture(monitor, READY_URL, anisotropy)

    monitor.position.z = MONITOR_BEHIND

    for (const model of [machine, monitor]) {
      model.traverse(function (object) {
        if (object.isMesh) {
          object.material.wireframe = wireframe
        }
      })
    }

    scene.add(machine, monitor)
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

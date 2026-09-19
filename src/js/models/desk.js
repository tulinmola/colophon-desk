import { DirectionalLight, HemisphereLight, Scene } from "three/webgpu"
import loadModel from "./load_model"
import showPicture from "./show_picture"

const CPC6128_URL = new URL("../../assets/models/cpc6128.glb", import.meta.url),
  CTM644_URL = new URL("../../assets/models/ctm644.glb", import.meta.url)

const LANGUAGE = "es"

// Depths 170 mm and 365 mm [A], CPC6128 Service Manual technical specifications: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const MACHINE_DEPTH = 170,
  MONITOR_DEPTH = 365

// Half each depth plus a chosen 30 mm gap gives 297.5 mm between centres [E]; the gap is an arrangement choice, not a measurement.
const GAP = 30,
  MONITOR_BEHIND = -(MACHINE_DEPTH / 2 + MONITOR_DEPTH / 2 + GAP) / 1000

// Light levels are presentation choices, not measurements of the machine.
const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  SKY_INTENSITY = 0.5,
  SUN_INTENSITY = 1.6

export default class Desk {
  machine = null
  monitor = null
  scene = new Scene()
  settings
  #textures = []

  constructor() {
    const sky = new HemisphereLight(SKY, GROUND, SKY_INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, SUN_INTENSITY)

    sun.position.set(...SUN)
    this.scene.add(sky, sun)
  }

  async load(anisotropy, { picture, keys }) {
    const loading = [
        loadModel(CPC6128_URL, LANGUAGE, anisotropy, keys),
        loadModel(CTM644_URL, LANGUAGE, anisotropy, keys)
      ],
      [machine, monitor] = await Promise.all(loading)

    const screen = showPicture(monitor.model, picture)

    this.settings = { ...screen.settings, ...machine.keyboard }
    monitor.model.position.z = MONITOR_BEHIND
    this.machine = machine.model
    this.monitor = monitor.model
    this.#textures = [...machine.textures, ...monitor.textures]
    this.scene.add(machine.model, monitor.model)
  }

  dispose() {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(this.#textures)

    for (const model of [this.machine, this.monitor]) {
      model.traverse(function (object) {
        const drawn = object.isMesh

        if (drawn) {
          geometries.add(object.geometry)
          materials.add(object.material)
        }
      })
    }

    for (const material of materials) {
      const mapped = Boolean(material.map)

      if (mapped) {
        textures.add(material.map)
      }
    }

    for (const geometry of geometries) {
      geometry.dispose()
    }

    for (const texture of textures) {
      texture.dispose()
    }

    for (const material of materials) {
      material.dispose()
    }
  }
}

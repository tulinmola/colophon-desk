import {
  Box3,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3
} from "three/webgpu"
import loadModel from "./load_model"
import showPicture from "./show_picture"

const CPC6128_URL = new URL("../../assets/models/cpc6128.glb", import.meta.url),
  CTM644_URL = new URL("../../assets/models/ctm644.glb", import.meta.url),
  CF2_URL = new URL("../../assets/models/cf2.glb", import.meta.url)

const LANGUAGE = "es"

// Camera and light levels are presentation choices, not measurements of the machine.
const FIELD_OF_VIEW = 35,
  NEAREST = 0.01,
  FARTHEST = 5

const EYE = [-0.6, 0.45, 0.85],
  TARGET = [0, 0.12, -0.12]

// Depths 170 mm and 365 mm [A], CPC6128 Service Manual technical specifications: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const MACHINE_DEPTH = 170,
  MONITOR_DEPTH = 365

// One chosen gap of 30 mm stands between the machines and before the disc: half each depth and the gap give 297.5 mm between the machine's middle and the monitor's, and 115 mm from that middle to the disc's rear [E]. The gap is an arrangement choice, not a measurement.
const GAP = 30,
  MONITOR_BEHIND = -(MACHINE_DEPTH / 2 + MONITOR_DEPTH / 2 + GAP) / 1000,
  DISC_REAR = (MACHINE_DEPTH / 2 + GAP) / 1000

const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  SKY_INTENSITY = 0.5,
  SUN_INTENSITY = 1.6

export default class Desk {
  camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAREST, FARTHEST)
  scene = new Scene()
  target = new Vector3(...TARGET)
  settings
  #models = []
  #textures = []

  constructor() {
    const sky = new HemisphereLight(SKY, GROUND, SKY_INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, SUN_INTENSITY)

    sun.position.set(...SUN)
    this.camera.position.set(...EYE)
    this.scene.add(sky, sun)
  }

  async load(anisotropy, { picture, keys }) {
    const loading = [
        loadModel(CPC6128_URL, LANGUAGE, anisotropy, keys),
        loadModel(CTM644_URL, LANGUAGE, anisotropy, keys),
        loadModel(CF2_URL, LANGUAGE, anisotropy, keys)
      ],
      [machine, monitor, disc] = await Promise.all(loading)

    const screen = showPicture(monitor.model, picture),
      drive = machine.model.getObjectByName("drive"),
      driveBounds = this.#boundsOf(drive),
      discBounds = this.#boundsOf(disc.model),
      driveMiddle = new Vector3()

    driveBounds.getCenter(driveMiddle)
    this.settings = { ...screen.settings, ...machine.keyboard }
    monitor.model.position.z = MONITOR_BEHIND
    disc.model.position.set(driveMiddle.x, 0, DISC_REAR - discBounds.min.z)
    this.#models = [machine.model, monitor.model, disc.model]
    this.#textures = [...machine.textures, ...monitor.textures, ...disc.textures]
    this.scene.add(machine.model, monitor.model, disc.model)
  }

  // A Box3 takes an object's parents' matrices as they last stood, and no frame has been drawn yet.
  #boundsOf(object) {
    const bounds = new Box3()

    object.updateWorldMatrix(true, false)
    bounds.setFromObject(object)

    return bounds
  }

  dispose() {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(this.#textures)

    for (const model of this.#models) {
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

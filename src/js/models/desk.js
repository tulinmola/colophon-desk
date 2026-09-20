import { Box3, DirectionalLight, HemisphereLight, Scene, Vector3 } from "three/webgpu"
import Disc from "./disc"
import { loadHandwriting } from "./handwriting"
import loadModel from "./load_model"
import showPicture from "./show_picture"

const CPC6128_URL = new URL("../../assets/models/cpc6128.glb", import.meta.url),
  CTM644_URL = new URL("../../assets/models/ctm644.glb", import.meta.url),
  CF2_URL = new URL("../../assets/models/cf2.glb", import.meta.url)

const LANGUAGE = "es"

// Depths 170 mm and 365 mm [A], CPC6128 Service Manual technical specifications: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const MACHINE_DEPTH = 170,
  MONITOR_DEPTH = 365

// One chosen gap of 30 mm stands between the machines and before the disc: half each depth and the gap give 297.5 mm between the machine's middle and the monitor's, and 115 mm from that middle to the disc's rear [E]. The gap is an arrangement choice, not a measurement.
const GAP = 30,
  MONITOR_BEHIND = -(MACHINE_DEPTH / 2 + MONITOR_DEPTH / 2 + GAP) / 1000,
  DISC_REAR = (MACHINE_DEPTH / 2 + GAP) / 1000

// No source here gives the colour of a lamp alight, and the lenses were sampled with the machine standing off, so a lamp glowing in its lens's own hue, and how brightly, are both guesses.
const LAMP_GLOW = 1

// Light levels are presentation choices, not measurements of the machine.
const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  SKY_INTENSITY = 0.5,
  SUN_INTENSITY = 1.6

export default class Desk {
  disc = null
  machine = null
  monitor = null
  scene = new Scene()
  settings
  #driveLens
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
        loadModel(CTM644_URL, LANGUAGE, anisotropy, keys),
        loadModel(CF2_URL, LANGUAGE, anisotropy, keys),
        loadHandwriting()
      ],
      [machine, monitor, disc] = await Promise.all(loading)

    const screen = showPicture(monitor.model, picture),
      drive = machine.model.getObjectByName("drive"),
      driveBounds = this.#boundsOf(drive),
      discBounds = this.#boundsOf(disc.model),
      driveMiddle = new Vector3()

    driveBounds.getCenter(driveMiddle)
    this.settings = { ...screen.settings, ...machine.keyboard }
    this.#wireLamps(machine.model)
    monitor.model.position.z = MONITOR_BEHIND
    disc.model.position.set(driveMiddle.x, 0, DISC_REAR - discBounds.min.z)
    this.disc = new Disc(disc.model, drive)
    this.machine = machine.model
    this.monitor = monitor.model
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

  // Both lamps are cut from one material in the model, so the drive's takes a
  // copy of its own before either is lit.
  #wireLamps(machine) {
    const power = machine.getObjectByName("power-lamp"),
      drive = machine.getObjectByName("drive-lamp"),
      lens = drive.material.clone()

    drive.material = lens
    power.material.emissive.copy(power.material.color)
    power.material.emissiveIntensity = LAMP_GLOW
    lens.emissive.copy(lens.color)
    lens.emissiveIntensity = 0
    this.#driveLens = lens
  }

  showDriveInUse(inUse) {
    this.#driveLens.emissiveIntensity = inUse ? LAMP_GLOW : 0
  }

  dispose() {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(this.#textures)

    for (const model of [this.machine, this.monitor, this.disc.model]) {
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

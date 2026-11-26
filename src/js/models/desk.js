import { DirectionalLight, HemisphereLight, Scene, Vector3 } from "three/webgpu"
import Disc from "./disc"
import Model from "./model"
import arrange from "./arrangement"
import boundsOf from "./bounds_of"
import { loadHandwriting } from "./handwriting"

// Depth 170 mm [A], CPC6128 Service Manual technical specifications: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const MACHINE_DEPTH = 170

// One chosen gap of 30 mm stands before the disc: half the depth and the gap give 115 mm from the machine's middle to the disc's rear [E]. The gap is an arrangement choice, not a measurement; the monitor stands behind as every desk is arranged.
const GAP = 30,
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
  #powerLens

  constructor() {
    const sky = new HemisphereLight(SKY, GROUND, SKY_INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, SUN_INTENSITY)

    sun.position.set(...SUN)
    this.scene.add(sky, sun)
  }

  async load({ picture, keys }, { anisotropy, language }) {
    const loading = [
        Model.load("cpc6128", { anisotropy, keys, language }),
        Model.load("ctm644", { anisotropy, language }),
        Model.load("cf2", { anisotropy, language }),
        loadHandwriting()
      ],
      [machine, monitor, disc] = await Promise.all(loading)

    const screen = monitor.showPicture(picture),
      drive = machine.getObjectByName("drive"),
      driveBounds = boundsOf(drive),
      discBounds = boundsOf(disc),
      driveMiddle = new Vector3()

    driveBounds.getCenter(driveMiddle)
    this.settings = { ...screen.settings, ...machine.keyboard }
    this.#wireLamps(machine)
    arrange(machine, { monitor })
    disc.position.set(driveMiddle.x, 0, DISC_REAR - discBounds.min.z)
    this.disc = new Disc(disc, drive)
    this.machine = machine
    this.monitor = monitor
    this.scene.add(machine, monitor, disc)
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
    this.#powerLens = power.material
  }

  showPower(on) {
    this.#powerLens.emissiveIntensity = on ? LAMP_GLOW : 0
  }

  showDriveInUse(inUse) {
    this.#driveLens.emissiveIntensity = inUse ? LAMP_GLOW : 0
  }

  dispose() {
    this.machine.dispose()
    this.monitor.dispose()
    this.disc.dispose()
  }
}

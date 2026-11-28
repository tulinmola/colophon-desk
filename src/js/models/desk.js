import { Box3, Scene, Vector3 } from "three/webgpu"
import CameraRig from "./camera_rig"
import { Cpc } from "../emulator"
import Disc from "./disc"
import GlassTop from "./glass_top"
import Model from "./model"
import { arrange } from "./arrangement"
import boundsOf from "./bounds_of"
import { loadHandwriting } from "./handwriting"

// Depth 170 mm [A], CPC6128 Service Manual technical specifications: https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a
const COMPUTER_DEPTH = 170

// One chosen gap of 30 mm stands before the disc: half the depth and the gap give 115 mm from the computer's middle to the disc's rear [E]. The gap is an arrangement choice, not a measurement; the monitor stands behind as every desk is arranged.
const GAP = 30,
  DISC_REAR = (COMPUTER_DEPTH / 2 + GAP) / 1000

// No source here gives the colour of a lamp alight, and the lenses were sampled with the computer standing off, so a lamp glowing in its lens's own hue, and how brightly, are both guesses.
const LAMP_GLOW = 1

// The computers the desk runs, each with the displays whose glass it draws the
// picture on: the CTM644's colour mask is the only glass drawn yet.
const RUNNING = { cpc6128: ["ctm644"] }

// The desk switched on: the computer running, its picture on the glass, and a
// disc lying before the drive, all seen by a camera the reader turns.
export default class Desk {
  scene = new Scene()
  disc = null
  machine = null
  settings
  #aspect = null
  #computer
  #driveLens
  #glass
  #name
  #pieces = []
  #powerLens
  #rig = new CameraRig()

  static runs(computer, display) {
    const displays = RUNNING[computer] ?? []

    return displays.includes(display)
  }

  // The pieces come by their kind, as monitor or recorder, each named as its
  // model is; the signal, where given, stops the machine's firmware being
  // fetched for a desk no longer wanted.
  async load({ computer, language, pieces }, { anisotropy, studio, signal }) {
    const { monitor } = pieces,
      runs = Desk.runs(computer, monitor),
      named = monitor == null ? "no monitor" : `the ${monitor}`

    if (!runs) {
      throw new Error(`The desk does not run the ${computer} with ${named}`)
    }

    // The computer's keys go down as the machine holds them, so the models
    // wait on the machine, and a machine that never starts loads none.
    const machine = await Cpc.create(signal, { anisotropy, language }),
      kinds = Object.keys(pieces),
      loadingPieces = Object.values(pieces).map(name => Model.load(name, { anisotropy, language })),
      loading = [
        Model.load(computer, { anisotropy, keys: machine.keys, language }),
        Model.load("cf2", { anisotropy, language }),
        Promise.all(loadingPieces),
        loadHandwriting()
      ],
      [model, disc, models] = await Promise.all(loading),
      byKind = {}

    for (const [index, kind] of kinds.entries()) {
      byKind[kind] = models[index]
    }

    const screen = byKind.monitor.showPicture(machine.picture)

    arrange(model, byKind)
    this.#computer = model
    this.machine = machine
    this.settings = { ...screen.settings, ...model.keyboard }
    this.#name = computer
    this.#pieces = models
    this.#wireLamps(model)
    this.#layDisc(model, disc)
    this.scene.add(model, ...models)
    this.#layGlass()
    studio.light(this.scene)
    this.#rig.use({ computer: model, monitor: byKind.monitor, pieces: models })
  }

  get view() {
    return this.#rig.view
  }

  turnFrom(element, moved) {
    this.#rig.turnFrom(element, moved)
  }

  look(view) {
    this.#rig.look(view)
  }

  // The part the pointer is over, at a place given across and up the frame
  // from -1 to 1, and the view it leads to.
  pick(pointer) {
    return this.#rig.pick(pointer)
  }

  // The machine's own power, and the lamp that shows it.
  switchOn() {
    this.machine.switchOn()
    this.#powerLens.emissiveIntensity = LAMP_GLOW
  }

  switchOff() {
    this.machine.switchOff()
    this.#powerLens.emissiveIntensity = 0
  }

  // The machine runs whatever it is owed before its picture is drawn.
  advance(now) {
    const machine = this.machine

    machine.advance(now)
    this.#rig.advance(now)
    this.disc.advance(now)

    const inUse = machine.driveInUse()

    this.#driveLens.emissiveIntensity = inUse ? LAMP_GLOW : 0

    return true
  }

  // The desk in the frame the page gives it, seen from wherever the camera
  // stands.
  views(frameOf) {
    const name = this.#name,
      frame = frameOf(name),
      aspect = frame.width / frame.height,
      reshaped = aspect != this.#aspect

    if (reshaped) {
      this.#aspect = aspect
      this.#rig.fit(aspect)
    }

    const pose = this.#rig.pose()

    return [{ name, pose, frame, scene: this.scene, clipped: false }]
  }

  dispose() {
    this.#rig.dispose()
    this.machine.dispose()
    this.#computer.dispose()
    this.disc.dispose()
    this.#glass.dispose()

    for (const piece of this.#pieces) {
      piece.dispose()
    }
  }

  // Both lamps are cut from one material in the model, so the drive's takes a
  // copy of its own before either is lit.
  #wireLamps(model) {
    const power = model.getObjectByName("power-lamp"),
      drive = model.getObjectByName("drive-lamp"),
      lens = drive.material.clone()

    drive.material = lens
    power.material.emissive.copy(power.material.color)
    power.material.emissiveIntensity = LAMP_GLOW
    lens.emissive.copy(lens.color)
    lens.emissiveIntensity = 0
    this.#driveLens = lens
    this.#powerLens = power.material
  }

  #layDisc(model, disc) {
    const drive = model.getObjectByName("drive"),
      driveBounds = boundsOf(drive),
      discBounds = boundsOf(disc),
      driveMiddle = new Vector3()

    driveBounds.getCenter(driveMiddle)
    disc.position.set(driveMiddle.x, 0, DISC_REAR - discBounds.min.z)
    this.disc = new Disc(disc, drive)
    this.scene.add(disc)
  }

  // The glass lies under the whole of what stands on the desk.
  #layGlass() {
    const whole = new Box3()

    for (const standing of [this.#computer, ...this.#pieces]) {
      const reach = boundsOf(standing)

      whole.union(reach)
    }

    const glass = new GlassTop(whole)

    glass.presence = 1
    this.#glass = glass
    this.scene.add(glass)
  }
}

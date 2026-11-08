import { Box3, DirectionalLight, HemisphereLight, Scene, Vector3 } from "three/webgpu"
import Cassette from "./cassette"
import Datacorder from "./datacorder"
import Disc from "./disc"
import Recorder from "./recorder"
import { loadHandwriting } from "./handwriting"
import loadModel from "./load_model"
import showPicture from "./show_picture"

// Each model's prints are in the language of the units it was drawn from: the
// Spanish CPCs with their monitors and media, the English Spectrum with the
// English television Sinclair stood it before and an English-lettered
// recorder, and the Spanish blank the recorder takes.
const MODELS = {
  cpc6128: { url: new URL("../../assets/models/cpc6128.glb", import.meta.url), language: "es" },
  cpc464: { url: new URL("../../assets/models/cpc464.glb", import.meta.url), language: "es" },
  spectrum48: {
    url: new URL("../../assets/models/spectrum48.glb", import.meta.url),
    language: "en"
  },
  ctm644: { url: new URL("../../assets/models/ctm644.glb", import.meta.url), language: "es" },
  gt64: { url: new URL("../../assets/models/gt64.glb", import.meta.url), language: "es" },
  kv1400: { url: new URL("../../assets/models/kv1400.glb", import.meta.url), language: "en" },
  crc1001: { url: new URL("../../assets/models/crc1001.glb", import.meta.url), language: "en" },
  cf2: { url: new URL("../../assets/models/cf2.glb", import.meta.url), language: "es" },
  ct15: { url: new URL("../../assets/models/ct15.glb", import.meta.url), language: "es" },
  soundOnSoundC15: {
    url: new URL("../../assets/models/sound_on_sound_c15.glb", import.meta.url),
    language: "es"
  }
}

function loadNamed(name, anisotropy, keys) {
  const { url, language } = MODELS[name]

  return loadModel(url, language, anisotropy, keys)
}

// One chosen gap stands between the machine and the monitor behind it, between the machine and the recorder at its right, and between the machine or the recorder and the disc or cassette before it, measured from what each model reaches. The gap is an arrangement choice, not a measurement.
const GAP = 0.03

// No source here gives the colour of a lamp alight, and the lenses were sampled with the machine standing off, so a lamp glowing in its lens's own hue, and how brightly, are both guesses.
const LAMP_GLOW = 1

// Light levels are presentation choices, not measurements of the machine.
const SKY = 0xffffff,
  GROUND = 0x444444,
  SUNLIGHT = 0xffffff,
  SUN = [-0.3, 0.6, 0.4],
  SKY_INTENSITY = 0.5,
  SUN_INTENSITY = 1.6

// The blank a cassette offered to the recorder is written on: tools/models/sound_on_sound_c15.js says why it is the one.
const RECORDER_CASSETTE = "soundOnSoundC15"

export default class Desk {
  datacorder = null
  disc = null
  machine = null
  monitor = null
  recorder = null
  scene = new Scene()
  settings
  #driveLens
  #powerLens
  #textures = []

  constructor() {
    const sky = new HemisphereLight(SKY, GROUND, SKY_INTENSITY),
      sun = new DirectionalLight(SUNLIGHT, SUN_INTENSITY)

    sun.position.set(...SUN)
    this.scene.add(sky, sun)
  }

  async load(anisotropy, computer, names) {
    const { picture, keys } = computer,
      loading = [
        loadNamed(names.machine, anisotropy, keys),
        loadNamed(names.monitor, anisotropy, keys)
      ],
      [machine, monitor] = await Promise.all(loading),
      screen = showPicture(monitor.model, picture),
      drive = machine.model.getObjectByName("drive"),
      lid = machine.model.getObjectByName("cassette-lid"),
      powerLamp = machine.model.getObjectByName("power-lamp"),
      machineBounds = this.#boundsOf(machine.model),
      monitorBounds = this.#boundsOf(monitor.model)

    this.settings = { ...screen.settings, ...machine.keyboard }
    monitor.model.position.z = machineBounds.min.z - GAP - monitorBounds.max.z
    this.machine = machine.model
    this.monitor = monitor.model
    this.#textures = [...machine.textures, ...monitor.textures]
    this.scene.add(machine.model, monitor.model)

    if (drive) {
      await this.#layDisc(drive, machineBounds, anisotropy, computer)
    }

    if (lid) {
      await this.#layCassette(lid, machineBounds, anisotropy, computer)
    }

    if (names.recorder) {
      await this.#layRecorder(names.recorder, machineBounds, anisotropy, computer)
    }

    if (powerLamp) {
      this.#powerLens = this.#lightPowerLamp(powerLamp)
    }
  }

  // A machine with a drive has a disc on the desk before it, with a name
  // written on its label, and a lamp on its drive's bezel.
  async #layDisc(drive, machineBounds, anisotropy, cpc) {
    const loading = [loadNamed("cf2", anisotropy, cpc.keys), loadHandwriting()],
      [disc] = await Promise.all(loading),
      driveBounds = this.#boundsOf(drive),
      discBounds = this.#boundsOf(disc.model),
      driveMiddle = new Vector3()

    driveBounds.getCenter(driveMiddle)
    disc.model.position.set(driveMiddle.x, 0, machineBounds.max.z + GAP - discBounds.min.z)
    this.#driveLens = this.#unlitDriveLamp(this.machine)
    this.disc = new Disc(disc.model, drive, cpc)
    this.#textures.push(...disc.textures)
    this.scene.add(disc.model)
  }

  // A machine with a datacorder has a cassette on the desk before its lid, with a name written on its label.
  async #layCassette(lid, machineBounds, anisotropy, cpc) {
    const loading = [loadNamed("ct15", anisotropy, cpc.keys), loadHandwriting()],
      [cassette] = await Promise.all(loading),
      lidBounds = this.#boundsOf(lid),
      cassetteBounds = this.#boundsOf(cassette.model),
      lidMiddle = new Vector3()

    lidBounds.getCenter(lidMiddle)
    cassette.model.position.set(
      lidMiddle.x,
      -cassetteBounds.min.y,
      machineBounds.max.z + GAP - cassetteBounds.min.z
    )
    this.scene.add(cassette.model)

    const laid = new Cassette(cassette.model)

    this.datacorder = new Datacorder(this.machine, laid, cpc)
    this.#textures.push(...cassette.textures)
  }

  // A machine with no deck of its own has a recorder standing at its right, its front in line with the machine's and its keys toward the reader, and a cassette on the desk before it, with a name written on its label.
  async #layRecorder(name, machineBounds, anisotropy, spectrum) {
    const loading = [
        loadNamed(name, anisotropy, spectrum.keys),
        loadNamed(RECORDER_CASSETTE, anisotropy, spectrum.keys),
        loadHandwriting()
      ],
      [recorder, cassette] = await Promise.all(loading),
      recorderBounds = this.#boundsOf(recorder.model)

    recorder.model.position.set(
      machineBounds.max.x + GAP - recorderBounds.min.x,
      0,
      machineBounds.max.z - recorderBounds.max.z
    )

    const standing = this.#boundsOf(recorder.model),
      cassetteBounds = this.#boundsOf(cassette.model),
      recorderMiddle = new Vector3()

    standing.getCenter(recorderMiddle)
    cassette.model.position.set(
      recorderMiddle.x,
      -cassetteBounds.min.y,
      standing.max.z + GAP - cassetteBounds.min.z
    )
    this.scene.add(recorder.model, cassette.model)

    const laid = new Cassette(cassette.model)

    this.recorder = new Recorder(recorder.model, laid, spectrum)
    this.#textures.push(...recorder.textures, ...cassette.textures)
  }

  // A Box3 takes an object's parents' matrices as they last stood, and no frame has been drawn yet.
  #boundsOf(object) {
    const bounds = new Box3()

    object.updateWorldMatrix(true, false)
    bounds.setFromObject(object)

    return bounds
  }

  #lightPowerLamp(lamp) {
    const lens = lamp.material

    lens.emissive.copy(lens.color)
    lens.emissiveIntensity = LAMP_GLOW

    return lens
  }

  // Both lamps are cut from one material in the model, so the drive's takes a
  // copy of its own before either is lit.
  #unlitDriveLamp(machine) {
    const drive = machine.getObjectByName("drive-lamp"),
      lens = drive.material.clone()

    drive.material = lens
    lens.emissive.copy(lens.color)
    lens.emissiveIntensity = 0

    return lens
  }

  showPower(on) {
    this.#powerLens.emissiveIntensity = on ? LAMP_GLOW : 0
  }

  showDriveInUse(inUse) {
    this.#driveLens.emissiveIntensity = inUse ? LAMP_GLOW : 0
  }

  dispose() {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set(this.#textures)

    this.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        geometries.add(object.geometry)
        materials.add(object.material)
      }
    })

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

import { Box3, DirectionalLight, HemisphereLight, Scene, Vector3 } from "three/webgpu"
import Cassette from "./cassette"
import Datacorder from "./datacorder"
import Disc from "./disc"
import { loadHandwriting } from "./handwriting"
import loadModel from "./load_model"
import showPicture from "./show_picture"

const MACHINE_URLS = {
    cpc6128: new URL("../../assets/models/cpc6128.glb", import.meta.url),
    cpc464: new URL("../../assets/models/cpc464.glb", import.meta.url)
  },
  MONITOR_URLS = {
    ctm644: new URL("../../assets/models/ctm644.glb", import.meta.url),
    gt64: new URL("../../assets/models/gt64.glb", import.meta.url)
  },
  DISC_INTERFACE_URLS = {
    ddi1: new URL("../../assets/models/ddi1.glb", import.meta.url)
  },
  CF2_URL = new URL("../../assets/models/cf2.glb", import.meta.url),
  CT15_URL = new URL("../../assets/models/ct15.glb", import.meta.url)

const LANGUAGE = "es"

// One chosen gap stands between the machine and the monitor behind it, between the machine and the disc or cassette before it, and between the machine and a drive beside it where the monitor does not stand it further off, measured from what each model reaches. The gap is an arrangement choice, not a measurement.
const GAP = 0.03

// A DDI-1's drive stands "to the right of the computer" and "at least 20 cm from the monitor" [A], User Instructions F1.4: https://archive.org/download/manualsonline-id-073a0aea-c864-4724-8004-a2dbc04e2798/073a0aea-c864-4724-8004-a2dbc04e2798.pdf. Its front stands level with the computer's, as a photograph of one at home stands it [E]: https://www.classic-computers.org.nz/blog/images/2015-10-06-amstrad-fdd1-with-464-3-800x.jpg. That is an arrangement choice, and the 20 cm is kept across, the drive being as deep as the monitor stands behind.
const MONITOR_CLEARANCE = 0.2

// The parts of a drive built into the machine, which lead the eye to it; a drive standing on its own leads it from all of itself.
const BUILT_IN_DRIVE_PARTS = ["drive", "drive-lamp", "drive-plate", "eject-button"]

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
  datacorder = null
  disc = null
  discInterface = null
  drive = null
  driveParts = []
  machine = null
  monitor = null
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

  async load(anisotropy, cpc, names) {
    const { picture, keys } = cpc,
      fitted = names.discInterface != null,
      loading = [
        loadModel(MACHINE_URLS[names.machine], LANGUAGE, anisotropy, keys),
        loadModel(MONITOR_URLS[names.monitor], LANGUAGE, anisotropy, keys),
        fitted
          ? loadModel(DISC_INTERFACE_URLS[names.discInterface], LANGUAGE, anisotropy, keys)
          : null
      ],
      [machine, monitor, discInterface] = await Promise.all(loading),
      screen = showPicture(monitor.model, picture),
      lid = machine.model.getObjectByName("cassette-lid"),
      machineBounds = this.#boundsOf(machine.model)

    this.settings = { ...screen.settings, ...machine.keyboard }
    this.machine = machine.model
    this.monitor = monitor.model
    this.#textures = [...machine.textures, ...monitor.textures]
    this.scene.add(machine.model, monitor.model)

    if (fitted) {
      this.#fitDiscInterface(discInterface)
    }

    this.#standMonitor(machineBounds)

    if (fitted) {
      this.#standDiscDrive(machineBounds)
    } else {
      this.#findBuiltInDrive()
    }

    if (this.drive) {
      await this.#layDisc(machineBounds, anisotropy, cpc)
    }

    if (lid) {
      await this.#layCassette(lid, machineBounds, anisotropy, cpc)
    }

    this.#powerLens = this.#lightPowerLamp(machine.model)
  }

  // The interface stands on the edge connector the machine's model names, on
  // the desk, and the drive it comes with is switched on before the machine,
  // as its manual says, so its POWER lamp is alight from the start.
  #fitDiscInterface({ model, textures }) {
    const connector = this.machine.getObjectByName("floppy-disc"),
      unit = model.getObjectByName("disc-interface"),
      at = new Vector3()

    connector.getWorldPosition(at)
    unit.position.set(at.x, 0, at.z)
    this.discInterface = model
    this.#textures.push(...textures)
    this.#lightPowerLamp(model)
    this.scene.add(model)
  }

  // Behind the machine and whatever stands on its rear.
  #standMonitor(machineBounds) {
    const behind = machineBounds.clone(),
      monitorBounds = this.#boundsOf(this.monitor)

    if (this.discInterface) {
      const unit = this.discInterface.getObjectByName("disc-interface"),
        unitBounds = this.#boundsOf(unit)

      behind.union(unitBounds)
    }

    this.monitor.position.z = behind.min.z - GAP - monitorBounds.max.z
  }

  #standDiscDrive(machineBounds) {
    const model = this.discInterface,
      unit = model.getObjectByName("disc-drive"),
      monitorBounds = this.#boundsOf(this.monitor),
      beside = machineBounds.max.x + GAP,
      clear = monitorBounds.max.x + MONITOR_CLEARANCE,
      left = Math.max(beside, clear)

    unit.position.set(left, 0, machineBounds.max.z)
    this.drive = model.getObjectByName("drive")
    this.driveParts = [unit]
    this.#layRibbon(model)
  }

  // The ribbon is laid straight across the desk from the interface's end of it
  // to the drive's, over each of them for half its own width, where it folds.
  #layRibbon(model) {
    const ribbon = model.getObjectByName("ribbon"),
      interfaceEnd = model.getObjectByName("ribbon-from"),
      driveEnd = model.getObjectByName("ribbon-to"),
      from = new Vector3(),
      to = new Vector3(),
      own = this.#boundsOf(ribbon)

    interfaceEnd.getWorldPosition(from)
    driveEnd.getWorldPosition(to)

    const across = new Vector3().subVectors(to, from),
      length = across.length(),
      half = (own.max.z - own.min.z) / 2,
      laidLength = own.max.x - own.min.x

    ribbon.position.copy(from).addScaledVector(across, -half / length)
    ribbon.rotation.y = Math.atan2(-across.z, across.x)
    ribbon.scale.x = (length + 2 * half) / laidLength
  }

  #findBuiltInDrive() {
    const drive = this.machine.getObjectByName("drive"),
      built = drive != null

    if (built) {
      this.drive = drive
      this.driveParts = BUILT_IN_DRIVE_PARTS.map(name => this.machine.getObjectByName(name))
    }
  }

  // A desk with a drive has a disc lying before the drive, with a name written
  // on its label, and a lamp on the drive's bezel.
  async #layDisc(machineBounds, anisotropy, cpc) {
    const loading = [loadModel(CF2_URL, LANGUAGE, anisotropy, cpc.keys), loadHandwriting()],
      [disc] = await Promise.all(loading),
      holder = this.discInterface ?? this.machine,
      slot = holder.getObjectByName("drive-slot"),
      discBounds = this.#boundsOf(disc.model),
      mouth = new Vector3()

    slot.getWorldPosition(mouth)
    disc.model.position.set(mouth.x, 0, machineBounds.max.z + GAP - discBounds.min.z)
    this.#driveLens = this.#unlitDriveLamp(holder)
    this.disc = new Disc(disc.model, slot, cpc)
    this.#textures.push(...disc.textures)
    this.scene.add(disc.model)
  }

  // A machine with a datacorder has a cassette on the desk before its lid, with a name written on its label.
  async #layCassette(lid, machineBounds, anisotropy, cpc) {
    const loading = [loadModel(CT15_URL, LANGUAGE, anisotropy, cpc.keys), loadHandwriting()],
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

  // A Box3 takes an object's parents' matrices as they last stood, and no frame has been drawn yet.
  #boundsOf(object) {
    const bounds = new Box3()

    object.updateWorldMatrix(true, false)
    bounds.setFromObject(object)

    return bounds
  }

  #lightPowerLamp(model) {
    const power = model.getObjectByName("power-lamp"),
      lens = power.material

    lens.emissive.copy(lens.color)
    lens.emissiveIntensity = LAMP_GLOW

    return lens
  }

  // A machine's two lamps may be cut from one material in its model, so the
  // drive's takes a copy of its own before either is lit.
  #unlitDriveLamp(model) {
    const drive = model.getObjectByName("drive-lamp"),
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

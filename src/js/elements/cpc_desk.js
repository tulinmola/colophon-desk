import { CPC_KEY_MATRIX, Cpc } from "../emulator"
import DeskElement from "./desk"
import html from "../html"

const DRIVE_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h12M6 14h.01M15 14h3" />
  </svg>`,
  DATACORDER_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <circle cx="16" cy="11" r="2" />
    <path d="M10 11h4M6 19l2-4h8l2 4" />
  </svg>`

// Where a machine takes what it reads: a 6128's drive A its discs, a 464's datacorder its tapes.
const SLOTS = {
  drive: {
    view: "drive",
    title: "The disc drive",
    icon: DRIVE_ICON,
    noun: "disc",
    plural: "discs",
    suffixes: [".dsk"],
    place: "in drive A"
  },
  datacorder: {
    view: "datacorder",
    title: "The datacorder",
    icon: DATACORDER_ICON,
    noun: "tape",
    plural: "tapes",
    suffixes: [".cdt", ".tzx"],
    place: "in the datacorder"
  }
}

const POWER = html`<dialog name="power">
  <form method="dialog">
    <p>Turn the computer off? Everything in its memory goes with it.</p>
    <button value="off">Turn it off</button>
    <button value="" autofocus>Leave it on</button>
  </form>
</dialog>`

// A desk that names no machine or monitor stands the ones it was first built for.
const FIRST_MACHINE = "cpc6128",
  FIRST_MONITOR = "ctm644"

class CpcDeskElement extends DeskElement {
  #powerDialog
  #viewBeforeSwitching

  get models() {
    const machine = this.getAttribute("machine") ?? FIRST_MACHINE,
      monitor = this.getAttribute("monitor") ?? FIRST_MONITOR

    return { machine, monitor }
  }

  get keyMatrix() {
    return CPC_KEY_MATRIX
  }

  get sharesControl() {
    return true
  }

  createComputer(signal, anisotropy) {
    const { machine } = this.models

    return Cpc.create(signal, anisotropy, machine)
  }

  // A machine with a drive takes discs there, and one without takes tapes at its datacorder.
  slotOf({ disc, datacorder }) {
    return disc
      ? { slot: SLOTS.drive, medium: disc }
      : { slot: SLOTS.datacorder, medium: datacorder }
  }

  init() {
    super.init()
    this.menu.insertAdjacentHTML("afterend", POWER)
    this.#powerDialog = this.querySelector("dialog[name='power']")

    const { signal } = this

    this.#powerDialog.addEventListener("close", this.onPowerAnswered.bind(this), { signal })
  }

  intentOf(picked) {
    const switches = picked.view == "power"

    return switches ? "power" : super.intentOf(picked)
  }

  act(intent, picked) {
    switch (intent) {
      case "power":
        this.#switchPower()
        break
      default:
        super.act(intent, picked)
        break
    }
  }

  advance(now) {
    super.advance(now)

    const { disc } = this.desk

    if (disc) {
      // Read after the insert: the machine clears the lamp's line as it is asked for it.
      const inUse = this.computer.driveInUse()

      this.desk.showDriveInUse(inUse)
    }
  }

  // A machine switched on is made afresh and asks nothing; one switched off is
  // gone, with whatever it held, so that is the answer worth asking for.
  #switchPower() {
    const cpc = this.computer,
      off = !cpc.running

    // A machine made again carries the eye back to where its switch took it
    // from; one about to be destroyed keeps it here to watch.
    if (off) {
      cpc.switchOn()
      this.desk.showPower(true)
      this.lookBack(this.#viewBeforeSwitching)
      return
    }

    this.#viewBeforeSwitching = this.rig.view
    this.rig.look("power")
    this.#powerDialog.returnValue = ""
    this.#powerDialog.showModal()
  }

  onPowerAnswered() {
    const answered = this.#powerDialog.returnValue,
      off = answered == "off"

    this.focus()

    // The notice stands: a disc in the drive or a tape in the datacorder is in
    // it whether the machine is running or not, and is there again when the
    // power comes back.
    if (off) {
      this.computer.switchOff()
      this.desk.showPower(false)
      return
    }

    this.lookBack(this.#viewBeforeSwitching)
  }

  dispose() {
    this.#powerDialog.remove()
    super.dispose()
  }
}

CpcDeskElement.define("colophon-cpc-desk")

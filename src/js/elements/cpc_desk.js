import { CameraRig, Desk } from "../models"
import { Cpc, KEY_MATRIX } from "../emulator"
import { Vector2, WebGPURenderer } from "three/webgpu"
import Element from "./element"

const html = String.raw

// A pointer that travels further than this, in CSS pixels, between going down
// and coming up has turned the camera rather than clicked.
const CLICK_SLACK = 10

const DESK_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"
    />
    <path d="M8.5 13V8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5" />
    <path d="M8 13h8l1 4H7z" />
  </svg>`,
  SET_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 14V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10" />
    <rect x="9" y="6" width="6" height="4" rx="0.5" />
    <path d="M4.5 14h15l2.5 8H2z" />
    <path d="M8 18h8" />
  </svg>`,
  MONITOR_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="2" width="18" height="19" rx="2" />
    <rect x="7" y="6" width="10" height="7" rx="1" />
    <path d="M7 17h3M17 17h.01" />
  </svg>`,
  DRIVE_ICON = html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h12M6 14h.01M15 14h3" />
  </svg>`

const VIEW_MENU = html`<menu aria-label="Views" hidden>
  <li>
    <button type="button" data-view="desk" title="The whole desk" aria-pressed="false">
      ${DESK_ICON}
    </button>
  </li>
  <li>
    <button type="button" data-view="set" title="The computer and monitor" aria-pressed="false">
      ${SET_ICON}
    </button>
  </li>
  <li>
    <button type="button" data-view="monitor" title="The monitor" aria-pressed="false">
      ${MONITOR_ICON}
    </button>
  </li>
  <li>
    <button type="button" data-view="drive" title="The disc drive" aria-pressed="false">
      ${DRIVE_ICON}
    </button>
  </li>
</menu>`

const DRIVE_A = html`<input type="file" accept=".dsk" hidden /> <output name="drive"></output>`

const NOTHING_PICKED = { name: null, view: null }

class CpcDeskElement extends Element {
  #chooser
  #cpc = null
  #desk
  #driveNotice
  #heldByCode = new Map()
  #hovering
  #initialising
  #menu
  #observer
  #offered = null
  #pointer = new Vector2()
  #pressedAt = new Vector2()
  #renderer
  #rig
  #shown
  #viewBeforeChoosing

  init() {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      desk = new Desk(),
      rig = new CameraRig(canvas)

    renderer.setPixelRatio(devicePixelRatio)
    this.prepend(canvas)
    canvas.insertAdjacentHTML("afterend", VIEW_MENU)

    const menu = this.querySelector("menu")

    menu.insertAdjacentHTML("afterend", DRIVE_A)

    this.#chooser = this.querySelector("input[type='file']")
    this.#desk = desk
    this.#driveNotice = this.querySelector("output[name='drive']")
    this.#hovering = false
    this.#menu = menu
    this.#renderer = renderer
    this.#rig = rig
    this.#shown = { view: null, lead: null, answers: false }

    const resized = this.onResized.bind(this),
      { signal } = this

    this.#observer = new ResizeObserver(resized)
    this.#observer.observe(this)

    this.addEventListener("keydown", this.onKeyDown.bind(this), { signal })
    this.addEventListener("keyup", this.onKeyUp.bind(this), { signal })
    this.addEventListener("blur", this.onBlur.bind(this), { signal })
    canvas.addEventListener("pointerdown", this.onPointerDown.bind(this), { signal })
    canvas.addEventListener("pointermove", this.onPointerMove.bind(this), { signal })
    canvas.addEventListener("pointerleave", this.onPointerLeave.bind(this), { signal })
    canvas.addEventListener("click", this.onSceneClicked.bind(this), { signal })
    this.#menu.addEventListener("click", this.onViewChosen.bind(this), { signal })
    this.#chooser.addEventListener("change", this.onDiscChosen.bind(this), { signal })
    this.#chooser.addEventListener("cancel", this.onChoiceCancelled.bind(this), { signal })

    this.#initialising = this.#load(desk, rig, renderer, signal)
  }

  onPointerDown(event) {
    this.#pressedAt.set(event.clientX, event.clientY)
  }

  onPointerMove(event) {
    const touching = event.pointerType == "touch",
      pressing = event.buttons != 0

    this.#hovering = !touching && !pressing
    this.#aim(event)
  }

  onPointerLeave() {
    this.#hovering = false
  }

  onSceneClicked(event) {
    const travelled = this.#pressedAt.distanceTo({ x: event.clientX, y: event.clientY }),
      turned = travelled > CLICK_SLACK

    if (turned) {
      return
    }

    this.#aim(event)

    const rig = this.#rig,
      picked = rig.pick(this.#pointer),
      intent = this.#intentOf(picked)

    switch (intent) {
      case "eject":
        this.#ejectDisc()
        break
      case "choose":
        this.#chooseDisc()
        break
      case "look":
        rig.look(picked.view)
        break
      default:
        break
    }
  }

  // The machine's keys reach it only while the desk holds the focus, so a
  // view chosen from the menu hands the focus back.
  onViewChosen(event) {
    const button = event.target.closest("button")

    if (!button) {
      return
    }

    this.#rig.look(button.dataset.view)
    this.focus()
  }

  // The chooser is emptied before the read, or the same file chosen again
  // would count as no choice at all.
  async onDiscChosen() {
    const chooser = this.#chooser,
      [file] = chooser.files,
      { signal } = this

    chooser.value = ""

    const contents = await file.arrayBuffer(),
      laidAway = signal.aborted

    if (laidAway) {
      return
    }

    const bytes = new Uint8Array(contents)

    this.#offered = { name: file.name, bytes }
    this.#desk.disc.insert(file.name)
  }

  #insertOffered() {
    const { name, bytes } = this.#offered,
      cpc = this.#cpc,
      inserted = cpc.insertDisc(bytes)

    this.#offered = null

    if (inserted) {
      this.#tell(`${name} is in drive A`)
      this.#lookBack()
      return
    }

    const problem = cpc.discProblem()

    this.#tell(`${name} was refused: ${problem}`)
    this.#desk.disc.erase()
    this.#desk.disc.eject()
  }

  onChoiceCancelled() {
    this.#lookBack()
  }

  // Where the reader stood before the drive was asked for a disc. A camera
  // turned freely there left no view to come back to, and stays at the drive.
  #lookBack() {
    const left = this.#viewBeforeChoosing,
      returning = left != null

    if (returning) {
      this.#rig.look(left)
    }
  }

  #intentOf({ name, view }) {
    const ejects = name == "eject-button",
      takesDisc = view == "drive",
      leads = view != null && view != this.#rig.view

    if (ejects) {
      return "eject"
    }

    if (takesDisc) {
      return "choose"
    }

    return leads ? "look" : null
  }

  // A browser opens the chooser only within the click that asked for it, so
  // nothing may be awaited before it opens.
  #chooseDisc() {
    this.#viewBeforeChoosing = this.#rig.view
    this.#rig.look("drive")
    this.#chooser.click()
  }

  // A disc still on its way in is turned around, and the machine is never
  // given it: the reader pressed EJECT before the drive had it.
  #ejectDisc() {
    this.#rig.look("drive")
    this.#offered = null
    this.#cpc.ejectDisc()
    this.#desk.disc.eject()
    this.#tell("")
  }

  // The notice stays in the page, empty or not, so that a screen reader is
  // already listening when it speaks.
  #tell(news) {
    this.#driveNotice.value = news
  }

  #aim({ offsetX, offsetY, target }) {
    const across = (offsetX / target.clientWidth) * 2 - 1,
      down = (offsetY / target.clientHeight) * 2 - 1

    this.#pointer.set(across, -down)
  }

  #showViews() {
    const rig = this.#rig,
      { view } = rig,
      picked = this.#hovering ? rig.pick(this.#pointer) : NOTHING_PICKED,
      answers = this.#intentOf(picked) != null,
      lead = picked.view == view ? null : picked.view,
      shown = this.#shown,
      unchanged = view == shown.view && lead == shown.lead && answers == shown.answers

    if (unchanged) {
      return
    }

    this.#shown = { view, lead, answers }
    this.#renderer.domElement.toggleAttribute("data-answers", answers)

    for (const button of this.#menu.querySelectorAll("button")) {
      const chosen = button.dataset.view == view,
        pointedAt = button.dataset.view == lead

      button.setAttribute("aria-pressed", String(chosen))
      button.toggleAttribute("data-pointed", pointedAt)
    }
  }

  onKeyDown(event) {
    const keys = this.#takeKeys(event)

    if (!keys) {
      return
    }

    this.#heldByCode.set(event.code, keys)

    for (const key of keys) {
      this.#cpc.pressKey(key)
    }
  }

  // A release is never withheld. A key let go of while a modifier happens to
  // be down is still let go of, and a press left standing repeats for ever.
  onKeyUp(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      known = standing && Boolean(keys)

    if (!known) {
      return
    }

    const wasHeld = this.#heldByCode.delete(event.code)

    if (wasHeld) {
      this.#letGo(keys)
    }
  }

  onBlur() {
    const standing = this.#cpc != null

    if (standing) {
      this.#heldByCode.clear()
      this.#cpc.releaseAllKeys()
    }
  }

  // A switch two browser keys close is still closed while either is down:
  // SHIFT and CONTROL are each one position under two keys.
  #letGo(keys) {
    const stillHeld = new Set()

    for (const held of this.#heldByCode.values()) {
      for (const key of held) {
        stillHeld.add(key)
      }
    }

    for (const key of keys) {
      if (!stillHeld.has(key)) {
        this.#cpc.releaseKey(key)
      }
    }
  }

  #takeKeys(event) {
    const standing = this.#cpc != null,
      keys = KEY_MATRIX[event.code],
      systemChord = event.metaKey || event.altKey,
      // The options panel stands inside this element, and a slider being
      // turned with the arrow keys is not the machine's keyboard.
      onTheDesk = event.target == this,
      reaches = standing && onTheDesk && Boolean(keys) && !systemChord

    if (!reaches) {
      return null
    }

    // CONTROL is a key this machine reads, so a chord holding it is sent on
    // with the page's own default left alone.
    const heldWithControl = event.ctrlKey

    if (!heldWithControl) {
      event.preventDefault()
    }

    return keys
  }

  async #load(desk, rig, renderer, signal) {
    await renderer.init()

    const wireframe = this.hasAttribute("wireframe"),
      anisotropy = renderer.getMaxAnisotropy(),
      cpc = await Cpc.create(signal, anisotropy)

    await desk.load(anisotropy, cpc)
    desk.scene.traverse(function (object) {
      const drawn = object.isMesh

      if (drawn) {
        object.material.wireframe = wireframe
      }
    })

    const standing = !signal.aborted

    if (standing) {
      const options = this.querySelector("colophon-options"),
        insertOffered = this.#insertOffered.bind(this),
        showViews = this.#showViews.bind(this)

      this.#cpc = cpc
      rig.use(desk)
      options.use(desk.settings)
      this.#menu.hidden = false
      renderer.setAnimationLoop(function (now) {
        cpc.advance(now)
        rig.advance(now)

        const seated = desk.disc.advance(now)

        if (seated) {
          insertOffered()
        }

        // Read after the insert: the machine clears the lamp's line as it is asked for it.
        const inUse = cpc.driveInUse()

        desk.showDriveInUse(inUse)
        showViews()
        renderer.render(desk.scene, rig.camera)
      })
    }

    return { cpc, desk }
  }

  dispose() {
    const renderer = this.#renderer

    renderer.setAnimationLoop(null)
    this.#cpc = null
    this.#observer.disconnect()
    this.#rig.dispose()
    this.#menu.remove()
    this.#chooser.remove()
    this.#driveNotice.remove()
    this.#release(renderer)
    renderer.domElement.remove()
  }

  // A load that threw built nothing to release, but the device it was building
  // on is owed its disposal either way. Its failure is left to the promise
  // nobody else took, which is where the page reports it.
  async #release(renderer) {
    try {
      const { cpc, desk } = await this.#initialising

      cpc.dispose()
      desk.dispose()
    } catch {
      // Reported there; catching it here only keeps it from being told twice.
    } finally {
      renderer.dispose()
    }
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height)
    this.#rig.resize(width, height)
  }
}

CpcDeskElement.define("colophon-cpc-desk")

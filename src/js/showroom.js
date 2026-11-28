import "./elements"
import { Desk, Flight, LineUp, Model, REDUCED_MOTION, SetUp, Studio, drawViews } from "./models"
import { NeutralToneMapping, PerspectiveCamera, WebGPURenderer } from "three/webgpu"
import COMPUTERS from "./computers"
import PIECES from "./pieces"
import html from "./html"

// How long the line-up takes to clear away and the set-up's panel to come in, and back, in milliseconds, and how each eases. Presentation choices, as the computer's flight between them is.
const LEAVING = { duration: 350, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
  ARRIVING = { duration: 450, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }

const PANEL_ARRIVING = [
    { opacity: 0, transform: "translateX(3rem)" },
    { opacity: 1, transform: "none" }
  ],
  TITLE_LEAVING = [
    { opacity: 1, transform: "none" },
    { opacity: 0, transform: "translateY(-1.5rem)" }
  ],
  WORDS_LEAVING = [{ opacity: 1 }, { opacity: 0 }]

// How far a press moves before it is a drag, in CSS pixels, beyond a finger's wobble in a tap, and how far a drag the whole width of what it holds turns it, across or down, in radians. Presentation choices.
const DRAGGED = 10,
  TURN_ACROSS = Math.PI

const LEGENDS = { monitor: "Monitor", television: "Television" }

// How a computer is named in each language it was sold in.
const ADJECTIVES = { en: "English", fr: "French", de: "German", es: "Spanish" }

// The reader's own language where the computer was sold in it, or the first it
// offers.
function languageAtFirst({ versions }) {
  const languages = Object.keys(versions),
    spoken = navigator.languages.map(tag => tag.split("-")[0]),
    shared = spoken.find(language => languages.includes(language))

  return shared ?? languages[0]
}

function headingOf({ title, versions }, language) {
  const several = Object.keys(versions).length > 1

  return several ? `Your ${ADJECTIVES[language]} ${title}` : `Your ${title}`
}

function itemOf({ name, title, maker, year, features }) {
  const listed = features.map(feature => html`<li>${feature}</li>`).join("")

  return html`<li data-computer="${name}">
    <a href="?computer=${name}" aria-describedby="${name}-features" draggable="false">
      <span class="frame"></span>
      <span class="name">${title}</span>
      <span class="made">${maker} · ${year}</span>
    </a>
    <ul id="${name}-features">
      ${listed}
    </ul>
  </li>`
}

// Each input is named as the desk names the kind of piece it chooses, so the
// form asks for the desk in the desk's own terms.
function optionOf(name, type, chosen) {
  const { title, maker, kind, description } = PIECES[name],
    checked = chosen ? "checked" : ""

  return html`<label>
    <input type="${type}" name="${kind}" value="${name}" ${checked} />
    <span class="name">${title}</span>
    <span class="made">${maker} · ${description}</span>
  </label>`
}

function languageOptionOf(language, keyboard, chosen) {
  const checked = chosen ? "checked" : ""

  return html`<label>
    <input type="radio" name="language" value="${language}" ${checked} />
    <span class="name">${ADJECTIVES[language]}</span>
    <span class="made">${keyboard}</span>
  </label>`
}

function formOf({ name, versions, displays, beside }, language, chosen) {
  const sold = Object.entries(versions),
    several = sold.length > 1,
    lettered = sold
      .map(([each, keyboard]) => languageOptionOf(each, keyboard, each == language))
      .join(""),
    languageChoice = several
      ? html`<fieldset>
          <legend>Language</legend>
          ${lettered}
        </fieldset>`
      : "",
    [first] = displays,
    { kind } = PIECES[first],
    displayed = displays.map(each => optionOf(each, "radio", chosen.includes(each))).join(""),
    offeredBeside = beside.map(each => optionOf(each, "checkbox", chosen.includes(each))).join("")

  return html`<input type="hidden" name="computer" value="${name}" />
    ${languageChoice}
    <fieldset>
      <legend>${LEGENDS[kind]}</legend>
      ${displayed}
    </fieldset>
    <fieldset>
      <legend>Beside it</legend>
      ${offeredBeside}
    </fieldset>
    <button type="submit" aria-describedby="${name}-running">Switch on</button>
    <p id="${name}-running"></p>`
}

// What stops the desk running the computer with the display chosen, or nothing.
function whyNotRunning({ name, title, displays }, display) {
  const runs = Desk.runs(name, display),
    runsAtAll = displays.some(each => Desk.runs(name, each))

  if (runs) {
    return ""
  }

  if (runsAtAll) {
    return `The ${title} does not run here with the ${PIECES[display].title} yet.`
  }

  return `The ${title} does not run here yet.`
}

// A desk is asked for as the set-up's form asks for it: by the language it is
// lettered in and by each piece chosen under the name of its kind. One naming
// no display, or none the desk runs, is not a desk, and one naming a language
// its computer was not sold in takes the first it would be set up in.
function deskAsked(computer, query) {
  const { name, versions, displays, beside } = computer,
    asked = query.get("language"),
    sold = Object.hasOwn(versions, asked),
    language = sold ? asked : languageAtFirst(computer),
    chosen = [...displays, ...beside].filter(each =>
      query.getAll(PIECES[each].kind).includes(each)
    ),
    display = displays.find(each => chosen.includes(each)),
    runs = Desk.runs(name, display)

  return runs ? { language, chosen } : null
}

// What a computer is set up with: what the desk asked for stands with it, or
// else its first display and whatever it is offered with from the start.
function chosenFor({ displays, chosenAtFirst }, desk) {
  const [first] = displays

  return desk?.chosen ?? [first, ...chosenAtFirst]
}

function sameDesk(one, other) {
  const either = one == null || other == null

  if (either) {
    return one == other
  }

  return one.language == other.language && one.chosen.join() == other.chosen.join()
}

// The address names the computer being set up, or none for the line-up, and
// the desk it is switched on as. A computer it does not know leads to the
// line-up, and a desk the desk does not run to its computer's set-up.
function placeAsked() {
  const query = new URLSearchParams(location.search),
    name = query.get("computer"),
    computer = COMPUTERS.find(each => each.name == name) ?? null,
    desk = computer == null ? null : deskAsked(computer, query)

  return { computer, desk }
}

function addressOf(computer) {
  const address = new URL(location.href),
    query = computer == null ? "" : `?computer=${computer.name}`

  address.search = query

  return address
}

// A main-button drag on the element turns what it shows, in radians across
// and down, until let go; the click it ends in is stopped on the link holding
// it, where an engine may aim it, but the keyboard's click is not.
function turnByHand(element, { turn, letGo }) {
  const clicked = element.closest("a") ?? element

  let press = null,
    dragging = false

  function end(event) {
    const ours = event.pointerId == press?.id

    if (ours) {
      press = null

      if (dragging) {
        letGo()
      }
    }
  }

  element.addEventListener("pointerdown", function (event) {
    const taken = press == null && event.button == 0

    if (!taken) {
      return
    }

    element.setPointerCapture(event.pointerId)
    press = { id: event.pointerId, x: event.clientX, y: event.clientY }
  })

  // A touch is captured by whatever it lands on, so a second finger is
  // answered by its own id alone; and a release lost to a menu or another
  // window ends the press at the next move made with no button down.
  element.addEventListener("pointermove", function (event) {
    const ours = event.pointerId == press?.id,
      lifted = event.buttons == 0

    if (!ours) {
      return
    }

    if (lifted) {
      end(event)
      return
    }

    const across = event.clientX - press.x,
      down = event.clientY - press.y,
      moved = Math.hypot(across, down),
      far = dragging || moved >= DRAGGED

    if (!far) {
      return
    }

    const perPixel = TURN_ACROSS / element.clientWidth

    dragging = true
    press.x = event.clientX
    press.y = event.clientY
    turn(across * perPixel, down * perPixel)
  })

  element.addEventListener("lostpointercapture", end)
  clicked.addEventListener(
    "pointerdown",
    function () {
      const fresh = press == null

      if (fresh) {
        dragging = false
      }
    },
    { capture: true }
  )
  clicked.addEventListener(
    "click",
    function (event) {
      const pointed = event.detail > 0,
        dragged = dragging && pointed

      if (dragged) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    },
    { capture: true }
  )
}

function rectOf(element) {
  const { left, top, width, height } = element.getBoundingClientRect()

  return { left, top, width, height }
}

// A link opened in a new tab or window opens there, the page it names
// standing by its address alone.
function openedElsewhere(event) {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
}

// One canvas under the whole page draws the line-up, a computer's set-up and
// its desk switched on, and carries the computer chosen from one to the next:
// only the pieces it may be given are loaded on the way, and what leaves is
// freed once gone.
class Showroom {
  #anisotropy
  #arrived = false
  #busy = new Set()
  #camera = new PerspectiveCamera()
  #canvas
  #controls = null
  #deskHeading
  #deskSection
  #drawing = false
  #drawn = null
  #flight = null
  #focused = null
  #form
  #heading
  #hovered = null
  #items = new Map()
  #languages = new Map()
  #line
  #lineUpSection
  #main
  #onFrame
  #optionsPanel = null
  #panel
  #renderer
  #running = null
  #setUp = null
  #setUpLink
  #setUpSection
  #showing = null
  #stage
  #studio
  #title
  #titled
  #travelling = false
  #trouble = ""
  #wanted = null

  constructor(main) {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      resized = this.onResized.bind(this),
      observer = new ResizeObserver(resized),
      linked = this.onLinked.bind(this),
      list = main.querySelector("ol"),
      back = main.querySelector(".panel a"),
      stage = main.querySelector(".stage"),
      lineUpSection = main.querySelector(".line-up"),
      setUpSection = main.querySelector(".set-up"),
      deskSection = main.querySelector(".desk"),
      setUpLink = deskSection.querySelector("a")

    renderer.setPixelRatio(devicePixelRatio)
    renderer.toneMapping = NeutralToneMapping
    renderer.autoClear = false
    history.scrollRestoration = "manual"
    main.prepend(canvas)
    list.innerHTML = COMPUTERS.map(itemOf).join("")

    for (const item of list.children) {
      const link = item.querySelector("a"),
        frame = item.querySelector(".frame"),
        { computer } = item.dataset

      turnByHand(frame, {
        turn: across => this.#byHand(lineUpSection, lineUp => lineUp.turnBy(computer, across)),
        letGo: () => this.#byHand(lineUpSection, lineUp => lineUp.letGo(computer))
      })
      link.addEventListener("click", linked)
      link.addEventListener("pointerenter", () => this.onPointerEnter(computer))
      link.addEventListener("pointerleave", () => this.onPointerLeave(computer))
      link.addEventListener("focus", () => this.onFocus(computer, link))
      link.addEventListener("blur", () => this.onBlur(computer))
      this.#items.set(computer, item)
    }

    this.#canvas = canvas
    this.#deskHeading = deskSection.querySelector("h2")
    this.#deskSection = deskSection
    this.#form = main.querySelector("form")
    this.#heading = main.querySelector(".set-up h2")
    this.#line = main.querySelector(".panel > p")
    this.#lineUpSection = lineUpSection
    this.#main = main
    this.#onFrame = this.onFrame.bind(this)
    this.#panel = main.querySelector(".panel")
    this.#renderer = renderer
    this.#setUpLink = setUpLink
    this.#setUpSection = setUpSection
    this.#stage = stage
    this.#title = main.querySelector(".line-up h2")
    this.#titled = document.title
    this.#form.addEventListener("change", event => this.onChanged(event))
    this.#form.addEventListener("submit", event => this.onSwitchedOn(event))
    back.addEventListener("click", linked)
    setUpLink.addEventListener("click", linked)
    addEventListener("popstate", () => this.onAddressChanged())
    addEventListener("scroll", () => this.#draw(), { passive: true })
    turnByHand(stage, {
      turn: (across, down) => this.#byHand(setUpSection, setUp => setUp.turnBy(across, down)),
      letGo: () => this.#byHand(setUpSection, setUp => setUp.letGo())
    })
    observer.observe(canvas)
  }

  async start() {
    const renderer = this.#renderer

    await renderer.init()
    this.#anisotropy = renderer.getMaxAnisotropy()
    this.#studio = new Studio(renderer)
    this.#ask()
    this.#travel()
  }

  // A link within the page travels where it leads, but one opened in a new
  // tab or window opens there.
  onLinked(event) {
    const elsewhere = openedElsewhere(event)

    if (elsewhere) {
      return
    }

    event.preventDefault()

    const address = new URL(event.currentTarget.href)

    this.#go(address)
  }

  // Switching on travels to the desk the form asks for, under an address of
  // its own.
  onSwitchedOn(event) {
    const data = new FormData(this.#form),
      query = new URLSearchParams(data),
      address = new URL(location.href)

    event.preventDefault()
    address.search = query.toString()
    this.#go(address)
  }

  onAddressChanged() {
    this.#ask()
    this.#travel()
  }

  onChanged({ target }) {
    const lettering = target.name == "language"

    if (lettering) {
      this.#letter(target.value)

      return
    }

    const chosen = this.#piecesChosen(),
      framing = this.#framing()

    this.#trouble = ""
    this.#tell()
    this.#drawn.choose(chosen, framing)
    this.#draw()
  }

  onPointerEnter(computer) {
    this.#hovered = computer
    this.#show()
  }

  onPointerLeave(computer) {
    const leaving = this.#hovered == computer

    if (leaving) {
      this.#hovered = null
      this.#show()
    }
  }

  // Only a focus the page shows, as the keyboard's is, shows its computer: one
  // handed back to a link after a click would keep it turning unasked.
  onFocus(computer, link) {
    const shown = link.matches(":focus-visible")

    if (shown) {
      this.#focused = computer
      this.#show()
    }
  }

  onBlur(computer) {
    const leaving = this.#focused == computer

    if (leaving) {
      this.#focused = null
      this.#show()
    }
  }

  onResized([entry]) {
    const { width, height } = entry.contentRect

    this.#renderer.setSize(width, height, false)
    this.#draw()
  }

  onFrame(now) {
    const flight = this.#flight,
      stirring = this.#drawn.advance(now),
      flying = flight != null && flight.advance(now),
      animating = this.#busy.size > 0,
      moving = stirring || flying || animating

    this.#render()

    if (!moving) {
      this.#renderer.setAnimationLoop(null)
      this.#drawing = false
    }
  }

  #go(address) {
    history.pushState(null, "", address)
    this.#ask()
    this.#travel()
  }

  // The place the address asks for; the language a desk asks for is its
  // computer's from then on.
  #ask() {
    const place = placeAsked(),
      { computer, desk } = place,
      lettered = desk != null

    if (lettered) {
      this.#languages.set(computer.name, desk.language)
    }

    this.#wanted = place
  }

  // One journey at a time, each to wherever the address last asked for, so the
  // browser's own Back and Forward may be pressed as often as the reader likes.
  async #travel() {
    if (this.#travelling) {
      return
    }

    this.#travelling = true
    this.#main.ariaBusy = "true"

    let there = this.#isThere()

    while (!there) {
      await this.#stepToward(this.#wanted)
      there = this.#isThere()
    }

    this.#main.ariaBusy = "false"
    this.#travelling = false
    this.#show()
  }

  #isThere() {
    const { computer, desk } = this.#wanted,
      atComputer = this.#showing == computer,
      atDesk = sameDesk(this.#running, desk)

    return this.#arrived && atComputer && atDesk
  }

  // A desk is left for its set-up, and a set-up for the line-up, before any
  // other is reached.
  #stepToward({ computer, desk }) {
    const first = !this.#arrived,
      inLineUp = this.#showing == null,
      running = this.#running != null

    if (first) {
      return this.#open(computer, desk)
    }

    if (inLineUp) {
      return this.#choose(computer, desk)
    }

    if (running) {
      return this.#switchOff()
    }

    const elsewhere = computer != this.#showing

    if (elsewhere) {
      return this.#back()
    }

    return this.#switchOn(desk)
  }

  // Where the page first stands, carried there from nowhere.
  #open(computer, desk) {
    const inLineUp = computer == null,
      running = desk != null

    if (inLineUp) {
      return this.#openLineUp()
    }

    if (running) {
      return this.#openDesk(computer, desk)
    }

    return this.#openSetUp(computer)
  }

  async #openLineUp() {
    const lineUp = new LineUp(),
      lettered = COMPUTERS.map(computer => this.#letteredOf(computer)),
      options = this.#options()

    await lineUp.load(lettered, options)
    this.#standLineUp(lineUp)
    this.#arrived = true

    const appearing = this.#animate(this.#lineUpSection, [{ opacity: 0 }, { opacity: 1 }], ARRIVING)

    await appearing.finished
    appearing.cancel()
  }

  async #openSetUp(computer) {
    const chosenAtFirst = chosenFor(computer, null),
      setUp = await this.#loadSetUp(computer)

    this.#drawn = setUp
    this.#showing = computer
    this.#arrived = true
    this.#laySetUp(computer, chosenAtFirst)

    const arriving = this.#animate(this.#panel, PANEL_ARRIVING, ARRIVING),
      chosen = this.#piecesChosen(),
      framing = this.#framing()

    setUp.choose(chosen, framing)
    this.#draw()
    await arriving.finished
    arriving.cancel()
  }

  async #openDesk(computer, desk) {
    const loaded = await this.#loadDesk(computer, desk),
      started = loaded != null

    if (!started) {
      return
    }

    this.#showing = computer
    this.#arrived = true
    this.#standDesk(computer, desk, loaded)
    this.#draw()
    this.#controls.focus({ preventScroll: true })
  }

  // The others clear away while the pieces the chosen computer may be given
  // load, and it goes on as it was shown; then it flies to its place on the
  // desk, the panel coming only once it has left the panel's side, and they
  // come.
  async #choose(computer, desk) {
    const { name, language } = this.#letteredOf(computer),
      lineUp = this.#drawn,
      setUp = new SetUp(),
      options = { ...this.#options(), language },
      loading = setUp.load(computer, options),
      leaving = this.#lineUpMotions(name),
      left = leaving.map(animation => animation.finished),
      chosenAtFirst = chosenFor(computer, desk)

    lineUp.show(name)
    this.#lineUpSection.inert = true
    this.#hovered = null
    this.#focused = null
    await Promise.all([loading, ...left])

    const frame = this.#frameOf(name),
      { model, pose } = lineUp.release(name)

    lineUp.dispose()
    setUp.stand(model)
    this.#hide(this.#lineUpSection)
    this.#drawn = setUp
    this.#showing = computer
    this.#flight = new Flight(name, { pose, frame })
    this.#laySetUp(computer, chosenAtFirst)
    this.#setUpSection.inert = true

    const waiting = { ...ARRIVING, delay: Flight.MILLISECONDS / 2 },
      arriving = this.#animate(this.#panel, PANEL_ARRIVING, waiting),
      flying = this.#fly()

    await Promise.all([flying, arriving.finished])
    arriving.cancel()

    const chosen = this.#piecesChosen(),
      framing = this.#framing()

    setUp.choose(chosen, framing)
    this.#setUpSection.inert = false
    this.#heading.focus({ preventScroll: true })
    this.#draw()
  }

  // The pieces go while the other computers load; then the computer flies
  // back to its place in the line-up, and they come either side of it.
  async #back() {
    const computer = this.#showing,
      { name } = computer,
      setUp = this.#drawn,
      lineUp = new LineUp(),
      others = COMPUTERS.filter(each => each != computer).map(each => this.#letteredOf(each)),
      options = this.#options(),
      loading = lineUp.load(others, options),
      framing = this.#framing(),
      going = setUp.leave(framing),
      panelKeyframes = PANEL_ARRIVING.toReversed(),
      leaving = this.#animate(this.#panel, panelKeyframes, LEAVING)

    this.#setUpSection.inert = true
    this.#draw()
    await Promise.all([loading, going, leaving.finished])

    const [from] = setUp.views(each => this.#frameOf(each)),
      model = setUp.release()

    this.#flight = new Flight(name, from)
    setUp.dispose()
    lineUp.stand(name, model, this.#studio)
    this.#hide(this.#setUpSection)
    this.#showing = null
    this.#standLineUp(lineUp)
    this.#lineUpSection.inert = true

    const item = this.#items.get(name),
      link = item.querySelector("a")

    item.scrollIntoView({ block: "center" })

    const entering = this.#lineUpMotions(name, { returning: true }),
      entered = entering.map(animation => animation.finished)

    await this.#fly()

    for (const animation of entering) {
      animation.play()
    }

    this.#draw()
    await Promise.all(entered)

    for (const animation of entering) {
      animation.cancel()
    }

    this.#lineUpSection.inert = false
    link.focus({ preventScroll: true })
  }

  // The panel goes while the desk loads, and the set-up, brought into line
  // with the desk asked for, is kept behind it for the way back; the desk then
  // stands where the set-up stood, the eye carried from the set-up's view to
  // the desk's. A desk that does not start leaves the set-up as it was.
  async #switchOn(desk) {
    const computer = this.#showing,
      setUp = this.#drawn,
      framing = this.#framing(),
      loading = this.#loadDesk(computer, desk),
      lettering = setUp.takeLanguage(desk.language),
      panelKeyframes = PANEL_ARRIVING.toReversed(),
      leaving = this.#animate(this.#panel, panelKeyframes, LEAVING)

    this.#setUpSection.inert = true
    setUp.choose(desk.chosen, framing)

    const [loaded] = await Promise.all([loading, lettering, leaving.finished]),
      started = loaded != null

    if (!started) {
      const returning = this.#animate(this.#panel, PANEL_ARRIVING, ARRIVING),
        button = this.#form.querySelector("button")

      leaving.cancel()
      this.#tell()
      this.#setUpSection.inert = false
      button.focus({ preventScroll: true })
      await returning.finished
      returning.cancel()

      return
    }

    const [from] = setUp.views(each => this.#frameOf(each))

    this.#hide(this.#setUpSection)
    this.#setUp = setUp
    this.#standDesk(computer, desk, loaded)
    this.#deskSection.inert = true
    this.#flight = new Flight(computer.name, from)
    await this.#fly()
    this.#deskSection.inert = false
    this.#controls.focus({ preventScroll: true })
  }

  // The machine goes off, and whatever it held with it; the eye is carried
  // back to the set-up kept behind the desk, or to one set up afresh for a
  // desk opened by its address, and the panel comes.
  async #switchOff() {
    this.#deskSection.inert = true

    const computer = this.#showing,
      { chosen } = this.#running,
      drawn = this.#drawn,
      { language } = this.#letteredOf(computer),
      setUp = this.#setUp ?? (await this.#loadSetUp(computer))

    await setUp.takeLanguage(language)

    const [from] = drawn.views(each => this.#frameOf(each))

    this.#controls.remove()
    this.#optionsPanel.remove()
    this.#controls = null
    this.#optionsPanel = null
    drawn.dispose()
    this.#hide(this.#deskSection)
    this.#setUp = null
    this.#running = null
    this.#drawn = setUp
    this.#flight = new Flight(computer.name, from)
    this.#laySetUp(computer, chosen)
    this.#setUpSection.inert = true

    const waiting = { ...ARRIVING, delay: Flight.MILLISECONDS / 2 },
      arriving = this.#animate(this.#panel, PANEL_ARRIVING, waiting),
      flying = this.#fly()

    await Promise.all([flying, arriving.finished])
    arriving.cancel()

    const framing = this.#framing()

    setUp.choose(chosen, framing)
    this.#setUpSection.inert = false
    this.#heading.focus({ preventScroll: true })
    this.#draw()
  }

  async #fly() {
    this.#draw()
    await this.#flight.finished
    this.#flight = null
    this.#draw()
  }

  // A set-up stands its computer, seen small, before every piece it may be
  // given.
  async #loadSetUp(computer) {
    const setUp = new SetUp(),
      { language } = this.#letteredOf(computer),
      seenSmall = { anisotropy: this.#anisotropy, small: true, language },
      options = { ...this.#options(), language },
      loading = [Model.load(computer.name, seenSmall), setUp.load(computer, options)],
      [model] = await Promise.all(loading)

    setUp.stand(model)

    return setUp
  }

  // A desk switched on is loaded afresh, its models seen close, and its
  // shaders are compiled as it will first be seen, so that nothing waits on
  // them once it is drawn. One that does not start is not switched on: the
  // address goes back to its set-up, which says why.
  async #loadDesk(computer, { language, chosen }) {
    const loaded = new Desk(),
      asked = { computer: computer.name, language, pieces: {} },
      options = this.#options()

    for (const piece of chosen) {
      asked.pieces[PIECES[piece].kind] = piece
    }

    try {
      await loaded.load(asked, options)
    } catch (problem) {
      this.#refuse(computer, problem)

      return null
    }

    const canvas = this.#canvasSize(),
      frame = { left: 0, top: 0, ...canvas },
      [{ pose }] = loaded.views(() => frame)

    pose.place(this.#camera, frame, canvas)
    await this.#renderer.compileAsync(loaded.scene, this.#camera)

    return loaded
  }

  #standLineUp(lineUp) {
    const shown = this.#hovered ?? this.#focused,
      spans = []

    for (const [name, item] of this.#items) {
      const { span, aspect } = lineUp.frameOf(name)

      item.style.setProperty("--span", span)
      item.style.setProperty("--aspect", aspect)
      spans.push(span)
    }

    const widest = Math.max(...spans)

    this.#lineUpSection.style.setProperty("--widest", widest)
    this.#lineUpSection.hidden = false
    document.title = this.#titled
    this.#drawn = lineUp
    lineUp.show(shown)
    this.#draw()
  }

  #laySetUp(computer, chosen) {
    const { language } = this.#letteredOf(computer)

    this.#form.innerHTML = formOf(computer, language, chosen)
    this.#setUpSection.hidden = false
    scrollTo(0, 0)
    this.#name(computer, language)
    this.#tell()
  }

  // The desk stands across a section of its own, under the reader's hands.
  #standDesk(computer, desk, loaded) {
    const controls = document.createElement("colophon-desk-controls"),
      options = document.createElement("colophon-options"),
      address = addressOf(computer)

    this.#deskSection.append(controls, options)
    controls.use(loaded)
    options.use(loaded)
    this.#controls = controls
    this.#optionsPanel = options
    this.#setUpLink.href = address
    this.#deskSection.hidden = false
    this.#drawn = loaded
    this.#running = desk
    this.#trouble = ""
    scrollTo(0, 0)
    this.#name(computer, desk.language)
  }

  #name(computer, language) {
    const heading = headingOf(computer, language)

    this.#heading.textContent = heading
    this.#deskHeading.textContent = heading
    document.title = `${heading} · ${this.#titled}`
  }

  // The computer set up, and every piece offered with it, take the language
  // chosen, which the computer keeps for as long as the page stands.
  async #letter(language) {
    const computer = this.#showing

    this.#languages.set(computer.name, language)
    this.#name(computer, language)
    await this.#drawn.takeLanguage(language)
    this.#draw()
  }

  // A computer by its name, in the language it was last chosen in.
  #letteredOf(computer) {
    const { name } = computer,
      language = this.#languages.get(name) ?? languageAtFirst(computer)

    return { name, language }
  }

  // The title rises away, the computers either side of the one chosen slide off
  // their own side of the page, each side together so that none passes
  // another, and the chosen one's words fade where it stands; or, for one
  // returning, all of it comes back, waiting to be played.
  #lineUpMotions(name, { returning = false } = {}) {
    const width = this.#canvas.clientWidth,
      items = Array.from(this.#items.values()),
      chosenAt = items.findIndex(item => item.dataset.computer == name),
      rects = items.map(item => item.getBoundingClientRect()),
      before = rects.slice(0, chosenAt).map(rect => rect.right),
      after = rects.slice(chosenAt + 1).map(rect => rect.left),
      leftward = -Math.max(0, ...before),
      rightward = width - Math.min(width, ...after),
      motions = [[this.#title, TITLE_LEAVING]]

    for (const [index, item] of items.entries()) {
      const chosen = index == chosenAt,
        away = index < chosenAt ? leftward : rightward,
        sliding = [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: `translateX(${away}px)` }
        ]

      if (chosen) {
        for (const words of item.querySelectorAll(".name, .made, ul")) {
          motions.push([words, WORDS_LEAVING])
        }
      } else {
        motions.push([item, sliding])
      }
    }

    const timing = returning ? ARRIVING : LEAVING,
      animations = []

    for (const [element, keyframes] of motions) {
      const played = returning ? keyframes.toReversed() : keyframes,
        animation = this.#animate(element, played, timing)

      if (returning) {
        animation.pause()
      }

      animations.push(animation)
    }

    return animations
  }

  #animate(element, keyframes, { duration, easing, delay = 0 }) {
    const reduced = REDUCED_MOTION.matches,
      timing = reduced ? { duration: 0, fill: "both" } : { duration, easing, delay, fill: "both" },
      animation = element.animate(keyframes, timing),
      busy = this.#busy

    busy.add(animation)
    animation.addEventListener("finish", () => busy.delete(animation))
    animation.addEventListener("cancel", () => busy.delete(animation))
    this.#draw()

    return animation
  }

  #hide(section) {
    const animations = section.getAnimations({ subtree: true })

    section.hidden = true

    for (const animation of animations) {
      animation.cancel()
    }
  }

  #piecesChosen() {
    const inputs = this.#form.querySelectorAll(":checked:not([name='language'])")

    return Array.from(inputs, input => input.value)
  }

  // The line under the computer's name says what stands with it, and Switch
  // on is offered only where the desk runs what was chosen, the reason given
  // where it does not, or why it did not start when last switched on.
  #tell() {
    const computer = this.#showing,
      chosen = this.#piecesChosen(),
      named = chosen.map(function (value) {
        const { title, description } = PIECES[value]

        return `the ${title} ${description}`
      }),
      display = computer.displays.find(each => chosen.includes(each)),
      reason = whyNotRunning(computer, display),
      runs = reason == "",
      button = this.#form.querySelector("button"),
      note = this.#form.querySelector("p")

    this.#line.textContent = `with ${named.join(" and ")}`
    button.disabled = !runs
    note.textContent = runs ? this.#trouble : reason
  }

  // The reader is told why the desk did not start, and so is the page.
  #refuse(computer, problem) {
    const address = addressOf(computer)

    reportError(problem)
    history.replaceState(null, "", address)
    this.#ask()
    this.#trouble = `The ${computer.title} did not start: ${problem.message}`
  }

  #show() {
    const shown = this.#hovered ?? this.#focused,
      inLineUp = this.#showing == null && !this.#travelling

    if (inLineUp) {
      this.#drawn.show(shown)
      this.#draw()
    }
  }

  #options() {
    return { anisotropy: this.#anisotropy, studio: this.#studio }
  }

  // The section whatever is drawn stands in.
  #sectionShown() {
    const inLineUp = this.#showing == null,
      running = this.#running != null

    if (inLineUp) {
      return this.#lineUpSection
    }

    return running ? this.#deskSection : this.#setUpSection
  }

  // A press can outlast the section it began in, and turns only what is drawn
  // there.
  #byHand(section, act) {
    const drawnThere = this.#sectionShown() == section

    if (drawnThere) {
      act(this.#drawn)
      this.#draw()
    }
  }

  // A computer in the line-up stands in its own frame there, on its desk in
  // the set-up's stage, and switched on across the whole of the desk's section.
  #frameOf(name) {
    const section = this.#sectionShown(),
      inLineUp = section == this.#lineUpSection,
      running = section == this.#deskSection

    if (inLineUp) {
      const item = this.#items.get(name),
        frame = item.querySelector(".frame")

      return rectOf(frame)
    }

    return rectOf(running ? this.#deskSection : this.#stage)
  }

  #draw() {
    const idle = this.#drawn != null && !this.#drawing

    if (idle) {
      this.#drawing = true
      this.#renderer.setAnimationLoop(this.#onFrame)
    }
  }

  #canvasSize() {
    const { clientWidth: width, clientHeight: height } = this.#canvas

    return { width, height }
  }

  // How the set-up's stage is framed on the canvas.
  #framing() {
    const frame = rectOf(this.#stage),
      canvas = this.#canvasSize()

    return { frame, canvas }
  }

  // A computer in flight is drawn where its flight has reached.
  #render() {
    const flight = this.#flight,
      canvas = this.#canvasSize(),
      standing = this.#drawn.views(name => this.#frameOf(name)),
      views = standing.map(function (view) {
        const flown = flight != null && flight.name == view.name

        return flown ? flight.over(view) : view
      })

    this.#canvas.style.transform = `translateY(${scrollY}px)`
    drawViews(this.#renderer, this.#camera, views, canvas)
  }
}

const main = document.querySelector("main"),
  showroom = new Showroom(main)

showroom.start()

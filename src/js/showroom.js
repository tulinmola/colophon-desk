import { Flight, LineUp, Model, REDUCED_MOTION, SetUp, Studio, drawViews } from "./models"
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

const LEGENDS = { monitor: "Monitor", television: "Television" }

// How a computer is named in each language its keys were lettered in, and what
// that keyboard was.
const LANGUAGES = {
  en: { adjective: "English", keyboard: "QWERTY, with £" },
  fr: { adjective: "French", keyboard: "AZERTY" },
  de: { adjective: "German", keyboard: "Schneider's, QWERTY with £" },
  es: { adjective: "Spanish", keyboard: "QWERTY, with Ñ" }
}

// The reader's own language where the computer was lettered in it, or the
// first it offers.
function languageAtFirst({ languages }) {
  const spoken = navigator.languages.map(tag => tag.split("-")[0]),
    shared = spoken.find(language => languages.includes(language))

  return shared ?? languages[0]
}

function headingOf({ title, languages }, language) {
  const several = languages.length > 1

  return several ? `Your ${LANGUAGES[language].adjective} ${title}` : `Your ${title}`
}

function itemOf({ name, title, maker, year, features }) {
  const listed = features.map(feature => html`<li>${feature}</li>`).join("")

  return html`<li data-computer="${name}">
    <a href="?computer=${name}" aria-describedby="${name}-features">
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

function languageOptionOf(language, chosen) {
  const { adjective, keyboard } = LANGUAGES[language],
    checked = chosen ? "checked" : ""

  return html`<label>
    <input type="radio" name="language" value="${language}" ${checked} />
    <span class="name">${adjective}</span>
    <span class="made">${keyboard}</span>
  </label>`
}

function formOf({ name, languages, displays, beside, chosenAtFirst }, language) {
  const several = languages.length > 1,
    lettered = languages.map(each => languageOptionOf(each, each == language)).join(""),
    languageChoice = several
      ? html`<fieldset>
          <legend>Language</legend>
          ${lettered}
        </fieldset>`
      : "",
    [first] = displays,
    { kind } = PIECES[first],
    displayed = displays.map(each => optionOf(each, "radio", each == first)).join(""),
    offeredBeside = beside
      .map(function (each) {
        const chosen = chosenAtFirst.includes(each)

        return optionOf(each, "checkbox", chosen)
      })
      .join("")

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
    <button type="submit">Switch on</button>`
}

// The address names the computer being set up, or none for the line-up. One
// it does not know leads to the line-up.
function computerAsked() {
  const query = new URLSearchParams(location.search),
    name = query.get("computer"),
    computer = COMPUTERS.find(each => each.name == name)

  return computer ?? null
}

function addressOf(computer) {
  const address = new URL(location.href),
    query = computer == null ? "" : `?computer=${computer.name}`

  address.search = query

  return address
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

// One canvas under the whole page draws the line-up and a computer's set-up,
// and carries the computer chosen from one to the other: only the pieces it
// may be given are loaded on the way, and what leaves is freed once gone.
class Showroom {
  #anisotropy
  #arrived = false
  #busy = new Set()
  #camera = new PerspectiveCamera()
  #canvas
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
  #panel
  #renderer
  #setUpSection
  #showing = null
  #stage
  #studio
  #title
  #titled
  #travelling = false
  #wanted = null

  constructor(main) {
    const renderer = new WebGPURenderer({ alpha: true, antialias: true }),
      canvas = renderer.domElement,
      resized = this.onResized.bind(this),
      observer = new ResizeObserver(resized),
      chosen = this.onChosen.bind(this),
      list = main.querySelector("ol"),
      back = main.querySelector(".panel a")

    renderer.setPixelRatio(devicePixelRatio)
    renderer.toneMapping = NeutralToneMapping
    renderer.autoClear = false
    history.scrollRestoration = "manual"
    main.prepend(canvas)
    list.innerHTML = COMPUTERS.map(itemOf).join("")

    for (const item of list.children) {
      const link = item.querySelector("a"),
        { computer } = item.dataset

      link.addEventListener("click", chosen)
      link.addEventListener("pointerenter", () => this.onPointerEnter(computer))
      link.addEventListener("pointerleave", () => this.onPointerLeave(computer))
      link.addEventListener("focus", () => this.onFocus(computer, link))
      link.addEventListener("blur", () => this.onBlur(computer))
      this.#items.set(computer, item)
    }

    this.#canvas = canvas
    this.#form = main.querySelector("form")
    this.#heading = main.querySelector(".set-up h2")
    this.#line = main.querySelector(".set-up p")
    this.#lineUpSection = main.querySelector(".line-up")
    this.#main = main
    this.#onFrame = this.onFrame.bind(this)
    this.#panel = main.querySelector(".panel")
    this.#renderer = renderer
    this.#setUpSection = main.querySelector(".set-up")
    this.#stage = main.querySelector(".stage")
    this.#title = main.querySelector(".line-up h2")
    this.#titled = document.title
    this.#form.addEventListener("change", event => this.onChanged(event))
    back.addEventListener("click", event => this.onBack(event))
    addEventListener("popstate", () => this.onAddressChanged())
    addEventListener("scroll", () => this.#draw(), { passive: true })
    observer.observe(canvas)
  }

  async start() {
    const renderer = this.#renderer

    await renderer.init()
    this.#anisotropy = renderer.getMaxAnisotropy()
    this.#studio = new Studio(renderer)
    this.#wanted = computerAsked()
    this.#travel()
  }

  onChosen(event) {
    const elsewhere = openedElsewhere(event)

    if (elsewhere) {
      return
    }

    event.preventDefault()

    const { computer: name } = event.currentTarget.closest("li").dataset,
      computer = COMPUTERS.find(each => each.name == name)

    this.#go(computer)
  }

  onBack(event) {
    const elsewhere = openedElsewhere(event)

    if (elsewhere) {
      return
    }

    event.preventDefault()
    this.#go(null)
  }

  onAddressChanged() {
    this.#wanted = computerAsked()
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

  #go(computer) {
    const address = addressOf(computer)

    history.pushState(null, "", address)
    this.#wanted = computer
    this.#travel()
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
    return this.#arrived && this.#showing == this.#wanted
  }

  #stepToward(wanted) {
    const first = !this.#arrived,
      inLineUp = this.#showing == null

    if (first) {
      return wanted == null ? this.#openLineUp() : this.#openSetUp(wanted)
    }

    if (inLineUp) {
      return this.#choose(wanted)
    }

    return this.#back()
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
    const setUp = new SetUp(),
      { language } = this.#letteredOf(computer),
      seenSmall = { anisotropy: this.#anisotropy, small: true, language },
      options = { ...this.#options(), language },
      loading = [Model.load(computer.name, seenSmall), setUp.load(computer, options)],
      [model] = await Promise.all(loading)

    setUp.stand(model)
    this.#drawn = setUp
    this.#showing = computer
    this.#arrived = true
    this.#laySetUp(computer)

    const arriving = this.#animate(this.#panel, PANEL_ARRIVING, ARRIVING),
      chosen = this.#piecesChosen(),
      framing = this.#framing()

    setUp.choose(chosen, framing)
    this.#draw()
    await arriving.finished
    arriving.cancel()
  }

  // The others clear away while the pieces the chosen computer may be given
  // load, and it goes on as it was shown; then it flies to its place on the
  // desk, the panel coming only once it has left the panel's side, and they
  // come.
  async #choose(computer) {
    const { name, language } = this.#letteredOf(computer),
      lineUp = this.#drawn,
      setUp = new SetUp(),
      options = { ...this.#options(), language },
      loading = setUp.load(computer, options),
      leaving = this.#lineUpMotions(name),
      left = leaving.map(animation => animation.finished)

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
    this.#laySetUp(computer)
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

  async #fly() {
    this.#draw()
    await this.#flight.finished
    this.#flight = null
    this.#draw()
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

  #laySetUp(computer) {
    const { language } = this.#letteredOf(computer)

    this.#form.innerHTML = formOf(computer, language)
    this.#setUpSection.hidden = false
    scrollTo(0, 0)
    this.#name(computer, language)
    this.#tell()
  }

  #name(computer, language) {
    const heading = headingOf(computer, language)

    this.#heading.textContent = heading
    document.title = `${heading} · ${this.#titled}`
  }

  // The computer set up, and every piece offered with it, take the language
  // chosen, which the computer keeps for as long as the page stands.
  async #letter(language) {
    const computer = this.#showing

    this.#languages.set(computer.name, language)
    this.#name(computer, language)
    await this.#drawn.reprint(language)
    this.#draw()
  }

  // A computer by its name, in the language its keys were last chosen in.
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

  // The line under the computer's name says what stands with it.
  #tell() {
    const chosen = this.#piecesChosen(),
      named = chosen.map(function (value) {
        const { title, description } = PIECES[value]

        return `the ${title} ${description}`
      })

    this.#line.textContent = `with ${named.join(" and ")}`
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

  // A computer in the line-up stands in its own frame there, and on its desk
  // in the set-up's stage.
  #frameOf(name) {
    const inLineUp = this.#showing == null,
      item = this.#items.get(name),
      element = inLineUp ? item.querySelector(".frame") : this.#stage

    return rectOf(element)
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

    drawViews(this.#renderer, this.#camera, views, canvas)
  }
}

const main = document.querySelector("main"),
  showroom = new Showroom(main)

showroom.start()

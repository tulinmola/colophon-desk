import { Group, SRGBColorSpace, TextureLoader } from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import KeycapMaterial from "./keycap_material"
import Lead from "./lead"
import ScreenMaterial from "./screen_material"

// A print is laid in the language asked for where it was drawn in it, and in
// its model's own where it was not.
function languageOf({ languages }, asked) {
  const drawn = languages.includes(asked)

  return drawn ? asked : languages[0]
}

function printUrl(name, { language, small }) {
  if (small) {
    return new URL(`../../assets/textures/${language}/small/${name}.png`, import.meta.url)
  }

  return new URL(`../../assets/textures/${language}/${name}.png`, import.meta.url)
}

// glTF lays a texture's first row at the top of its image, as the builder's prints and the emulator's pictures are made: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images
async function loadPrint(name, printing) {
  const url = printUrl(name, printing),
    loader = new TextureLoader(),
    print = await loader.loadAsync(url.href)

  print.colorSpace = SRGBColorSpace
  print.flipY = false
  print.anisotropy = printing.anisotropy

  return print
}

// A part drawn for some versions of its model alone stands in the language of those versions.
function standIn(part, language) {
  part.visible = part.userData.versions.includes(language)
}

export default class Model extends Group {
  keyboard = null
  lead = null
  #asked
  #printing
  #prints = []
  #versioned = []

  static async load(name, { anisotropy, keys, small, language }) {
    const url = new URL(`../../assets/models/${name}.glb`, import.meta.url),
      loader = new GLTFLoader(),
      gltf = await loader.loadAsync(url.href),
      model = new Model(),
      printed = [],
      lettered = [],
      versioned = []

    let leading = null

    model.name = name
    model.add(...gltf.scene.children)
    model.traverse(function (part) {
      const hasPrint = Object.hasOwn(part.userData, "print"),
        hasLegends = Object.hasOwn(part.userData, "legends"),
        hasVersions = Object.hasOwn(part.userData, "versions"),
        hasLead = Object.hasOwn(part.userData, "lead")

      if (hasPrint) {
        printed.push(part)
      }

      if (hasLegends) {
        lettered.push(part)
      }

      if (hasVersions) {
        versioned.push(part)
      }

      if (hasLead) {
        leading = part
      }
    })

    model.#asked = language
    model.#printing = { small, anisotropy }
    model.#versioned = versioned

    for (const part of versioned) {
      standIn(part, language)
    }

    if (leading) {
      model.lead = new Lead(model, leading)
    }

    const byAtlas = Map.groupBy(lettered, keycap => keycap.userData.legends),
      capSets = byAtlas.values(),
      laying = printed.map(part => model.#printOn(part)),
      lettering = Array.from(capSets, keycaps => model.#letter(keycaps, keys))

    await Promise.all([...laying, ...lettering])

    return model
  }

  // The parts drawn for the language asked for stand, and each print drawn in it
  // takes its place where it stands; only the last language asked for is laid.
  async takeLanguage(language) {
    this.#asked = language

    for (const part of this.#versioned) {
      standIn(part, language)
    }

    const changing = this.#prints.filter(laid => languageOf(laid, language) != laid.language),
      loading = changing.map(laid => this.#load(laid.name, laid)),
      loaded = await Promise.all(loading),
      overtaken = this.#asked != language

    if (overtaken) {
      return
    }

    for (const [index, laid] of changing.entries()) {
      const { print, language: drawnIn } = loaded[index]

      // The image is copied into the texture already on the GPU at that
      // texture's size, so every language of a print is drawn at one size.
      laid.print.image = print.image
      laid.print.needsUpdate = true
      laid.language = drawnIn
    }
  }

  showPicture({ node, lines }) {
    let screen = null

    this.traverse(function (part) {
      const lit = Object.hasOwn(part.userData, "screen")

      if (lit) {
        screen = new ScreenMaterial(part.geometry, node, lines)
        part.material = screen
      }
    })

    return screen
  }

  // The walk starts from the children: the model in its own set would dispose
  // of itself without end.
  dispose() {
    const prints = this.#prints.map(laid => laid.print),
      owned = new Set(prints)

    for (const child of this.children) {
      child.traverse(function (part) {
        const drawn = part.isMesh

        owned.add(part)

        if (drawn) {
          owned.add(part.geometry)
          owned.add(part.material)
        }
      })
    }

    for (const resource of owned) {
      resource.dispose()
    }

    super.dispose()
  }

  async #printOn(part) {
    const { print, language } = await this.#load(part.userData.print, part.userData)

    part.material.color.setRGB(1, 1, 1)
    part.material.map = print
    this.#prints.push({
      name: part.userData.print,
      languages: part.userData.languages,
      print,
      language
    })
  }

  // Caps of one plastic share one material, and caps of every plastic one atlas
  // and one travel.
  async #letter(keycaps, keys) {
    const [keycap] = keycaps,
      { legends, languages } = keycap.userData,
      { print: atlas, language } = await this.#load(legends, keycap.userData),
      settings = KeycapMaterial.settings(),
      byPlastic = Map.groupBy(keycaps, lettered => lettered.material)

    for (const [plastic, caps] of byPlastic) {
      const material = new KeycapMaterial(plastic, atlas, keys, settings)

      for (const lettered of caps) {
        lettered.material = material
      }
    }

    this.keyboard = settings
    this.#prints.push({ name: legends, languages, print: atlas, language })
  }

  async #load(name, drawn) {
    const language = languageOf(drawn, this.#asked),
      printing = { ...this.#printing, language },
      print = await loadPrint(name, printing)

    return { print, language }
  }
}

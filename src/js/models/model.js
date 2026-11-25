import { Group, SRGBColorSpace, TextureLoader } from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import KeycapMaterial from "./keycap_material"
import ScreenMaterial from "./screen_material"

// Each model's prints are in the language of the units it was drawn from: the
// Spanish CPCs with their monitor and disc, and the English Spectrum.
const LANGUAGES = { cpc6128: "es", cpc464: "es", spectrum48: "en", ctm644: "es", cf2: "es" }

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

export default class Model extends Group {
  keyboard = null
  #prints = []

  static async load(name, { anisotropy, keys, small }) {
    const url = new URL(`../../assets/models/${name}.glb`, import.meta.url),
      loader = new GLTFLoader(),
      gltf = await loader.loadAsync(url.href),
      printing = { language: LANGUAGES[name], small, anisotropy },
      model = new Model(),
      printed = [],
      lettered = []

    model.name = name
    model.add(...gltf.scene.children)
    model.traverse(function (part) {
      const hasPrint = Object.hasOwn(part.userData, "print"),
        hasLegends = Object.hasOwn(part.userData, "legends")

      if (hasPrint) {
        printed.push(part)
      }

      if (hasLegends) {
        lettered.push(part)
      }
    })

    const byAtlas = Map.groupBy(lettered, keycap => keycap.userData.legends),
      capSets = byAtlas.values(),
      laying = printed.map(part => model.#printOn(part, printing)),
      lettering = Array.from(capSets, keycaps => model.#letter(keycaps, printing, keys))

    await Promise.all([...laying, ...lettering])

    return model
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
    const owned = new Set(this.#prints)

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

  async #printOn(part, printing) {
    const print = await loadPrint(part.userData.print, printing)

    part.material.color.setRGB(1, 1, 1)
    part.material.map = print
    this.#prints.push(print)
  }

  // Caps of one plastic share one material, and caps of every plastic one atlas
  // and one travel.
  async #letter(keycaps, printing, keys) {
    const [keycap] = keycaps,
      atlas = await loadPrint(keycap.userData.legends, printing),
      settings = KeycapMaterial.settings(),
      byPlastic = Map.groupBy(keycaps, lettered => lettered.material)

    for (const [plastic, caps] of byPlastic) {
      const material = new KeycapMaterial(plastic, atlas, keys, settings)

      for (const lettered of caps) {
        lettered.material = material
      }
    }

    this.keyboard = settings
    this.#prints.push(atlas)
  }
}

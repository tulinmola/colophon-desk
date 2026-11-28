import { Cpc, KEY_MATRIX } from "../src/js/emulator/index.js"

// How long a 6128 is run to stand at its prompt, and how long a key is held
// and then left, in the machine's own milliseconds: each the most one advance
// runs.
const BOOT_MILLISECONDS = 6400,
  KEY_MILLISECONDS = 80

// A 6128 run with nothing drawn, standing at its prompt. Its clock starts
// where the machine's own did, as it was made, so the whole of its boot is run
// however long its firmware took to fetch.
export default async function machineAtPrompt(language) {
  const machine = new AbortController(),
    cpc = await Cpc.create(machine.signal, { anisotropy: 1, language })

  let clock = performance.now()

  function run(milliseconds) {
    clock += milliseconds
    cpc.advance(clock)
  }

  function type(codes) {
    for (const code of codes) {
      const [key] = KEY_MATRIX[code]

      cpc.pressKey(key)
      run(KEY_MILLISECONDS)
      cpc.releaseKey(key)
      run(KEY_MILLISECONDS)
    }
  }

  for (let ran = 0; ran < BOOT_MILLISECONDS; ran += KEY_MILLISECONDS) {
    run(KEY_MILLISECONDS)
  }

  return { cpc, run, type }
}

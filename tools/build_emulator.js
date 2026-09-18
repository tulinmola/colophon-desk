import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const HERE = fileURLToPath(import.meta.url),
  ROOT = resolve(HERE, "../.."),
  EMULATOR_DIR = resolve(ROOT, process.env.EMULATOR_DIR ?? "../colophon-emulator"),
  MACHINE_DIR = resolve(EMULATOR_DIR, "src"),
  HOST_DIR = resolve(ROOT, "emulator"),
  VENDOR_DIR = resolve(ROOT, "src/js/vendor"),
  EXPORTS = resolve(HOST_DIR, "exports.json"),
  HOST = resolve(HOST_DIR, "desk.c")

function git(...args) {
  const output = execFileSync("git", ["-C", EMULATOR_DIR, ...args], { encoding: "utf8" })

  return output.trim()
}

// The host is this repository's and the machine is the emulator's, so a
// commit alone cannot tell two builds apart: a name that outlives an edit to
// desk.c is a page unable to say which module it is running.
function hostDigest() {
  const digest = createHash("sha256")

  for (const path of [EXPORTS, HOST]) {
    const bytes = readFileSync(path)

    digest.update(bytes)
  }

  return digest.digest("hex").slice(0, 7)
}

function machineVersion() {
  const commit = git("rev-parse", "--short", "HEAD"),
    // A build from uncommitted sources must not answer to a commit's name, and
    // every .c in the tree is compiled, so an untracked one counts as a change
    // where `git diff` would not see it.
    changes = git("status", "--porcelain", "--", "src"),
    clean = changes.length == 0

  return clean ? commit : `${commit}-dirty`
}

function machineSources() {
  const names = readdirSync(MACHINE_DIR),
    sources = names.filter(name => name.endsWith(".c"))

  return sources.map(name => resolve(MACHINE_DIR, name))
}

const stood = existsSync(MACHINE_DIR)

if (!stood) {
  console.error(`no emulator at ${EMULATOR_DIR} — set EMULATOR_DIR to your checkout`)
  process.exit(1)
}

const basename = `colophon-emulator-${machineVersion()}-${hostDigest()}`,
  module = resolve(VENDOR_DIR, `${basename}.mjs`),
  version = execFileSync("emcc", ["--version"], { encoding: "utf8" })

console.log(`==> Building ${basename} from ${EMULATOR_DIR}`)
console.log(version.split("\n")[0])

mkdirSync(VENDOR_DIR, { recursive: true })
execFileSync(
  "emcc",
  [
    ...machineSources(),
    HOST,
    "-I",
    MACHINE_DIR,
    "-std=c99",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-O3",
    "-s",
    "MODULARIZE=1",
    "-s",
    "EXPORT_ES6=1",
    "-s",
    "EXPORT_NAME=ColophonEmulator",
    "-s",
    "FILESYSTEM=0",
    // The page takes a view onto the framebuffer once and keeps it for the
    // machine's life; growing the heap would detach it.
    "-s",
    "ALLOW_MEMORY_GROWTH=0",
    "-s",
    "ENVIRONMENT=web",
    "-s",
    "SINGLE_FILE=1",
    "-s",
    `EXPORTED_FUNCTIONS=@${EXPORTS}`,
    "-s",
    "EXPORTED_RUNTIME_METHODS=HEAPU8",
    "-o",
    module
  ],
  { stdio: "inherit" }
)

// A superseded build left beside the new one is a module that can be imported
// by mistake and a page unable to say which machine it is running.
const superseded = readdirSync(VENDOR_DIR).filter(name => name != `${basename}.mjs`)

for (const name of superseded) {
  rmSync(resolve(VENDOR_DIR, name))
  console.log(`==> Removed the superseded src/js/vendor/${name}`)
}

console.log(`==> Wrote src/js/vendor/${basename}.mjs`)
console.log("==> Name it in src/js/emulator/module.js if it changed")

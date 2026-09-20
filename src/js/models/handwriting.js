// Patrick Hand stands in for the hand of an owner labelling a disc. Nothing here measures what pen they held or how they wrote, so the face is chosen by eye and is a guess; it is kept for its even stroke and its printed, unjoined letters, which hold together at the four millimetres the strip round the disc's end allows: https://github.com/google/fonts/tree/main/ofl/patrickhand
// Under the SIL Open Font License 1.1, whose text stands beside it.
const FACE = new URL("../../assets/fonts/PatrickHand-Regular.ttf", import.meta.url),
  FAMILY = "Patrick Hand"

// A desk taken down and stood up again would otherwise add the same face to the
// page a second time, and the page keeps every one it is given.
let writing = null

async function addFace() {
  const source = `url(${FACE.href})`,
    face = new FontFace(FAMILY, source),
    loaded = await face.load()

  document.fonts.add(loaded)
}

function loadHandwriting() {
  writing ??= addFace()

  return writing
}

export { FAMILY, loadHandwriting }

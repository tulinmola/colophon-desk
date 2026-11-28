import { drawCircle, makeCylinder } from "replicad"

// Amsoft's CL-1, "the AMSOFT CL1 lead, or any other equivalent standard cassette-interconnecting lead": "Insert the end of the lead with the larger (5-pin DIN) plug, into the socket marked TAPE on the computer", then "the Blue cable into the socket … marked REMOTE or REM", "the Red cable … MIC, COMPUTER IN, or INPUT" and "the White cable … EAR, COMPUTER OUT, or OUTPUT" [A], CPC664 and CPC6128 User Instructions, ch. 1 p. 7: https://archive.org/download/amstrad-cpc664-user-manual/page/n17.jpg and https://archive.org/download/amstrad-cpc-6128-user-manual/page/n19.jpg
// Amsoft's catalogue photographs it with a DIN plug, a ribbed relief and a dark cable, which a breakout sleeve divides into three tails ending in jack plugs, two of one size side by side and a third slimmer with a thinner pin [A, E]: https://archive.org/download/amsoft-winter-85-86-catalogue/page/n2.jpg. Amstrad gives no sizes. A DIN plug's shield is 13.2 across [C], https://en.wikipedia.org/wiki/DIN_connector; EAR and MIC are taken as 3.5 mm plugs and REM as 2.5, as early mono recorders took them, a 3.5 mm plug 15 long [C]: https://en.wikipedia.org/wiki/Phone_connector_(audio)
// Scaled by those plugs, the photograph makes the grip about 18 across, the lead about 1.1 m long, its tails about 120 and the sleeve about 25 [E], weak. Its cores are drawn side by side from where the cable leaves the DIN plug until they part toward their jacks, and the sleeve and the ribs are not drawn. How the colours are carried is not seen: the jack plugs' bodies are drawn in them and the cable dark.
// The grip's length and relief, the jack plugs' bodies and reliefs, the 2.5 mm plug's length and the cores' size are not measured: a grip 30 long with a relief 15 tapering from 10, bodies 8 across and 18 long with reliefs 6 tapering from 5, a 2.5 mm plug 11 long and cores 2.5 across, are guesses, and so are the colours' tones.
const DIN_PLUG = { body: 18, length: 30, reliefStart: 10, relief: 15 },
  JACK_PLUG = { body: 8, length: 18, reliefStart: 5, relief: 6 },
  CORE = { cable: 2.5, coil: 2.5, turns: 0 },
  TAILS = [
    { socket: "ear", shaft: 3.5, shaftLength: 15, colour: "white" },
    { socket: "rem", shaft: 2.5, shaftLength: 11, colour: "blue" },
    { socket: "mic", shaft: 3.5, shaftLength: 15, colour: "red" }
  ]

const DARK = { name: "cl1-cable", colour: "#1c1c1d" },
  PLASTICS = {
    white: { name: "cl1-white", colour: "#e6e3da" },
    blue: { name: "cl1-blue", colour: "#2d5b9a" },
    red: { name: "cl1-red", colour: "#b5322c" }
  }

const LEAD = "cl1",
  ANCHOR = `${LEAD}-anchor`,
  TIP = `${LEAD}-tip`

// How far the cable's end shows out of the DIN plug's relief, where the page takes the cable's colour from.
const CABLE_SHOWING = 1

function plugSection(diameter, y) {
  return drawCircle(diameter / 2).sketchOnPlane("XZ", -y)
}

// A plug's moulded body and strain relief behind its shoulder, ahead of which it enters its socket along y, its tail behind where the cable leaves it.
function plugMoulding({ body, length, reliefStart, relief }, cable) {
  const moulding = makeCylinder(body / 2, length, [0, -length, 0], [0, 1, 0]),
    reliefFront = plugSection(reliefStart, -length),
    reliefEnd = plugSection(cable, -(length + relief)),
    strainRelief = reliefFront.loftWith(reliefEnd, { ruled: true })

  return moulding.fuse(strainRelief)
}

// Where the plug ahead of something turned so far about the upright stands, so far back of it: x across, y back, as the models' frame runs.
function behind([x, y, z], turn, distance) {
  const radians = (turn * Math.PI) / 180

  return [x + Math.sin(radians) * distance, y - Math.cos(radians) * distance, z]
}

// The CL-1 held in a computer's TAPE socket by its DIN plug, whose shoulder stands at the mouth given turned so far about the upright, and running by the way given round the computer to whatever it is joined to, its cores parting there to their jacks. Unlaid, its cores stand stowed inside the computer.
export default function buildCl1({ mouth, turn, stowed, way, metal }) {
  const anchorTail = DIN_PLUG.length + DIN_PLUG.relief,
    tip = behind(mouth, turn, anchorTail + CABLE_SHOWING),
    showing = -anchorTail - CABLE_SHOWING,
    cableEnd = makeCylinder(CORE.cable / 2, 2 * CABLE_SHOWING, [0, showing, 0], [0, 1, 0]),
    jackTail = JACK_PLUG.length + JACK_PLUG.relief,
    passes = way.map((place, index) => ({ name: `${TIP}-way-${index}`, place, parts: [] }))

  const cores = TAILS.map(function ({ socket, shaft, shaftLength, colour }, index) {
    const name = `${LEAD}-${socket}`,
      first = index == 0,
      shaftShape = makeCylinder(shaft / 2, shaftLength, [0, 0, 0], [0, 1, 0]),
      plug = plugMoulding(JACK_PLUG, CORE.cable)

    return {
      name,
      place: stowed,
      lead: {
        ...CORE,
        tip: TIP,
        tail: `${name}-plug-tail`,
        sheath: `${ANCHOR}-cable`,
        socket: `${socket}-mouth`,
        anchor: first ? ANCHOR : null,
        bundle: LEAD
      },
      parts: [
        { name: `${name}-plug`, shape: plug, material: PLASTICS[colour] },
        { name: `${name}-shaft`, shape: shaftShape, material: metal },
        { name: `${name}-plug-tail`, place: [0, -jackTail, 0], parts: [] }
      ]
    }
  })

  return [
    {
      name: ANCHOR,
      place: mouth,
      turn,
      parts: [
        { name: `${ANCHOR}-plug`, shape: plugMoulding(DIN_PLUG, CORE.cable), material: DARK },
        { name: `${ANCHOR}-cable`, shape: cableEnd, material: DARK }
      ]
    },
    { name: TIP, place: tip, turn: turn + 180, parts: [] },
    { name: `${TIP}-way`, parts: passes },
    ...cores
  ]
}

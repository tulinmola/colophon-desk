import { drawCircle, makeCylinder } from "replicad"

// The two leads every CPC monitor carries to the computer, the D.C. Cord 170316 and the D.I.N. Cord 170317 of the GT64 and the GT65, and of the CTM644 as 170316/A and 170317/A [A], CPC464/CTM640/GT64 Service Manual p15, https://archive.org/details/amstrad-cpc-464-micro-computer-ctm-640-color-monitor-gt-64-green-monitor-service-manual, and CPC6128/CTM644/GT65 Service Manual p19 and p23, https://archive.org/details/amstrad-cpc-6128-micro-computer-ctm-644-color-monitor-gt-65-green-monitor-service-manual. "Connect the lead from the front of the monitor, which is fitted with the larger (6-pin DIN) plug, into the rear socket of the computer marked MONITOR", and the other, with the small plug, into the socket marked 5V DC [A], CPC6128 User Instructions ch. 1 p. 2: https://archive.org/details/amstrad-cpc-6128-user-manual
// Each is a coiled cord of round cable, about 4.5 thick, wound about 19 to 20 across in about 11 to 13 close turns [E], read on the Bibliothèque nationale's GT65-2 by its DIN plug's 13.2 shell and on an Amstrad CTM644 rectified at 4 pixels to the millimetre: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(14_of_20).jpg and https://web.archive.org/web/2023/https://oldcrap.org/2020/01/25/amstrad-ctm644-colour-monitor/. Amstrad's GT64 exploded view draws each coil near its plug, after a straight run from the cabinet [A], CPC464/CTM640/GT64 Service Manual p15, where the photographs show it starting at the cabinet. Nothing read gives either lead's length. Where each lies is the desk's to say.
const LEAD = { cable: 4.5, coil: 19.5, turns: 12 }

// The DIN plug is a 6-pin plug, five pins on a 240° arc and one in the middle [C], https://isa.umh.es/micros/doc/hwb/co_AmstradCPC6128Monitor.html: its shell 13.2 across, its pins 1.45 across on a circle 7.0 across [C], https://en.wikipedia.org/wiki/DIN_connector. On a Schneider GT64's lower front its moulding reads about 18 across and 15 long, its shell standing about 9.7 out of it and its relief about 20 long, ±15% [E]: https://www.kleinanzeigen.de/s-anzeige/schneider-cpc464-mit-gruenmonitor/3557591301-228-9501. The Bibliothèque nationale's GT65-2, whose DIN cord is a part of its own, 170157 [A], amendment service manual p25, https://retronik.silicium.org/DOCUMENTS/Info/Amstrad_CPC/Amstrad%20CPC464%206128%20GT65%20CTM644%20MP3%20CT1%20amendment%20service%20manual.pdf, reads a moulding 26 long and a shell 6.4 out, its relief tapering from about 10 across to 7 [E], which is taken; the disagreement over the lengths stands. How far the pins stand within the shell, how long they are and the shell's wall are not read: 2, 1.5 and 0.4 are taken.
const DIN_PLUG = {
  shell: 13.2,
  shellLength: 9.7,
  wall: 0.4,
  pin: 1.45,
  pinCircle: 7,
  pinsSunk: 2,
  pinLength: 1.5,
  moulding: 18,
  length: 15,
  reliefStart: 10,
  reliefEnd: 7,
  relief: 20
}

// Amstrad gives the computer's socket for it as "5mm" [A], CPC464/CTM640/GT64 Service Manual p2. On the Bibliothèque nationale's GT65-2, lying beside its DIN plug, which scales it, the barrel reads 5.4 across, the body 10.6 and the ribbed relief 7.8 [E]: https://commons.wikimedia.org/wiki/File:Collection_Charles_Cros._Micro-ordinateurs_(m%C3%A9dia_-_multim%C3%A9dias)._Micro-ordinateurs_Amstrad_-_CPC_464._Micro-ordinateur_Amstrad_CPC_464,_n%C2%B0_de_s%C3%A9rie_du_clavier_533-7834019_-_btv1b55013024n_(11_of_20).jpg. Amstrad's 5 is taken for the barrel. On the Schneider GT64 the barrel stands about 11 out of a body about 21 long, and the relief runs about 12 [E]. How the relief tapers is not read, and it is drawn straight; its ribs are not drawn.
const DC_PLUG = {
  barrel: 5,
  barrelLength: 11,
  body: 10.6,
  length: 21,
  relief: 7.8,
  reliefLength: 12
}

// The five pins round the middle one, in degrees from the top.
const PIN_ANGLES = [-120, -60, 0, 60, 120]

// Along y from the shoulder, ahead where the plug goes in.
function cylinderAlong(diameter, from, to) {
  return makeCylinder(diameter / 2, to - from, [0, from, 0], [0, 1, 0])
}

function sectionAt(diameter, y) {
  return drawCircle(diameter / 2).sketchOnPlane("XZ", -y)
}

function buildDinPlug({ sheath, metal, insulator }) {
  const figures = DIN_PLUG,
    bore = figures.shell - 2 * figures.wall,
    outside = cylinderAlong(figures.shell, 0, figures.shellLength),
    inside = cylinderAlong(bore, -1, figures.shellLength + 1),
    shell = outside.cut(inside),
    face = figures.shellLength - figures.pinsSunk,
    insert = cylinderAlong(bore, 0, face),
    middlePin = makeCylinder(figures.pin / 2, figures.pinLength, [0, face, 0], [0, 1, 0]),
    ringPins = PIN_ANGLES.map(function (angle) {
      const radians = (angle * Math.PI) / 180,
        x = (figures.pinCircle / 2) * Math.sin(radians),
        z = (figures.pinCircle / 2) * Math.cos(radians)

      return makeCylinder(figures.pin / 2, figures.pinLength, [x, face, z], [0, 1, 0])
    }),
    moulding = cylinderAlong(figures.moulding, -figures.length, 0),
    reliefFront = sectionAt(figures.reliefStart, -figures.length),
    reliefEnd = sectionAt(figures.reliefEnd, -figures.length - figures.relief),
    relief = reliefFront.loftWith(reliefEnd, { ruled: true }),
    pinned = ringPins.reduce((whole, pin) => whole.fuse(pin), middlePin)

  return [
    { name: "din-cord-plug", shape: moulding.fuse(relief), material: sheath },
    { name: "din-cord-shell", shape: shell, material: metal },
    { name: "din-cord-insert", shape: insert, material: insulator },
    { name: "din-cord-pins", shape: pinned, material: metal }
  ]
}

function buildDcPlug({ sheath, metal }) {
  const figures = DC_PLUG,
    barrel = cylinderAlong(figures.barrel, 0, figures.barrelLength),
    body = cylinderAlong(figures.body, -figures.length, 0),
    relief = cylinderAlong(figures.relief, -figures.length - figures.reliefLength, -figures.length)

  return [
    { name: "dc-cord-plug", shape: body.fuse(relief), material: sheath },
    { name: "dc-cord-barrel", shape: barrel, material: metal }
  ]
}

function buildLead({ cord, socket, exit, stowed, parts, tail }) {
  return [
    { name: `${cord}-tip`, place: exit, turn: 180, parts: [] },
    {
      name: `${cord}-lead`,
      place: stowed,
      lead: {
        ...LEAD,
        tip: `${cord}-tip`,
        tail: `${cord}-plug-tail`,
        sheath: `${cord}-plug`,
        socket
      },
      parts: [...parts, { name: `${cord}-plug-tail`, place: [0, -tail, 0], parts: [] }]
    }
  ]
}

// Each lead leaves the monitor where it is given, headed toward the front, and its plug is drawn about its shoulder, its shell or barrel ahead along y and its tail behind, and stowed inside the monitor, where it adds nothing to its bounds: the desk lays each in the computer's socket.
export default function buildMonitorCords({ din, dc, sheath, metal, insulator }) {
  const dinPlug = buildDinPlug({ sheath, metal, insulator }),
    dcPlug = buildDcPlug({ sheath, metal }),
    dinTail = DIN_PLUG.length + DIN_PLUG.relief,
    dcTail = DC_PLUG.length + DC_PLUG.reliefLength,
    dinLead = buildLead({
      cord: "din-cord",
      socket: "monitor-mouth",
      ...din,
      parts: dinPlug,
      tail: dinTail
    }),
    dcLead = buildLead({
      cord: "dc-cord",
      socket: "5v-dc-mouth",
      ...dc,
      parts: dcPlug,
      tail: dcTail
    })

  return [...dinLead, ...dcLead]
}

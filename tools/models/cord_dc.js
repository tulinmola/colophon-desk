import { drawCircle, makeCylinder } from "replicad"

// The 12V DC cord the 664 and the 6128 both carry, Cord DC 14550401, Amstrad's 170822 in both service manuals' parts lists, ending in a "5mm plug and lead to 12v (disc) power socket on the monitor" [A], CPC664 Service Manual p21 and specification, https://archive.org/details/amstrad-cpc-664-service-manual, and CPC6128 Service Manual p3, https://archive.org/details/Amstrad_CPC6128_Service_Manual_1985_Amstrad_Consumer_Electronics_a. Each manual has one entry that disagrees: the 664's p3 gives Cord D.C. 170851, which the 6128's p21 gives a capacitor, and the 6128's p21 a D.C. Cord 170882. The User Instructions draw its lead straight from the computer, then coiled about a dozen times, then straight into the plug [A], CPC6128 User Instructions ch. 1 p. 2: https://archive.org/details/amstrad-cpc-6128-user-manual
// A Schneider 6128's lead lying free, read from above at 5.12 pixels to the millimetre by the case's 510, runs about 35 straight from the boot before its first turn, and is about 3.5 thick, in turns about 21 across, at least 8 of them seen, to a straight black plug: its barrel stands about 7.6 out of a nose about 8 across, widening to a body about 10 across and 23 long, its ribbed relief running on at least 12 [E]: https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg. The UK units photographed beside their monitors carry a dark lead, the others a grey one [E], https://commons.wikimedia.org/wiki/File:Amstrad_CPC-6128_(monochrome_and_colour)_-_Retrosystems_2010.jpg.
// A Schneider 664's, read from below on its underside at 4.6 to 5.0 pixels to the millimetre, its scale from the base's slots, ends in a body 21 to 23 long and 9 to 10.4 across, a ribbed relief 14 to 16 long and a barrel 8.5 to 9.7 out, and lies in 10 to 11 turns; hanging on its rear, square-on, its turns read 20 to 21 across [E]: https://retroordenadoresorty.blogspot.com/p/ordenadores-amstrad-y-schneider-amstrad.html. On the photograph from above beside the 6128, the 6128's own above, its lead reads 4.0 to 4.2 thick in about 10 turns [E]: https://commons.wikimedia.org/wiki/File:Schneider_CPC_664_und_CPC_6128_(54853121982).jpg. Its barrel and its lead disagree with the 6128's reading, and the disagreement stands: the 6128's barrel and lead are taken, and the 664's relief, at the middle of its reading.
// How many turns there are is not settled: the 6128's User Instructions draw about a dozen, the 664's draw five, schematically [A], https://archive.org/details/amstrad-cpc664-user-manual, and the 664 is photographed with 10 to 11. The 6128's dozen is taken. How far the nose widens and how the relief tapers are not known: 4, and the relief from 7 across, are taken. Where the lead lies is the desk's to say.
const PLUG = {
    barrel: 5,
    barrelLength: 7.6,
    nose: 8,
    widening: 4,
    body: 10,
    length: 23,
    reliefStart: 7,
    relief: 15
  },
  LEAD = { cable: 3.5, coil: 21, turns: 12 },
  CORD = "dc-cord"

function plugSection(diameter, y) {
  return drawCircle(diameter / 2).sketchOnPlane("XZ", -y)
}

// The lead runs on from the tip of the boot each computer draws for itself, named dc-cord, whose grey the page gives the lead. The plug is drawn about its shoulder, its barrel ahead along y and its tail behind, where the lead leaves it, and stowed inside the case, so that the computer's bounds hold the same with it as without it: the desk lays it in the monitor's socket.
export default function buildCordDc({ tip, stowed, plastic, metal }) {
  const { barrel, barrelLength, nose, widening, body, length, reliefStart, relief } = PLUG,
    tail = -(length + relief),
    barrelShape = makeCylinder(barrel / 2, barrelLength, [0, 0, 0], [0, 1, 0]),
    shoulder = plugSection(nose, 0),
    widened = plugSection(body, -widening),
    back = plugSection(body, -length),
    moulding = shoulder.loftWith([widened, back], { ruled: true }),
    reliefFront = plugSection(reliefStart, -length),
    reliefEnd = plugSection(LEAD.cable, tail),
    strainRelief = reliefFront.loftWith(reliefEnd, { ruled: true }),
    plug = moulding.fuse(strainRelief)

  return [
    { name: `${CORD}-tip`, place: tip, parts: [] },
    {
      name: `${CORD}-lead`,
      place: stowed,
      lead: {
        ...LEAD,
        tip: `${CORD}-tip`,
        tail: `${CORD}-plug-tail`,
        sheath: CORD,
        socket: "jack-mouth"
      },
      parts: [
        { name: `${CORD}-plug`, shape: plug, material: plastic },
        { name: `${CORD}-barrel`, shape: barrelShape, material: metal },
        { name: `${CORD}-plug-tail`, place: [0, tail, 0], parts: [] }
      ]
    }
  ]
}

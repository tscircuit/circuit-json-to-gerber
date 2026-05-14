import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 14,
    num_layers: 4,
  },
  {
    type: "pcb_via",
    pcb_via_id: "blind_via_top_to_inner1",
    x: -4,
    y: 0,
    hole_diameter: 0.6,
    outer_diameter: 1.4,
    layers: ["top", "inner1"],
    from_layer: "top",
    to_layer: "inner1",
  },
  {
    type: "pcb_via",
    pcb_via_id: "through_via_top_to_bottom",
    x: 4,
    y: 0,
    hole_diameter: 0.6,
    outer_diameter: 1.4,
    layers: ["top", "bottom"],
    from_layer: "top",
    to_layer: "bottom",
  },
] as AnyCircuitElement[]

const makeBottomDiagnosticSvg = ({
  name,
  bottomCopperPads,
  bottomDrills,
}: {
  name: string
  bottomCopperPads: Array<{ x: number; y: number }>
  bottomDrills: Array<{ x: number; y: number }>
}) => {
  const toSvgX = (x: number) => x * 1000
  const toSvgY = (y: number) => -y * 1000
  const copper = bottomCopperPads
    .map(
      (point) =>
        `<circle cx="${toSvgX(point.x)}" cy="${toSvgY(point.y)}" r="700" fill="#d19a2a"/>`,
    )
    .join("")
  const drills = bottomDrills
    .map(
      (point) =>
        `<circle cx="${toSvgX(point.x)}" cy="${toSvgY(point.y)}" r="300" fill="#000"/>`,
    )
    .join("")

  return [
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ',
    'stroke-linecap="round" stroke-linejoin="round" ',
    'viewBox="-10000 -7000 20000 14000" width="20mm" height="14mm">',
    `<g id="${name}">`,
    '<rect x="-10000" y="-7000" width="20000" height="14000" fill="#666"/>',
    copper,
    drills,
    "</g>",
    "</svg>",
  ].join("")
}

const makeDrillSpanDiagnosticSvg = ({
  name,
  drills,
}: {
  name: string
  drills: Array<{ x: number; y: number }>
}) =>
  makeBottomDiagnosticSvg({
    name,
    bottomCopperPads: [],
    bottomDrills: drills,
  })

const getDrillPoints = (drillOutput: string) =>
  [...drillOutput.matchAll(/^X(-?\d+\.\d+)Y(-?\d+\.\d+)$/gm)].map(
    ([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }),
  )

test("blind via is not emitted in through-board drill output", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const drillLayers = convertSoupToExcellonDrillCommandLayers({
    circuitJson,
  })
  const drillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )

  expect(gerberOutput.F_Cu).toContain("X-04000000Y000000000D03*")
  expect(gerberOutput.In1_Cu).toContain("X-04000000Y000000000D03*")
  expect(gerberOutput.B_Cu).not.toContain("X-04000000Y000000000D03*")
  expect(drillOutput).toContain("#@! TF.FileFunction,Plated,1,4,PTH")
  expect(drillOutput).not.toContain("X-4.0000Y0.0000")
  expect(drillOutput).toContain("X4.0000Y0.0000")

  expect(Object.keys(drillLayers).sort()).toEqual([
    "drill-L1-L2.drl",
    "drill-L1-L4.drl",
  ])
  expect(stringifyExcellonDrill(drillLayers["drill-L1-L2.drl"])).toContain(
    "X-4.0000Y0.0000",
  )
  expect(stringifyExcellonDrill(drillLayers["drill-L1-L4.drl"])).toContain(
    "X4.0000Y0.0000",
  )

  expect([
    makeDrillSpanDiagnosticSvg({
      name: "blind-via-drill-repro-L1-L2-drill",
      drills: getDrillPoints(
        stringifyExcellonDrill(drillLayers["drill-L1-L2.drl"]),
      ),
    }),
    makeDrillSpanDiagnosticSvg({
      name: "blind-via-drill-repro-L1-L4-drill",
      drills: getDrillPoints(
        stringifyExcellonDrill(drillLayers["drill-L1-L4.drl"]),
      ),
    }),
    makeBottomDiagnosticSvg({
      name: "blind-via-drill-repro-bottom-diagnostic",
      bottomCopperPads: [{ x: 4, y: 0 }],
      bottomDrills: getDrillPoints(drillOutput),
    }),
  ]).toMatchMultipleSvgSnapshots(import.meta.path, [
    "blind-via-drill-repro-L1-L2-drill",
    "blind-via-drill-repro-L1-L4-drill",
    "blind-via-drill-repro-bottom-diagnostic",
  ])
})

import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbHoleWithPolygonPad,
} from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const pcbBoard: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 24,
  height: 10,
  num_layers: 2,
  thickness: 1.6,
  material: "fr4",
}

const tabPadOutline = [
  { x: -1.2, y: -2.2 },
  { x: 1.2, y: -2.2 },
  { x: 1.2, y: 2.2 },
  { x: -0.4, y: 2.2 },
  { x: -1.2, y: 1.4 },
]

// A two-pin power terminal with tab-shaped polygon pads, placed once unrotated and once turned 90°.
const terminalPads: PcbHoleWithPolygonPad[] = [
  { pcb_plated_hole_id: "J1_pin1", x: -8.5, y: 0, ccw_rotation: 0 },
  { pcb_plated_hole_id: "J1_pin2", x: -3.5, y: 0, ccw_rotation: 0 },
  { pcb_plated_hole_id: "J2_pin1", x: 6, y: -2.5, ccw_rotation: 90 },
  { pcb_plated_hole_id: "J2_pin2", x: 6, y: 2.5, ccw_rotation: 90 },
].map((padPlacement) => ({
  type: "pcb_plated_hole",
  shape: "hole_with_polygon_pad",
  hole_shape: "circle",
  hole_diameter: 1.1,
  pad_outline: tabPadOutline,
  hole_offset_x: 0,
  hole_offset_y: -1,
  layers: ["top", "bottom"],
  is_covered_with_solder_mask: false,
  ...padPlacement,
}))

const circuitJson: AnyCircuitElement[] = [pcbBoard, ...terminalPads]

const rotateQuarterTurnCcw = (point: { x: number; y: number }) => ({
  x: -point.y,
  y: point.x,
})

// The pinned PCB SVG renderer ignores polygon pad ccw_rotation, so the reference view bakes in the expected quarter turn.
const getExpectedPcbViewPad = (
  terminalPad: PcbHoleWithPolygonPad,
): PcbHoleWithPolygonPad => {
  if (terminalPad.ccw_rotation !== 90) {
    return terminalPad
  }
  const expectedHoleOffset = rotateQuarterTurnCcw({
    x: terminalPad.hole_offset_x,
    y: terminalPad.hole_offset_y,
  })
  return {
    ...terminalPad,
    ccw_rotation: 0,
    pad_outline: terminalPad.pad_outline.map(rotateQuarterTurnCcw),
    hole_offset_x: expectedHoleOffset.x,
    hole_offset_y: expectedHoleOffset.y,
  }
}

const expectedPcbView: AnyCircuitElement[] = [
  pcbBoard,
  ...terminalPads.map(getExpectedPcbViewPad),
]

const getGerberOutput = () =>
  stringifyGerberCommandLayers(convertCircuitJsonToGerberCommands(circuitJson))

const getDrillLayers = () =>
  Object.fromEntries(
    Object.entries(
      convertCircuitJsonToExcellonDrillCommandLayers({ circuitJson }),
    ).map(([layerName, commands]) => [
      layerName,
      stringifyExcellonDrill(commands),
    ]),
  )

const getPlatedDrill = (drillOptions: {
  circuitJson: AnyCircuitElement[]
  flip_y_axis?: boolean
}) =>
  stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      ...drillOptions,
      is_plated: true,
    }),
  )

test("unrotated polygon plated holes are drilled at their hole offset", () => {
  const platedDrill = getDrillLayers()["drill-L1-L2.drl"]
  // Each drill sits 1 mm below its pad origin.
  expect(platedDrill).toContain("X-8.5000Y-1.0000")
  expect(platedDrill).toContain("X-3.5000Y-1.0000")
})

for (const { padName, expectedDrillHit } of [
  { padName: "J2_pin1", expectedDrillHit: "X7.0000Y-2.5000" },
  { padName: "J2_pin2", expectedDrillHit: "X7.0000Y2.5000" },
]) {
  test(`rotated polygon plated hole ${padName} is drilled at its rotated hole offset`, () => {
    const platedDrill = getDrillLayers()["drill-L1-L2.drl"]
    // Turning the 1 mm downward offset 90° counterclockwise puts the drill 1 mm right of the pad origin.
    expect(platedDrill).toContain(expectedDrillHit)
  })
}

test("rotated polygon plated hole slots stay centered on the rotated hole offset", () => {
  const slottedPad: PcbHoleWithPolygonPad = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "J3_pin1",
    shape: "hole_with_polygon_pad",
    hole_shape: "pill",
    hole_width: 1.6,
    hole_height: 0.8,
    pad_outline: tabPadOutline,
    hole_offset_x: 0,
    hole_offset_y: -1,
    ccw_rotation: 90,
    x: 6,
    y: -2.5,
    layers: ["top", "bottom"],
  }
  const platedDrill = getPlatedDrill({ circuitJson: [pcbBoard, slottedPad] })
  // The slot runs along the turned pad, on both sides of the rotated hole offset.
  expect(platedDrill).toContain("X7.0000Y-2.9000")
  expect(platedDrill).toContain("G85X7.000Y-2.100")
})

test("polygon plated hole drill offsets rotate before the Y flip", () => {
  const turnedPad: PcbHoleWithPolygonPad = {
    ...terminalPads[0],
    pcb_plated_hole_id: "J4_pin1",
    x: 0,
    y: 0,
    ccw_rotation: 30,
  }
  const circuitJsonWithTurnedPad = [pcbBoard, turnedPad]
  // A 30° counterclockwise turn swings the downward offset toward the lower right.
  expect(getPlatedDrill({ circuitJson: circuitJsonWithTurnedPad })).toContain(
    "X0.5000Y-0.8660",
  )
  expect(
    getPlatedDrill({
      circuitJson: circuitJsonWithTurnedPad,
      flip_y_axis: true,
    }),
  ).toContain("X0.5000Y0.8660")
})

test("rotated polygon plated hole drill offset PCB and Gerber snapshot", async () => {
  await expect({
    ...getGerberOutput(),
    ...getDrillLayers(),
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-polygon-plated-hole-drill-offset",
    expectedPcbView,
    ["F_Cu", "F_Mask"],
    {
      circuitJsonLabel: "Expected PCB: J1 at 0°, J2 at 90°",
      gerberLabel: "Gerber: J2 drills turn with the pads",
      circuitJsonPcbSvgOptions: { drawPaddingOutsideBoard: false },
      panelHeight: 320,
    },
  )
})

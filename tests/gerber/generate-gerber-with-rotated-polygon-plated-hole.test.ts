import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const padOutline = [
  { x: -2, y: -1 },
  { x: 2, y: -1 },
  { x: 2, y: 1 },
  { x: -2, y: 1 },
]

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 14,
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "unrotated_polygon_plated_hole",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.8,
    pad_outline: padOutline,
    ccw_rotation: 0,
    hole_offset_x: 0,
    hole_offset_y: 0,
    x: -3,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
    soldermask_margin: 0.2,
  } as AnyCircuitElement,
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "rotated_polygon_plated_hole",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.8,
    pad_outline: padOutline,
    ccw_rotation: 90,
    hole_offset_x: 0,
    hole_offset_y: 0,
    x: 3,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
    soldermask_margin: 0.2,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("polygon plated hole pad_outline is rotated by ccw_rotation on copper and soldermask layers", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const drillLayers = Object.fromEntries(
    Object.entries(
      convertSoupToExcellonDrillCommandLayers({
        circuitJson,
      }),
    ).map(([layerName, commands]) => [
      layerName,
      stringifyExcellonDrill(commands),
    ]),
  )

  // Unrotated hole at (-3, 0): (-2, -1) -> (-5, -1), (2, 1) -> (-1, 1)
  expect(gerberOutput.F_Cu).toContain("X-05000000Y-01000000D02*")
  expect(gerberOutput.F_Cu).toContain("X-01000000Y001000000D01*")

  // 90 deg CCW rotated hole at (3, 0):
  // (-2, -1) rotated 90 deg CCW -> (1, -2) + (3, 0) = (4, -2)
  // (2, -1) rotated 90 deg CCW -> (1, 2) + (3, 0) = (4, 2)
  // (2, 1) rotated 90 deg CCW -> (-1, 2) + (3, 0) = (2, 2)
  // (-2, 1) rotated 90 deg CCW -> (-1, -2) + (3, 0) = (2, -2)
  expect(gerberOutput.F_Cu).toContain("X004000000Y-02000000D02*")
  expect(gerberOutput.F_Cu).toContain("X004000000Y002000000D01*")
  expect(gerberOutput.F_Cu).toContain("X002000000Y002000000D01*")
  expect(gerberOutput.F_Cu).toContain("X002000000Y-02000000D01*")
  expect(gerberOutput.B_Cu).toContain("X004000000Y-02000000D02*")

  // Soldermask margin (0.2mm) on 90 deg CCW rotated hole at (3, 0):
  // (-2.2, -1.2) rotated 90 deg CCW -> (1.2, -2.2) + (3, 0) = (4.2, -2.2)
  expect(gerberOutput.F_Mask).toContain("X004200000Y-02200000D02*")
  expect(gerberOutput.F_Mask).toContain("X004200000Y002200000D01*")
  expect(gerberOutput.F_Mask).toContain("X001800000Y002200000D01*")
  expect(gerberOutput.F_Mask).toContain("X001800000Y-02200000D01*")

  await expect({
    ...gerberOutput,
    ...drillLayers,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-polygon-plated-hole",
    circuitJson,
    ["F_Cu", "F_Mask"],
  )
})

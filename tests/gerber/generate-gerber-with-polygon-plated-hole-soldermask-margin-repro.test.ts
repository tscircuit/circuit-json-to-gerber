import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "polygon_plated_hole_with_soldermask_margin",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.5,
    pad_outline: [
      { x: -1.2, y: -0.8 },
      { x: 0.8, y: -1.1 },
      { x: 1.35, y: 0.15 },
      { x: 0.15, y: 1.15 },
      { x: -1.1, y: 0.65 },
    ],
    hole_offset_x: 0,
    hole_offset_y: 0,
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
    soldermask_margin: 0.2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "circle_plated_hole_with_soldermask_margin",
    shape: "circle",
    outer_diameter: 1,
    hole_diameter: 0.5,
    x: 2.5,
    y: 0,
    layers: ["top", "bottom"],
    soldermask_margin: 0.2,
  },
] as AnyCircuitElement[]

test("polygon plated hole soldermask margin is applied", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("G36*")
  expect(gerberOutput.F_Cu).toContain("X-01200000Y-00800000D02*")
  expect(gerberOutput.F_Cu).toContain("X001350000Y000150000D01*")

  expect(gerberOutput.F_Mask).toContain("G36*")
  expect(gerberOutput.F_Mask).not.toContain("X-01200000Y-00800000D02*")
  expect(gerberOutput.F_Mask).not.toContain("X001350000Y000150000D01*")
  expect(gerberOutput.F_Mask).toContain("X-01412227Y-00970403D02*")
  expect(gerberOutput.F_Mask).toContain("X001593698Y000207260D01*")

  expect(gerberOutput.F_Mask).toMatch(/%ADD\d+C,1\.400000\*%/)
  expect(gerberOutput.F_Mask).toContain("X002500000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "polygon-plated-hole-soldermask-margin-repro",
    ["F_Mask", "F_Cu"],
    {
      colors: {
        F_Mask: "#ffffff",
        F_Cu: "#c83434",
      },
    },
  )
})

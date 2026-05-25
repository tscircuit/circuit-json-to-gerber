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
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
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

test("repro: polygon plated hole soldermask margin is not applied", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("G36*")
  expect(gerberOutput.F_Cu).toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Cu).toContain("X001000000Y001000000D01*")

  expect(gerberOutput.F_Mask).toContain("G36*")
  expect(gerberOutput.F_Mask).toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Mask).toContain("X001000000Y001000000D01*")
  expect(gerberOutput.F_Mask).not.toContain("X-01200000Y-01200000D02*")
  expect(gerberOutput.F_Mask).not.toContain("X001200000Y001200000D01*")

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

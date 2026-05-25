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
    pcb_plated_hole_id: "pill_plated_hole_with_soldermask_margin",
    shape: "pill",
    outer_width: 2,
    outer_height: 1,
    hole_width: 1.2,
    hole_height: 0.5,
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
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

test("pill plated hole soldermask margin aperture is used", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain(
    "%ADD10HORZPILL,2.000000X1.000000X1.000000X0.500000*%",
  )
  expect(gerberOutput.F_Mask).toContain(
    "%ADD10HORZPILL,2.400000X1.400000X1.400000X0.500000*%",
  )
  expect(gerberOutput.F_Mask).not.toMatch(/%ADD\d+C,1\.000000\*%/)
  expect(gerberOutput.F_Mask).toContain("X-00500000Y000000000D03*")
  expect(gerberOutput.F_Mask).toContain("X000500000Y000000000D01*")
  expect(gerberOutput.F_Mask).toMatch(/%ADD\d+C,1\.400000\*%/)
  expect(gerberOutput.F_Mask).toContain("X002500000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "pill-plated-hole-soldermask-margin-repro",
    ["F_Mask", "F_Cu"],
    {
      colors: {
        F_Mask: "#ffffff",
        F_Cu: "#c83434",
      },
    },
  )
})

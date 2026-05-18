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
    type: "pcb_hole",
    pcb_hole_id: "hole_with_soldermask_margin",
    hole_shape: "circle",
    hole_diameter: 1,
    x: 0,
    y: 0,
    soldermask_margin: 0.2,
  },
] as AnyCircuitElement[]

test("pcb hole soldermask margin is applied to the mask opening", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Mask).toContain("%ADD10C,1.400000*%")
  expect(gerberOutput.F_Mask).not.toContain("%ADD10C,1.000000*%")
  expect(gerberOutput.F_Mask).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.B_Mask).toContain("%ADD10C,1.400000*%")
  expect(gerberOutput.B_Mask).not.toContain("%ADD10C,1.000000*%")
  expect(gerberOutput.B_Mask).toContain("X000000000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "hole-soldermask-margin-repro",
    ["F_Mask", "B_Mask"],
  )
})

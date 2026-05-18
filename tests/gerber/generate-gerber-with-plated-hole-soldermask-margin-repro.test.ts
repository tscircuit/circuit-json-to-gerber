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
    pcb_plated_hole_id: "plated_hole_with_soldermask_margin",
    shape: "circle",
    outer_diameter: 1.4,
    hole_diameter: 0.7,
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    soldermask_margin: 0.2,
  },
] as AnyCircuitElement[]

test("repro: plated hole soldermask margin is not applied to the mask opening", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("%ADD10C,1.400000*%")
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.F_Mask).toContain("%ADD10C,1.400000*%")
  expect(gerberOutput.F_Mask).not.toContain("%ADD10C,1.800000*%")
  expect(gerberOutput.F_Mask).toContain("X000000000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "plated-hole-soldermask-margin-repro",
    ["F_Mask", "F_Cu"],
  )
})

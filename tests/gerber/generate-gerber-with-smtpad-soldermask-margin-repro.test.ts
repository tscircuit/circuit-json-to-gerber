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
    type: "pcb_smtpad",
    pcb_smtpad_id: "rect_pad_with_soldermask_margin",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 2,
    height: 1,
    soldermask_margin: 0.2,
  },
] as AnyCircuitElement[]

test("smtpad soldermask margin expands the mask opening", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("%ADD10R,2.000000X1.000000*%")
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.F_Mask).not.toContain("%ADD10R,2.000000X1.000000*%")
  expect(gerberOutput.F_Mask).toContain("%ADD10R,2.400000X1.400000*%")
  expect(gerberOutput.F_Mask).toContain("X000000000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "smtpad-soldermask-margin-repro",
    ["F_Mask", "F_Cu"],
  )
})

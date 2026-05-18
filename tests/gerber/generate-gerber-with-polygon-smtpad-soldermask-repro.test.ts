import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "uncovered_polygon_pad",
    shape: "polygon",
    layer: "top",
    is_covered_with_solder_mask: false,
    points: [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ],
  },
] as AnyCircuitElement[]

test("uncovered polygon smtpads emit soldermask openings", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("G36*")
  expect(gerberOutput.F_Cu).toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Cu).toContain("X001000000Y001000000D01*")
  expect(gerberOutput.F_Mask).toContain("G36*")
  expect(gerberOutput.F_Mask).toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Mask).toContain("X001000000Y001000000D01*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "polygon-smtpad-soldermask-repro",
    ["F_Cu", "F_Mask"],
  )
})

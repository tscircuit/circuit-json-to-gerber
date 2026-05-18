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
    pcb_plated_hole_id: "covered_plated_hole",
    shape: "circle",
    outer_diameter: 1.4,
    hole_diameter: 0.7,
    x: -1,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: true,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "uncovered_plated_hole",
    shape: "circle",
    outer_diameter: 1.4,
    hole_diameter: 0.7,
    x: 1,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  },
] as AnyCircuitElement[]

test("covered plated holes do not emit soldermask openings", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("X-01000000Y000000000D03*")
  expect(gerberOutput.F_Cu).toContain("X001000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X-01000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X001000000Y000000000D03*")

  expect(gerberOutput.F_Mask).not.toContain("X-01000000Y000000000D03*")
  expect(gerberOutput.F_Mask).toContain("X001000000Y000000000D03*")
  expect(gerberOutput.B_Mask).not.toContain("X-01000000Y000000000D03*")
  expect(gerberOutput.B_Mask).toContain("X001000000Y000000000D03*")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "covered-plated-hole-soldermask-repro",
    ["F_Mask", "B_Mask"],
  )
})

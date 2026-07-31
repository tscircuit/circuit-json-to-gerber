import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

// Repro for https://github.com/tscircuit/circuit-json-to-gerber/issues/127
// A plated hole spanning the inner copper layers of a 4-layer board used to
// crash the whole export with "Inner layer inner1 only supports copper
// gerbers", because the plated-hole path computed the soldermask gerber layer
// name unconditionally for every layer it drew on (including inner layers) just
// to compare against it. Inner layers have no soldermask; the hole should emit
// copper on inner layers and soldermask only on the outer layers.
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 4,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "multilayer_plated_hole",
    shape: "circle",
    outer_diameter: 1,
    hole_diameter: 0.5,
    x: 0,
    y: 0,
    layers: ["top", "bottom", "inner1", "inner2"],
    is_covered_with_solder_mask: false,
  },
] as AnyCircuitElement[]

test("multilayer plated hole exports without crashing on inner layers", () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  // Copper is plotted on every layer the hole spans, inner layers included.
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.In1_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.In2_Cu).toContain("X000000000Y000000000D03*")

  // Soldermask openings exist only on the outer layers; inner layers have no
  // soldermask gerber at all.
  expect(gerberOutput.F_Mask).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.B_Mask).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.In1_Mask).toBeUndefined()
  expect(gerberOutput.In2_Mask).toBeUndefined()
})

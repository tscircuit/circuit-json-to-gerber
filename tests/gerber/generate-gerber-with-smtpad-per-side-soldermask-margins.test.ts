import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("applies per-side soldermask_margin overrides to rect and rotated_rect smtpads", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 12,
      num_layers: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rect_asymmetric_margin",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      soldermask_margin: 0.1,
      soldermask_margin_left: -0.05,
      soldermask_margin_right: 0.25,
      soldermask_margin_top: 0.2,
      // bottom falls back to base soldermask_margin = 0.1
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated_rect_asymmetric_margin",
      shape: "rotated_rect",
      layer: "top",
      x: 6,
      y: 0,
      width: 2,
      height: 1,
      ccw_rotation: 90,
      soldermask_margin_left: 0,
      soldermask_margin_right: 0.4,
      soldermask_margin_top: 0,
      soldermask_margin_bottom: 0,
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  // Copper for rect pad stays 2.0 x 1.0 at (0, 0)
  expect(gerberOutput.F_Cu).toContain("2.000000X1.000000")
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D03*")

  // Soldermask for rect pad: width = 2 + (-0.05) + 0.25 = 2.2, height = 1 + 0.2 + 0.1 = 1.3
  // Center shifts by dx = (0.25 - (-0.05)) / 2 = +0.15, dy = (0.2 - 0.1) / 2 = +0.05
  expect(gerberOutput.F_Mask).toContain("2.200000X1.300000")
  expect(gerberOutput.F_Mask).toContain("X000150000Y000050000D03*")

  // Rotated rect (ccw_rotation = 90) centered at (6, 0), width=2, height=1:
  // Copper extends in Y from -1.0 to +1.0 and X from 5.5 to 6.5.
  // soldermask_margin_right = +0.4 shifts local +X (which rotates to world +Y) to +1.4,
  // so mask spans X in [5.5, 6.5] and Y in [-1.0, +1.4] (center (6, 0.2), height 2.4).
  expect(gerberOutput.F_Mask).toContain("X005500000Y001400000")
  expect(gerberOutput.F_Mask).toContain("X006500000Y-01000000")
})

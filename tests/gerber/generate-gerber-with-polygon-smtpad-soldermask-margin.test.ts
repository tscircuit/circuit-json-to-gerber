import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("applies positive and negative soldermask_margin to polygon smtpads", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 12,
      height: 8,
      num_layers: 2,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "top_polygon_pad_expanded",
      shape: "polygon",
      layer: "top",
      is_covered_with_solder_mask: false,
      soldermask_margin: 0.2,
      points: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_polygon_pad_smd",
      shape: "polygon",
      layer: "bottom",
      is_covered_with_solder_mask: false,
      soldermask_margin: -0.1,
      points: [
        { x: 3, y: -1 },
        { x: 5, y: -1 },
        { x: 5, y: 1 },
        { x: 3, y: 1 },
      ],
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  // Top copper remains at [-1, 1] x [-1, 1]
  expect(gerberOutput.F_Cu).toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Cu).toContain("X001000000Y001000000D01*")

  // Top soldermask expands outward by +0.2mm to [-1.2, 1.2] x [-1.2, 1.2]
  expect(gerberOutput.F_Mask).toContain("G36*")
  expect(gerberOutput.F_Mask).not.toContain("X-01000000Y-01000000D02*")
  expect(gerberOutput.F_Mask).toContain("X-01200000Y-01200000D02*")
  expect(gerberOutput.F_Mask).toContain("X001200000Y001200000D01*")

  // Bottom copper remains at [3, 5] x [-1, 1]
  expect(gerberOutput.B_Cu).toContain("X003000000Y-01000000D02*")
  expect(gerberOutput.B_Cu).toContain("X005000000Y001000000D01*")

  // Bottom soldermask shrinks inward by -0.1mm to [3.1, 4.9] x [-0.9, 0.9]
  expect(gerberOutput.B_Mask).toContain("G36*")
  expect(gerberOutput.B_Mask).not.toContain("X003000000Y-01000000D02*")
  expect(gerberOutput.B_Mask).toContain("X003100000Y-00900000D02*")
  expect(gerberOutput.B_Mask).toContain("X004900000Y000900000D01*")
})

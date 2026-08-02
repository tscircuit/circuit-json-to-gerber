import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("smtpad solderpaste margin creates paste when explicit paste is absent", () => {
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
      pcb_smtpad_id: "fallback_pad",
      shape: "rect",
      layer: "top",
      x: -2,
      y: 0,
      width: 2,
      height: 1,
      solderpaste_margin: -0.1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "explicit_pad",
      shape: "rect",
      layer: "top",
      x: 2,
      y: 0,
      width: 2,
      height: 1,
      solderpaste_margin: -0.2,
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "explicit_paste",
      pcb_smtpad_id: "explicit_pad",
      shape: "rect",
      layer: "top",
      x: 2,
      y: 0,
      width: 0.7,
      height: 0.3,
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Paste).toContain("R,1.800000X0.800000")
  expect(gerberOutput.F_Paste).toContain("X-02000000Y000000000D03*")
  expect(gerberOutput.F_Paste).toContain("R,0.700000X0.300000")
  expect(gerberOutput.F_Paste).toContain("X002000000Y000000000D03*")
  expect(gerberOutput.F_Paste).not.toContain("R,1.600000X0.600000")
})

test("polygon smtpad solderpaste margin creates an offset paste region", () => {
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
      pcb_smtpad_id: "polygon_pad",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
      solderpaste_margin: -0.2,
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Paste).toContain("G36*")
  expect(gerberOutput.F_Paste).toContain("X-00800000Y-00800000D02*")
  expect(gerberOutput.F_Paste).toContain("X000800000Y000800000D01*")
})

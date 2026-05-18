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
    height: 10,
    num_layers: 2,
  },
  {
    type: "pcb_via",
    pcb_via_id: "untented_via",
    x: -2,
    y: 0,
    hole_diameter: 0.5,
    outer_diameter: 1.2,
    layers: ["top", "bottom"],
    is_tented: false,
  },
  {
    type: "pcb_via",
    pcb_via_id: "tented_via",
    x: 2,
    y: 0,
    hole_diameter: 0.5,
    outer_diameter: 1.2,
    layers: ["top", "bottom"],
    is_tented: true,
  },
] as AnyCircuitElement[]

test("repro: untented vias do not emit soldermask openings", () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).toContain("X-02000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X-02000000Y000000000D03*")
  expect(gerberOutput.F_Cu).toContain("X002000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X002000000Y000000000D03*")

  expect(gerberOutput.F_Mask).not.toContain("X-02000000Y000000000D03*")
  expect(gerberOutput.B_Mask).not.toContain("X-02000000Y000000000D03*")
  expect(gerberOutput.F_Mask).not.toContain("X002000000Y000000000D03*")
  expect(gerberOutput.B_Mask).not.toContain("X002000000Y000000000D03*")
})

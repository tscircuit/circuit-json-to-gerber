import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "oval",
    outer_width: 2,
    outer_height: 1,
    hole_width: 1.2,
    hole_height: 0.5,
    x: 0,
    y: 0,
    ccw_rotation: 0,
    layers: ["top", "bottom"],
  },
]

test("repro: oval plated holes fail during Gerber export", () => {
  expect(() => convertSoupToGerberCommands(circuitJson)).toThrow(
    "Unsupported shape in getApertureConfigFromPcbPlatedHole: oval",
  )
})

import { expect, test } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import type { AnyCircuitElement } from "circuit-json"

test("square rect plated-hole pads do not emit a no-op rotation", () => {
  const circuitJson = [
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_1",
      hole_diameter: 1,
      rect_pad_width: 1.5,
      rect_pad_height: 1.5,
      shape: "circular_hole_with_rect_pad",
      x: -32.38,
      y: -7.62,
      layers: ["top", "bottom"],
      rect_ccw_rotation: 90,
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Mask).toMatch(/X-32380000Y-0?7620000D03\*/)
  expect(gerberOutput.F_Mask).not.toContain("%LR90*%")
})

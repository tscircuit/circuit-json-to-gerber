import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber/convert-soup-to-gerber-commands"
import { getGerberCoordinateWithPadding } from "../../src/gerber/stringify-gerber/get-gerber-coordinate-with-padding"

test("plated holes with rect pads clamp pad dimensions to hole dimensions and register region aperture when rotated", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_slot_rect",
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      x: 0,
      y: 0,
      hole_offset_x: 0,
      hole_offset_y: 0,
      hole_width: 2.5,
      hole_height: 1.0,
      hole_ccw_rotation: 0,
      rect_pad_width: 2.0,
      rect_pad_height: 2.0,
      rect_ccw_rotation: 90,
      layers: ["top", "bottom"],
    },
  ]

  const commands = convertCircuitJsonToGerberCommands(circuitJson)
  expect(commands.F_Cu.some((cmd) => cmd.command_code === "G36")).toBe(true)
  expect(commands.F_Mask.some((cmd) => cmd.command_code === "G36")).toBe(true)
})

test("getGerberCoordinateWithPadding normalizes sub-nanometer negative values that round to zero", () => {
  expect(getGerberCoordinateWithPadding(-1e-9)).toBe("000000000")
  expect(getGerberCoordinateWithPadding(-0)).toBe("000000000")
  expect(getGerberCoordinateWithPadding(-1.5)).toBe("-01500000")
})

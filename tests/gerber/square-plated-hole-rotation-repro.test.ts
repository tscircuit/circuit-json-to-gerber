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
    height: 6,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "axis_aligned_square_pad",
    shape: "circular_hole_with_rect_pad",
    hole_diameter: 1,
    rect_pad_width: 2.4,
    rect_pad_height: 2.4,
    rect_ccw_rotation: 0,
    x: -2,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "rotated_square_pad",
    shape: "circular_hole_with_rect_pad",
    hole_diameter: 1,
    rect_pad_width: 2.4,
    rect_pad_height: 2.4,
    rect_ccw_rotation: 45,
    x: 2,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  },
] as AnyCircuitElement[]

test("repro: square plated-hole pads lose non-quarter-turn rotations", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "square-plated-hole-rotation-repro",
    circuitJson,
    ["F_Cu"],
    {
      gerberLabel: "Gerber top copper (45° rotation is lost)",
      colors: { F_Cu: "#c83434" },
      backgroundColor: "#111111",
    },
  )
})

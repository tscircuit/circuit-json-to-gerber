import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 6,
    height: 6,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "usb_c_shell_tab",
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    pad_shape: "rect",
    hole_width: 0.7999984,
    hole_height: 1.3999972,
    rect_pad_width: 1.1999976,
    rect_pad_height: 1.7999964,
    hole_ccw_rotation: 270,
    rect_ccw_rotation: 270,
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
  },
] as AnyCircuitElement[]

test("repro: USB-C rotated pill plated hole drill orientation", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  const excellonDrillOutput = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )

  await expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "usb-c-rotated-pill-plated-hole-repro",
    circuitJson,
    ["F_Cu"],
    {
      gerberLabel: "Gerber top copper (rectangular pad rotation is lost)",
      colors: { F_Cu: "#c83434" },
      backgroundColor: "#111111",
    },
  )
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("via mask flashes respect each side, legacy overrides, and physical layers", () => {
  for (const layers of [
    ["top", "bottom"],
    ["top", "inner1"],
    ["inner1", "bottom"],
    ["inner1", "inner2"],
  ] as PcbVia["layers"][]) {
    for (const legacy of [undefined, false, true]) {
      for (const top of [undefined, false, true]) {
        for (const bottom of [undefined, false, true]) {
          const circuit: AnyCircuitElement[] = [
            {
              type: "pcb_board",
              pcb_board_id: "board",
              center: { x: 0, y: 0 },
              width: 10,
              height: 10,
              num_layers: 4,
              thickness: 1.6,
              material: "fr4",
            },
            {
              type: "pcb_via",
              pcb_via_id: "via",
              x: 2,
              y: 0,
              outer_diameter: 1.2,
              hole_diameter: 0.5,
              layers,
              tented_on_top: top,
              tented_on_bottom: bottom,
              ...{ is_tented: legacy },
            },
          ]
          const output = stringifyGerberCommandLayers(
            convertSoupToGerberCommands(circuit),
          )
          const flash = "X002000000Y000000000D03*"
          expect(output.F_Mask.includes(flash)).toBe(
            layers.includes("top") && (top ?? legacy) === false,
          )
          expect(output.B_Mask.includes(flash)).toBe(
            layers.includes("bottom") && (bottom ?? legacy) === false,
          )
          expect(output.F_Cu.includes(flash)).toBe(layers.includes("top"))
          expect(output.B_Cu.includes(flash)).toBe(layers.includes("bottom"))
        }
      }
    }
  }
})

import { expect, test } from "bun:test"
import { pcb_board, pcb_smtpad, pcb_solder_paste } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("the stencil flash stays inside its copper land after reflecting the Gerber Y axis", async () => {
  const board = pcb_board.parse({
    type: "pcb_board",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
  })
  for (const layer of ["top", "bottom"] as const) {
    const placement = { layer, x: 0.25, y: 0.5, ccw_rotation: 35 }
    const land = pcb_smtpad.parse({
      type: "pcb_smtpad",
      ...placement,
      shape: "rotated_rect",
      width: 5.2,
      height: 1.5,
    })
    for (const shape of ["rotated_pill", "rotated_rect"] as const) {
      const paste = pcb_solder_paste.parse({
        type: "pcb_solder_paste",
        ...placement,
        shape,
        width: 4.5,
        height: 0.9,
        radius: 0.45,
      })
      const boardJson = [board, land, paste]
      const prefix = layer === "top" ? "F" : "B"
      const pasteLayer = `${prefix}_Paste`
      for (const flip_y_axis of [false, true]) {
        const output = stringifyGerberCommandLayers(
          convertCircuitJsonToGerberCommands(boardJson, { flip_y_axis }),
        )
        const flashes = output[pasteLayer]
        expect(flashes.match(/%LR[^*]+\*%/g)).toEqual(["%LR35*%", "%LR0*%"])
        if (layer === "top" && shape === "rotated_pill" && flip_y_axis) {
          await expect(output).toMatchCircuitJsonPcbAndGerberSnapshot(
            import.meta.path,
            "reflected-paste-on-copper",
            boardJson,
            ["F_Cu", "F_Paste"],
            {
              circuitJsonLabel: "PCB: centered stencil inside the copper land",
              gerberLabel: "Mirrored Gerber: stencil should stay inside copper",
              colors: { F_Cu: "#c83434", F_Paste: "#34c8c8" },
              backgroundColor: "#111111",
            },
          )
        }
      }
    }
  }
})

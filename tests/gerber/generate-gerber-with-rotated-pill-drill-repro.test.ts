import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "rotated_pill_hole",
    shape: "pill",
    x: 0,
    y: 0,
    hole_width: 0.6,
    hole_height: 1.5,
    outer_width: 1.1,
    outer_height: 2,
    ccw_rotation: 45,
    layers: ["top", "bottom"],
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("repro: rotated pill plated hole drills as a horizontal slot", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const excellonDrillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )

  const gerberAndDrillOutput = {
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
  }

  await expect(gerberAndDrillOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-pill-drill-repro-comparison",
    circuitJson,
    ["F_Cu", "B_Cu"],
  )
})

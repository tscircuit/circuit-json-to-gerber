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
    ccw_rotation: 90,
    layers: ["top", "bottom"],
  } as AnyCircuitElement,
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "rotated_pill_paste",
    layer: "top",
    shape: "pill",
    width: 1.1,
    height: 2,
    x: 0,
    y: 0,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("repro: rotated pill copper vs paste stack snapshot", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const platedDrillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )
  const unplatedDrillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: false,
    }),
  )

  expect(gerberOutput.F_Cu.length).toBeGreaterThan(0)
  expect(gerberOutput.F_Paste.length).toBeGreaterThan(0)

  await expect({
    ...gerberOutput,
    "drill.drl": platedDrillOutput,
    "drill_npth.drl": unplatedDrillOutput,
  }).toMatchGerberSnapshot(
    import.meta.path,
    "rotated-pill-copper-vs-paste-repro",
  )
})

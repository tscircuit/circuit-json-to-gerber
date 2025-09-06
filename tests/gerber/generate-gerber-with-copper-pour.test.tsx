import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"

test("generate gerber with copper pour", async () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 50,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour1",
      layer: "top",
      center: { x: -12, y: 12 },
      width: 10,
      height: 10,
    },
    {
      type: "pcb_copper_pour",
      shape: "rect",
      pcb_copper_pour_id: "pour2",
      layer: "top",
      center: { x: 12, y: 12 },
      width: 10,
      height: 5,
      rotation: 45,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour3",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: -2, y: -9 },
        { x: 2, y: -9 },
        { x: 2, y: -13 },
        { x: 6, y: -13 },
        { x: 6, y: -17 },
        { x: 2, y: -17 },
        { x: 2, y: -21 },
        { x: -2, y: -21 },
        { x: -6, y: -17 },
        { x: -6, y: -13 },
        { x: -2, y: -13 },
      ],
    },
  ]

  const gerber_cmds = convertSoupToGerberCommands(soup as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup as any,
    is_plated: true,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "copper-pour")
})

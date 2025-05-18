import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 50,
    height: 40,
    num_layers: 2,
    thickness: 1.2,
    material: "fr4",
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_rect_0",
    shape: "rect",
    center: { x: -10, y: 10 },
    width: 8,
    height: 5,
  } as AnyCircuitElement,
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_circle_0",
    shape: "circle",
    center: { x: 0, y: 0 },
    radius: 4,
  } as AnyCircuitElement,
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_polygon_0",
    shape: "polygon",
    points: [
      { x: 10, y: -10 },
      { x: 15, y: -5 },
      { x: 5, y: -5 },
    ],
  } as AnyCircuitElement,
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_polygon_star",
    shape: "polygon",
    points: [
      { x: 0, y: -11 }, // Top point
      { x: 1.176, y: -14.19 }, // Top-right inner point
      { x: 3.804, y: -13.09 }, // Right outer point
      { x: 1.902, y: -15.81 }, // Bottom-right inner point
      { x: 2.351, y: -19.02 }, // Bottom-right outer point
      { x: 0, y: -17 }, // Bottom inner point
      { x: -2.351, y: -19.02 }, // Bottom-left outer point
      { x: -1.902, y: -15.81 }, // Bottom-left inner point
      { x: -3.804, y: -13.09 }, // Left outer point
      { x: -1.176, y: -14.19 }, // Top-left inner point
    ],
  } as AnyCircuitElement,
]

test("Generate gerber with cutouts", async () => {
  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "cutouts")
})

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
    width: 40,
    height: 20,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  {
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_0",
    pcb_component_id: "pcb_component_0",
    text: "KNOCK",
    font: "tscircuit2024",
    font_size: 2,
    layer: "top",
    anchor_position: { x: -9, y: 0 },
    anchor_alignment: "center",
    is_knockout: true,
    knockout_padding: {
      left: 0.5,
      right: 0.5,
      top: 0.4,
      bottom: 0.4,
    },
  } as AnyCircuitElement,
  {
    type: "pcb_copper_text",
    pcb_copper_text_id: "pcb_copper_text_1",
    pcb_component_id: "pcb_component_1",
    text: "OUT",
    font: "tscircuit2024",
    font_size: 1.6,
    layer: "bottom",
    is_mirrored: true,
    ccw_rotation: 20,
    anchor_position: { x: 9, y: 0 },
    anchor_alignment: "center",
    is_knockout: true,
  } as AnyCircuitElement,
]

test("Generate gerber with copper text knockout", async () => {
  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(
    import.meta.path,
    "copper-text-knockout",
  )
})

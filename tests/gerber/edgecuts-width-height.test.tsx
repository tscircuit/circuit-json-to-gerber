import type { AnyCircuitElement } from "circuit-json"
import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  stringifyGerberCommandLayers,
} from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"

test("generates rectangular edge cuts when width/height are provided", async () => {
  const board: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "board_rect",
    center: { x: 25, y: -10 },
    width: 40,
    height: 20,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  }

  const smtPad1: AnyCircuitElement = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "smt1",
    x: 10,
    y: -10,
    width: 1.5,
    height: 1.5,
    shape: "rect",
    layer: "top",
  }

  const smtPad2: AnyCircuitElement = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "smt2",
    x: 30,
    y: -5,
    width: 2,
    height: 1,
    shape: "rect",
    layer: "top",
  }

  const gerber_cmds = convertSoupToGerberCommands([board, smtPad1, smtPad2])

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, "")

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "rectangular")
})

import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import {
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
} from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"
import MacroKeypad from "./components/MacroKeypad"

test("Generate gerber of macrokeypad", async () => {
  const circuit = new Circuit()
  circuit.add(<MacroKeypad />)
  const circuitJson = circuit.getCircuitJson()
  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: true,
  })
  const edgecut_gerber = stringifyGerberCommands(gerber_cmds.Edge_Cuts)

  // TODO parse gerber to check for correctness

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "simple3")
})

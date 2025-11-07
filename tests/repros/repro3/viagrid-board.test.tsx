import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import viagridCircuitJson from "./assets/viagrid-circuit-json.json"

test("Generate viagrid board", async () => {
  const gerber_cmds = convertSoupToGerberCommands(viagridCircuitJson as any)

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "viagrid-board")
})

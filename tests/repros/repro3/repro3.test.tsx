import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import greenboardJson from "./greenboard.json"
import type { AnyCircuitElement } from "circuit-json"

test("repro3 greenboard", async () => {
  const soup = greenboardJson as AnyCircuitElement[]

  const gerber_cmds = convertSoupToGerberCommands(soup)
  const excellon_drill_cmds_plated = convertSoupToExcellonDrillCommands({
    circuitJson: soup,
    is_plated: true,
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: soup,
    is_plated: false,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutputPlated = stringifyExcellonDrill(
    excellon_drill_cmds_plated,
  )
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellon_drill_cmds_unplated,
  )

  await maybeOutputGerber(gerberOutput, excellonDrillOutputPlated)

  expect({
    ...gerberOutput,
    "drill_plated.drl": excellonDrillOutputPlated,
    "drill_unplated.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "repro3")
})

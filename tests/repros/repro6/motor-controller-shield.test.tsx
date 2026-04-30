import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import type { AnyCircuitElement } from "circuit-json"
import motorControllerShieldCircuitJson from "./motor-controller-sheild.json"

test("Generate motor controller shield board", async () => {
  const circuitJson = motorControllerShieldCircuitJson as AnyCircuitElement[]

  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds_plated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: true,
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
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
  }).toMatchGerberSnapshot(import.meta.path, "motor-controller-shield")
})

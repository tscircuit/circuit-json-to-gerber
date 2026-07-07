import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import distanceSensorJson from "./distance-sensor.json"

test("repro9 distance sensor cutouts", async () => {
  const circuitJson = distanceSensorJson as AnyCircuitElement[]

  const gerberCmds = convertSoupToGerberCommands(circuitJson)
  const excellonDrillCmdsPlated = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })
  const excellonDrillCmdsUnplated = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: false,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerberCmds)
  const excellonDrillOutputPlated = stringifyExcellonDrill(
    excellonDrillCmdsPlated,
  )
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellonDrillCmdsUnplated,
  )

  await maybeOutputGerber(gerberOutput, excellonDrillOutputPlated)

  expect({
    ...gerberOutput,
    "drill_plated.drl": excellonDrillOutputPlated,
    "drill_unplated.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "distance-sensor-cutout")
})

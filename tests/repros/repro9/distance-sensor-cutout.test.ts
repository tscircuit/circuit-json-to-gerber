import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import distanceSensorJson from "./distance-sensor.json"

test("repro9 distance sensor cutouts", async () => {
  const circuitJson = distanceSensorJson as AnyCircuitElement[]

  const gerberCmds = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(gerberCmds)

  expect(gerberOutput).toMatchGerberLayerSnapshots(
    import.meta.path,
    "distance-sensor-cutout",
    ["Edge_Cuts"],
  )
})

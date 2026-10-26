import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import fixture from "./assets/smartwatch-rounded-plated-pads-focused.circuit.json"

test("repro: both Smartwatch switch pad sizes lose their rounded corners", async () => {
  const circuitJson = fixture as AnyCircuitElement[]
  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  const drillLayers = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson,
  })
  const drillOutput = Object.fromEntries(
    Object.entries(drillLayers).map(([name, commands]) => [
      name,
      stringifyExcellonDrill(commands),
    ]),
  )
  await expect({
    ...gerberOutput,
    ...drillOutput,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "smartwatch-rounded-plated-pads-focused",
    circuitJson,
    ["F_Mask", "F_Cu"],
    {
      circuitJsonLabel: "Input: both switch pad sizes, radius 0.2 mm",
      gerberLabel: "Current Gerber: sharp copper and mask corners",
      circuitJsonPcbSvgOptions: { drawPaddingOutsideBoard: false },
      panelWidth: 720,
      panelHeight: 400,
    },
  )
})

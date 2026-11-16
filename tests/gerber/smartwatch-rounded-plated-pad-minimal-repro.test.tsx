import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import fixture from "./assets/smartwatch-rounded-plated-pad-minimal.circuit.json"

test("a single switch-size plated pad preserves its rounded corners", async () => {
  const circuitJson = fixture as AnyCircuitElement[]
  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  const drillOutput = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({ circuitJson, is_plated: true }),
  )

  await expect({
    ...gerberOutput,
    "drill.drl": drillOutput,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "smartwatch-rounded-plated-pad-minimal",
    circuitJson,
    ["F_Mask", "F_Cu"],
    {
      circuitJsonLabel: "Input: 0.2 mm pad corner radius",
      gerberLabel: "Gerber: rounded pad and mask corners",
      circuitJsonPcbSvgOptions: { drawPaddingOutsideBoard: false },
      panelWidth: 480,
      panelHeight: 320,
    },
  )
})

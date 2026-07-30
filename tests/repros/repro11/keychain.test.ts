import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import circuitJson from "./keychain.json"

test("repro11: keychain Circuit JSON matches top and bottom Gerber renders", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson as AnyCircuitElement[]),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "keychain-top",
    circuitJson as AnyCircuitElement[],
    ["F_Cu", "F_Mask", "F_SilkScreen", "Edge_Cuts"],
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "keychain-bottom",
    circuitJson as AnyCircuitElement[],
    ["B_Cu", "B_Mask", "B_SilkScreen", "Edge_Cuts"],
  )
})

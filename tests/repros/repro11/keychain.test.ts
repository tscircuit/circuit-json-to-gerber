import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import circuitJson from "./keychain.json"

test("repro11: keychain silkscreen text uses alphabet glyph advances", () => {
  const longSilkscreenText = circuitJson.find(
    (element) =>
      element.type === "pcb_silkscreen_text" &&
      element.text === "Stay wild. friend.",
  ) as AnyCircuitElement
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([longSilkscreenText]),
  )
  const xCoordinates = [
    ...gerberOutput.F_SilkScreen.matchAll(/X(-?\d+)Y/g),
  ].map(([, x]) => Number(x) / 1e6)
  const renderedWidth = Math.max(...xCoordinates) - Math.min(...xCoordinates)

  expect(renderedWidth).toBeLessThan(25)
  expect(gerberOutput.F_SilkScreen).toContain("%ADD10C,0.180000*%")
})

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

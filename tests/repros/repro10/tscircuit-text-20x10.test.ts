import { expect, test } from "bun:test"
import { lineAlphabet } from "@tscircuit/alphabet"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import circuitJson from "./tscircuit-text-20x10.json"

const silkscreenText = "tscircuit"

const getGlyphStrokeCount = (text: string) =>
  text
    .split("")
    .reduce(
      (count, char) =>
        count + (lineAlphabet[char as keyof typeof lineAlphabet]?.length ?? 0),
      0,
    )

test.failing(
  "repro10: gerber preserves lowercase silkscreen text glyphs",
  () => {
    const gerberCommands = convertSoupToGerberCommands(
      circuitJson as AnyCircuitElement[],
    )

    const plotOperationCount = gerberCommands.F_SilkScreen.filter(
      (command) => command.command_code === "D01",
    ).length

    expect(plotOperationCount).toBe(getGlyphStrokeCount(silkscreenText))
  },
)

test("repro10: pcb viewer and gerber render show lowercase text mismatch", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson as AnyCircuitElement[]),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "tscircuit-text-20x10",
    circuitJson as AnyCircuitElement[],
    ["F_SilkScreen"],
    {
      colors: {
        F_SilkScreen: "#f6f36b",
      },
      backgroundColor: "#c7c7c7",
      circuitJsonLabel: "PCB viewer",
      gerberLabel: "Gerber render",
      panelWidth: 520,
      panelHeight: 360,
    },
  )
})

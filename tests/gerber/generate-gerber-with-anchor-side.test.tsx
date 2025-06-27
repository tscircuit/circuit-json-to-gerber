import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"

// Ensure that setting `anchor_side` on silkscreen text influences alignment

test("silkscreen text respects anchor_side", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={20}>
      <silkscreentext text="A" layer="top" pcbX={5} pcbY={5} />
    </board>,
  )
  const soup: any = circuit.getCircuitJson()

  const textElm = soup.find((e: any) => e.type === "pcb_silkscreen_text")
  textElm.anchor_side = "left"

  const gerber = convertSoupToGerberCommands(soup)
  const gerberOutput = stringifyGerberCommandLayers(gerber)
  await maybeOutputGerber(gerberOutput, "")

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "anchor-side")
})

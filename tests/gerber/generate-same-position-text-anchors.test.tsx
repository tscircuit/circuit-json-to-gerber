import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"

const anchors = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const

test("Render silkscreen text with all anchors at same position", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={40} height={20}>
      {anchors.map((anchor) => (
        <silkscreentext
          key={"top-" + anchor}
          text="A"
          fontSize={1}
          anchorAlignment={anchor}
          layer="top"
          pcbX={0}
          pcbY={0}
        />
      ))}
      {anchors.map((anchor) => (
        <silkscreentext
          key={"bottom-" + anchor}
          text="A"
          fontSize={1}
          anchorAlignment={anchor}
          layer="bottom"
          pcbX={0}
          pcbY={0}
        />
      ))}
    </board>,
  )

  const soup = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(soup as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup as any,
    is_plated: true,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(
    import.meta.path,
    "silkscreen-anchors",
  )
})

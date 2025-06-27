import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"

// Ensure that setting `anchor_side` on silkscreen text influences alignment

test("silkscreen text respects anchor_side", async () => {
  const circuit = new Circuit()
  const width = 142
  const height = 130
  const margin = 10
  circuit.add(
    <board width={width} height={height}>
      <resistor
        resistance="100k"
        footprint="0603"
        name="R1"
        pcbY={0} pcbX={0}/>
      <group pcbX={width / 2} pcbY={-height / 2 + margin}>
        <silkscreentext
          text="Routed with the tscircuit autorouter"
          fontSize={2}
          pcbY={0}
          anchorAlignment="bottom_right"
        />
        <silkscreentext
          text="MIT Open Source"
          fontSize={2}
          pcbY={-2}
          anchorAlignment="bottom_right"
        />
        <silkscreentext
          text="tscircuit.com/seveibar/led-water-accelerometer"
          fontSize={2}
          pcbY={-4}
          anchorAlignment="bottom_right"
        />
      </group>
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

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "anchor-side")
})

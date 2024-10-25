import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
} from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import gerberToSvg from "gerber-to-svg"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { Circuit } from "@tscircuit/core"
// If you're trying to test this, I would recommend opening up Kicad's Gerber
// Viewer and loading in the files from the generated directory "gerber-output"
// that's produced if OUTPUT_GERBER=1 when you do `npx ava ./tests/gerber/generate-gerber-with-trace.test.ts`
// You can generate the files then hit reload in the Gerber Viewer to see that
// everything looks approximately correct
test("Generate simple board with a multi-layer trace", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board
      width={20}
      height={20}
      outline={[
        { x: -22.5, y: 24.5 },
        { x: 22.5, y: 24.5 },
        { x: 22.5, y: 16.5 },
        { x: 20.5, y: 16.5 },
        { x: 20.5, y: 12.5 },
        { x: 22.5, y: 12.5 },
        { x: 22.5, y: 2.5 },
        { x: 18, y: -1.5 },
        { x: 18, y: -18 },
        { x: -18, y: -18 },
        { x: -18, y: -1.5 },
        { x: -22.5, y: 2.5 },
        { x: -22.5, y: 12.5 },
        { x: -20.5, y: 12.5 },
        { x: -20.5, y: 16.5 },
        { x: -22.5, y: 16.5 },
        { x: -22.5, y: 24.5 },
      ]}
    >
      <resistor
        name="R1"
        resistance={"1k"}
        pcbX={-4}
        pcbY={4}
        footprint={"1210"}
      />
      <resistor
        name="R2"
        resistance={"1k"}
        pcbX={2}
        pcbY={2}
        footprint={"1210"}
        layer={"bottom"}
      />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )
  const soup = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(soup)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup,
    is_plated: true,
  })
  const edgecut_gerber = stringifyGerberCommands(gerber_cmds.Edge_Cuts)

  // TODO parse gerber to check for correctness

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "simple1")
})

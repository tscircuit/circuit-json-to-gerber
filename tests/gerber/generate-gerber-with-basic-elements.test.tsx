import type { AnyCircuitElement } from "circuit-json"
import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import {
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
} from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"
// If you're trying to test this, I would recommend opening up Kicad's Gerber
// Viewer and loading in the files from the generated directory "gerber-output"
// that's produced if OUTPUT_GERBER=1 when you do `npx ava ./tests/gerber/generate-gerber-with-trace.test.ts`
// You can generate the files then hit reload in the Gerber Viewer to see that
// everything looks approximately correct
test("Generate simple gerber with basic elements", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board height={20} width={20} pcbX={0} pcbY={0}>
      <platedhole
        holeDiameter={1}
        outerDiameter={1.2}
        shape="circle"
        pcbX={2}
        pcbY={2}
      />
      <hole diameter={1} pcbX={0} pcbY={4} />
    </board>,
  )
  const soup = circuit.getCircuitJson()
  const gerber_cmds = convertSoupToGerberCommands(soup)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    soup: soup,
    is_plated: true,
  })
  const edgecut_gerber = stringifyGerberCommands(gerber_cmds.Edge_Cuts)
  // console.log("Gerber")
  // console.log("----------------------------------------------")
  // console.log(edgecut_gerber)

  // TODO parse gerber to check for correctness

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "simple2")

  // gerberToSvg(gerberOutput.Edge_Cuts, {}, (err, svg) => {
  //   expect(svg).toMatchSvgSnapshot(import.meta.path, "gerber-edge-cuts")
  // })

  // render(
})

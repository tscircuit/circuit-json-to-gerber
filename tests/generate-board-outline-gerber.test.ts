import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/convert-soup-to-gerber-commands"
import {
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
} from "src/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import gerberToSvg from "gerber-to-svg"
import type { AnySoupElement } from "@tscircuit/soup"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
// If you're trying to test this, I would recommend opening up Kicad's Gerber
// Viewer and loading in the files from the generated directory "gerber-output"
// that's produced if OUTPUT_GERBER=1 when you do `npx ava ./tests/gerber/generate-gerber-with-trace.test.ts`
// You can generate the files then hit reload in the Gerber Viewer to see that
// everything looks approximately correct
test("Generate simple gerber with a single trace", async () => {
  const soup: AnySoupElement[] = [
    {
      type: "pcb_board",
      width: 100,
      height: 100,
      center: { x: 0, y: 0 },
      outline: [
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
      ],
    },
    {
      type: "pcb_trace",
      source_trace_id: "source_trace_1",
      pcb_trace_id: "pcb_trace_1",
      route: [
        {
          x: -10,
          y: 0,
          width: 0.1,
          route_type: "wire",
          layer: "top",
        },
        {
          x: 10,
          y: 0,
          width: 0.1,
          route_type: "wire",
          layer: "top",
        },
      ],
    },
  ]

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

  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "simple1")

  // gerberToSvg(gerberOutput.Edge_Cuts, {}, (err, svg) => {
  //   expect(svg).toMatchSvgSnapshot(import.meta.path, "gerber-edge-cuts")
  // })

  // render(
})

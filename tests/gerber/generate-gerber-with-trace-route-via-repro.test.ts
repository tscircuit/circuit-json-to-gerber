import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    num_layers: 2,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_with_route_via",
    route: [
      {
        route_type: "wire",
        x: -4,
        y: 0,
        width: 0.3,
        layer: "top",
      },
      {
        route_type: "via",
        x: 0,
        y: 0,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 0.6,
        outer_diameter: 1.2,
      },
      {
        route_type: "wire",
        x: 4,
        y: 0,
        width: 0.3,
        layer: "bottom",
      },
    ],
  },
] as AnyCircuitElement[]

test("trace route vias emit via pads, drill hits, and following layer segments", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const drillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )

  expect(gerberOutput.F_Cu).toContain("X-04000000Y000000000D02*")
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D01*")
  expect(gerberOutput.F_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput.B_Cu).toContain("X004000000Y000000000D01*")
  expect(drillOutput).toContain("X0.0000Y0.0000")

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "trace-route-via-repro-copper",
    ["F_Cu", "B_Cu"],
  )
})

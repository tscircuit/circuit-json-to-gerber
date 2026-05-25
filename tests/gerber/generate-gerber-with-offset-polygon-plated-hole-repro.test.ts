import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 6,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "offset_polygon_plated_hole",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.7,
    pad_outline: [
      { x: -1.2, y: -0.7 },
      { x: 0.8, y: -0.9 },
      { x: 1.2, y: 0.3 },
      { x: -0.3, y: 1 },
      { x: -1.1, y: 0.4 },
    ],
    hole_offset_x: 0,
    hole_offset_y: 0,
    x: 2,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("polygon plated hole pad outline is translated by x/y", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const drillLayers = Object.fromEntries(
    Object.entries(
      convertSoupToExcellonDrillCommandLayers({
        circuitJson,
      }),
    ).map(([layerName, commands]) => [
      layerName,
      stringifyExcellonDrill(commands),
    ]),
  )

  expect(drillLayers["drill-L1-L2.drl"]).toContain("X2.0000Y0.0000")

  expect(gerberOutput.F_Cu).not.toContain("X-01200000Y-00700000D02*")
  expect(gerberOutput.F_Cu).not.toContain("X001200000Y000300000D01*")
  expect(gerberOutput.F_Cu).toContain("X000800000Y-00700000D02*")
  expect(gerberOutput.F_Cu).toContain("X003200000Y000300000D01*")

  await expect({
    ...gerberOutput,
    ...drillLayers,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "offset-polygon-plated-hole-repro",
    circuitJson,
    ["F_Cu", "B_Cu"],
  )
})

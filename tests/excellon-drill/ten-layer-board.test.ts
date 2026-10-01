import { expect, test } from "bun:test"
import { pcb_board, pcb_via } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "../../src"
import {
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "../../src/excellon-drill"

const board = pcb_board.parse({
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  num_layers: 10,
})

const buriedVia = pcb_via.parse({
  type: "pcb_via",
  pcb_via_id: "buried-via",
  x: 1,
  y: 2,
  hole_diameter: 0.3,
  outer_diameter: 0.6,
  layers: ["inner8", "inner7"],
})

test("complete 10-layer export includes through, blind and buried drill files", () => {
  const throughVia = pcb_via.parse({
    ...buriedVia,
    pcb_via_id: "through-via",
    x: -4,
    layers: [
      "top",
      "inner1",
      "inner2",
      "inner3",
      "inner4",
      "inner5",
      "inner6",
      "inner7",
      "inner8",
      "bottom",
    ],
  })
  const blindVia = pcb_via.parse({
    ...buriedVia,
    pcb_via_id: "blind-via",
    x: 4,
    layers: ["bottom", "inner8"],
  })
  const files = convertCircuitJsonToGerberFiles([
    board,
    throughVia,
    buriedVia,
    blindVia,
  ])

  expect(files["In7_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L8,Inr*%")
  expect(files["In8_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L9,Inr*%")
  expect(files["B_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L10,Bot*%")
  expect(
    Object.keys(files)
      .filter((name) => name.endsWith(".drl"))
      .sort(),
  ).toEqual(["drill-L1-L10.drl", "drill-L8-L9.drl", "drill-L9-L10.drl"])
  expect(files["drill-L1-L10.drl"]).toContain(
    "#@! TF.FileFunction,Plated,1,10,PTH",
  )
  expect(files["drill-L1-L10.drl"]).toContain("X-4.0000Y2.0000")
  expect(files["drill-L1-L10.drl"]).not.toContain("X1.0000Y2.0000")
  expect(files["drill-L8-L9.drl"]).toContain(
    "#@! TF.FileFunction,Plated,8,9,PTH",
  )
  expect(files["drill-L8-L9.drl"]).toContain("X1.0000Y2.0000")
  expect(files["drill-L9-L10.drl"]).toContain(
    "#@! TF.FileFunction,Plated,9,10,PTH",
  )
  expect(files["drill-L9-L10.drl"]).toContain("X4.0000Y2.0000")
})

test("explicit reversed inner7/inner8 drill spans preserve the selected barrel", () => {
  const drill = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson: [board, buriedVia],
      is_plated: true,
      layer_span: { from_layer: "inner8", to_layer: "inner7" },
    }),
  )
  expect(drill).toContain("#@! TF.FileFunction,Plated,8,9,PTH")
  expect(drill).toContain("X1.0000Y2.0000")
})

test.each(["inner7", "inner8"] as const)(
  "%s is still invalid for an 8-layer board",
  (layer) => {
    const via = pcb_via.parse({ ...buriedVia, layers: ["top", layer] })
    expect(() =>
      convertCircuitJsonToGerberFiles([{ ...board, num_layers: 8 }, via]),
    ).toThrow(`Invalid layer "${layer}" for 8-layer board`)
  },
)

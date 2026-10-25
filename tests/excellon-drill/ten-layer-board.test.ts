import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"

const makeCircuit = (layers: LayerRef[]): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 10,
    thickness: 1.4,
    material: "fr4",
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 1,
    y: 2,
    hole_diameter: 0.3,
    outer_diameter: 0.55,
    layers,
  },
]

test("exports a ten-layer through via with all physical layers", async () => {
  const circuitJson = makeCircuit([
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
  ])
  let files: ReturnType<typeof convertCircuitJsonToGerberFiles>
  try {
    files = convertCircuitJsonToGerberFiles(circuitJson)
  } catch (error) {
    await expect(circuitJson).toMatchCircuitJsonPcbAndMessageSnapshot(
      import.meta.path,
      "ten-layer-through-via-before-fix",
      ["Gerber export failed:", String(error)],
      { messageLabel: "Drill export failure" },
    )
    throw error
  }
  await expect({
    B_Cu: files["B_Cu.gbr"],
    "drill-L1-L10.drl": files["drill-L1-L10.drl"],
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "ten-layer-through-via-after-fix",
    circuitJson,
    ["B_Cu", "drill-L1-L10.drl"],
    {
      gerberLabel: "Bottom copper + L1-L10 drill",
      backgroundColor: "#16382d",
      colors: { B_Cu: "#e5b65c", "drill-L1-L10.drl": "#0b1020" },
    },
  )
  expect(Object.keys(files).filter((name) => name.endsWith(".drl"))).toEqual([
    "drill-L1-L10.drl",
  ])
  expect(files["drill-L1-L10.drl"]).toContain("Plated,1,10,PTH")
  expect(files["drill-L1-L10.drl"].match(/^X1\.0000Y2\.0000$/gm)).toHaveLength(
    1,
  )
})

test.each([
  { layers: ["inner7", "top"], first: 1, last: 8 },
  { layers: ["inner8", "inner7"], first: 8, last: 9 },
  { layers: ["bottom", "inner8"], first: 9, last: 10 },
] satisfies { layers: LayerRef[]; first: number; last: number }[])(
  "exports the normalized physical span $layers",
  ({ layers, first, last }) => {
    const files = convertCircuitJsonToExcellonDrillCommandLayers({
      circuitJson: makeCircuit(layers),
    })
    const filename = `drill-L${first}-L${last}.drl`
    expect(Object.keys(files)).toEqual([filename])
    expect(stringifyExcellonDrill(files[filename])).toContain(
      `Plated,${first},${last},PTH`,
    )
  },
)

test("rejects an inner layer outside the board stackup", () => {
  const circuitJson = makeCircuit(["top", "inner8"])
  const board = circuitJson.find((element) => element.type === "pcb_board")!
  board.num_layers = 8
  expect(() =>
    convertCircuitJsonToExcellonDrillCommandLayers({ circuitJson }),
  ).toThrow('Invalid layer "inner8" for 8-layer board')
})

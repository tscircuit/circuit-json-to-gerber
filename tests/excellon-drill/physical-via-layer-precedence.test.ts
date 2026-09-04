import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"

type Via = Extract<AnyCircuitElement, { type: "pcb_via" }>

const makeCircuit = (
  overrides: Partial<Via> = {},
  numLayers = 4,
): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: numLayers,
  } as AnyCircuitElement,
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 1,
    y: 2,
    hole_diameter: 0.15,
    outer_diameter: 0.3,
    layers: ["bottom", "inner2", "top", "inner1"],
    from_layer: "inner1",
    to_layer: "top",
    ...overrides,
  },
]

const expectDrillSpan = (
  circuitJson: AnyCircuitElement[],
  firstLayer: number,
  lastLayer: number,
) => {
  const files = convertCircuitJsonToExcellonDrillCommandLayers({ circuitJson })
  const filename = `drill-L${firstLayer}-L${lastLayer}.drl`
  expect(Object.keys(files)).toEqual([filename])
  const output = stringifyExcellonDrill(files[filename])
  expect(output).toContain(`Plated,${firstLayer},${lastLayer},PTH`)
  expect(output.match(/^X1\.0000Y2\.0000$/gm)).toHaveLength(1)
}

test("Gerber file export uses the physical through-via span", () => {
  const files = convertCircuitJsonToGerberFiles(makeCircuit())
  expect(Object.keys(files).filter((name) => name.endsWith(".drl"))).toEqual([
    "drill-L1-L4.drl",
  ])
  expect(files["drill-L1-L4.drl"]).toContain("Plated,1,4,PTH")
  expect(files["drill-L1-L4.drl"]).toContain("X1.0000Y2.0000")
})

test.each([2, 4, 6, 8])(
  "physical endpoints span all %i board layers despite legacy endpoints",
  (numLayers) => {
    const circuitJson = makeCircuit(
      {
        layers: ["bottom", "top"],
        from_layer: numLayers === 2 ? "top" : "inner1",
        to_layer: "top",
      },
      numLayers,
    )
    expectDrillSpan(circuitJson, 1, numLayers)
  },
)

test.each([
  { layers: ["inner1", "top"], firstLayer: 1, lastLayer: 2 },
  { layers: ["inner2", "inner1"], firstLayer: 2, lastLayer: 3 },
  { layers: ["bottom", "inner2"], firstLayer: 3, lastLayer: 4 },
])("physical span $layers overrides legacy through-via endpoints", (span) => {
  expectDrillSpan(
    makeCircuit({
      layers: [...span.layers],
      from_layer: "top",
      to_layer: "bottom",
    }),
    span.firstLayer,
    span.lastLayer,
  )
})

test.each([
  { name: "missing", layers: undefined },
  { name: "empty", layers: [] as LayerRef[] },
])(
  "$name physical layers fall back to normalized legacy endpoints",
  ({ layers }) => {
    expectDrillSpan(makeCircuit({ layers }), 1, 2)
  },
)

test("missing layer metadata defaults to a through-board drill", () => {
  expectDrillSpan(
    makeCircuit({
      layers: undefined,
      from_layer: undefined,
      to_layer: undefined,
    }),
    1,
    4,
  )
})

test("single-span export filters by physical layers without mutating the input", () => {
  const circuitJson = makeCircuit()
  const original = structuredClone(circuitJson)
  const throughDrill = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({ circuitJson, is_plated: true }),
  )
  const blindDrill = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
      layer_span: { from_layer: "top", to_layer: "inner1" },
    }),
  )
  expect(throughDrill).toContain("X1.0000Y2.0000")
  expect(blindDrill).not.toContain("X1.0000Y2.0000")
  expect(circuitJson).toEqual(original)
})

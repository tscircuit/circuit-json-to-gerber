import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToExcellonDrillCommandLayers } from "src/excellon-drill"

const tenLayerCopperRefs: LayerRef[] = [
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
]

test("exports Excellon drill files for 10-layer boards with inner7 and inner8 vias", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 30,
      num_layers: 10,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_through_10l",
      x: 0,
      y: 0,
      hole_diameter: 0.4,
      outer_diameter: 0.8,
      layers: [...tenLayerCopperRefs],
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_buried_inner7_inner8",
      x: 5,
      y: 2,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["inner7", "inner8"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_blind_inner7_bottom",
      x: -5,
      y: -2,
      hole_diameter: 0.35,
      outer_diameter: 0.7,
      layers: ["inner7", "bottom"],
    },
  ] as AnyCircuitElement[]

  const files = convertCircuitJsonToGerberFiles(circuitJson)

  expect(files["In7_Cu.gbr"]).toBeDefined()
  expect(files["In8_Cu.gbr"]).toBeDefined()

  expect(files["drill-L1-L10.drl"]).toBeDefined()
  expect(files["drill-L1-L10.drl"]).toContain(
    "; #@! TF.FileFunction,Plated,1,10,PTH",
  )
  expect(files["drill-L1-L10.drl"]).toContain("X0.0000Y0.0000")

  expect(files["drill-L8-L9.drl"]).toBeDefined()
  expect(files["drill-L8-L9.drl"]).toContain(
    "; #@! TF.FileFunction,Plated,8,9,PTH",
  )
  expect(files["drill-L8-L9.drl"]).toContain("X5.0000Y2.0000")

  expect(files["drill-L8-L10.drl"]).toBeDefined()
  expect(files["drill-L8-L10.drl"]).toContain(
    "; #@! TF.FileFunction,Plated,8,10,PTH",
  )
  expect(files["drill-L8-L10.drl"]).toContain("X-5.0000Y-2.0000")
})

test("rejects inner layers beyond the board layer count", () => {
  const eightLayerWithInner7 = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 8,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_invalid",
      x: 0,
      y: 0,
      hole_diameter: 0.4,
      outer_diameter: 0.8,
      layers: ["inner7", "bottom"],
    },
  ] as AnyCircuitElement[]

  expect(() =>
    convertCircuitJsonToExcellonDrillCommandLayers({
      circuitJson: eightLayerWithInner7,
    }),
  ).toThrow('Invalid layer "inner7" for 8-layer board')

  const tenLayerWithInner9 = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 10,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_invalid_10l",
      x: 0,
      y: 0,
      hole_diameter: 0.4,
      outer_diameter: 0.8,
      layers: ["inner9" as LayerRef, "bottom"],
    },
  ] as AnyCircuitElement[]

  expect(() =>
    convertCircuitJsonToExcellonDrillCommandLayers({
      circuitJson: tenLayerWithInner9,
    }),
  ).toThrow('Invalid layer "inner9" for 10-layer board')
})

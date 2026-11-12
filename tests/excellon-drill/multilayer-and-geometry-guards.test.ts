import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"

test("excellon drill supports 10-layer boards (inner7/inner8) and infers layer count when pcb_board.num_layers is omitted", () => {
  const tenLayerCircuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_10",
      center: { x: 0, y: 0 },
      width: 40,
      height: 40,
      num_layers: 10,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_through_10",
      x: 2,
      y: 3,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
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
      ] as LayerRef[],
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_buried_7_8",
      x: -2,
      y: -3,
      hole_diameter: 0.25,
      outer_diameter: 0.5,
      layers: ["inner7", "inner8"] as LayerRef[],
    },
  ]

  const files = convertCircuitJsonToGerberFiles(tenLayerCircuit)
  expect(files["drill-L1-L10.drl"]).toBeDefined()
  expect(files["drill-L1-L10.drl"]).toContain("Plated,1,10,PTH")
  expect(files["drill-L8-L9.drl"]).toBeDefined()
  expect(files["drill-L8-L9.drl"]).toContain("Plated,8,9,PTH")

  // Inferred 4-layer stackup when pcb_board omits num_layers
  const inferredFourLayerCircuit: AnyCircuitElement[] = [
    {
      type: "pcb_via",
      pcb_via_id: "via_inferred_4",
      x: 1,
      y: 1,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["top", "inner1", "inner2", "bottom"],
    },
  ]
  const inferredDrills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: inferredFourLayerCircuit,
  })
  expect(Object.keys(inferredDrills)).toEqual(["drill-L1-L4.drl"])
  expect(stringifyExcellonDrill(inferredDrills["drill-L1-L4.drl"]!)).toContain(
    "Plated,1,4,PTH",
  )
})

test("excellon drill skips non-positive or non-finite drill diameters and incomplete pcb_board bounds", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "incomplete_board",
    } as any,
    {
      type: "pcb_via",
      pcb_via_id: "invalid_via",
      x: 0,
      y: 0,
      hole_diameter: 0,
      outer_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "invalid_npth",
      hole_shape: "circle",
      x: 1,
      y: 1,
      hole_diameter: Number.NaN,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout_1",
      shape: "circle",
      center: { x: 0, y: 0 },
      radius: 1,
    },
  ]

  const drills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson,
  })
  expect(Object.keys(drills)).toEqual([])
})

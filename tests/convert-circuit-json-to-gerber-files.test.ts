import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "../src"

test("returns all Gerber and Excellon files for a multilayer board", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 4,
    },
    {
      type: "pcb_via",
      pcb_via_id: "blind-via",
      x: -4,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      layers: ["top", "inner1"],
      from_layer: "top",
      to_layer: "inner1",
    },
    {
      type: "pcb_via",
      pcb_via_id: "through-via",
      x: 4,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "mounting-hole",
      x: 0,
      y: 4,
      hole_diameter: 2,
    },
  ] as AnyCircuitElement[]

  const files = convertCircuitJsonToGerberFiles(circuitJson)

  expect(Object.keys(files)).toEqual(
    expect.arrayContaining([
      "F_Cu.gbr",
      "In1_Cu.gbr",
      "In2_Cu.gbr",
      "B_Cu.gbr",
      "Edge_Cuts.gbr",
      "drill-L1-L2.drl",
      "drill-L1-L4.drl",
      "drill_npth.drl",
    ]),
  )
  expect(files["drill-L1-L2.drl"]).toContain("X-4.0000Y0.0000")
  expect(files["drill-L1-L4.drl"]).toContain("X4.0000Y0.0000")
  expect(files["drill_npth.drl"]).toContain("X0.0000Y4.0000")
})

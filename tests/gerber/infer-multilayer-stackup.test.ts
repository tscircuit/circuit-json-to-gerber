import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { convertCircuitJsonToExcellonDrillCommands } from "src/excellon-drill/convert-soup-to-excellon-drill-commands"
import { stringifyExcellonDrill } from "src/excellon-drill/stringify-excellon-drill"

test("infers 4-layer stackup from inner copper elements when pcb_board omits num_layers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      material: "fr4",
    } as AnyCircuitElement,
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner",
      route: [
        { route_type: "wire", x: -4, y: 0, width: 0.2, layer: "inner1" },
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "inner1" },
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "inner1",
          to_layer: "inner2",
        },
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "inner2" },
        { route_type: "wire", x: 4, y: 0, width: 0.2, layer: "inner2" },
      ],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_0",
      x: 0,
      y: 0,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "inner1", "inner2", "bottom"],
    },
  ]

  const gerbers = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )

  expect(Object.keys(gerbers)).toContain("In1_Cu")
  expect(Object.keys(gerbers)).toContain("In2_Cu")
  expect(gerbers.F_Cu).toContain("%TF.FileFunction,Copper,L1,Top*%")
  expect(gerbers.In1_Cu).toContain("%TF.FileFunction,Copper,L2,Inr*%")
  expect(gerbers.In2_Cu).toContain("%TF.FileFunction,Copper,L3,Inr*%")
  expect(gerbers.B_Cu).toContain("%TF.FileFunction,Copper,L4,Bot*%")
  expect(gerbers.In1_Cu).toContain("D01*")
  expect(gerbers.In2_Cu).toContain("D01*")

  const drillText = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )
  expect(drillText).toContain("Plated,1,4,PTH")
})

test("supports inner7 and inner8 via spans in Excellon drill export on 10-layer boards", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 10,
      thickness: 1.6,
      material: "fr4",
    } as AnyCircuitElement,
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_buried_7_8",
      x: 2,
      y: 2,
      outer_diameter: 0.5,
      hole_diameter: 0.25,
      layers: ["inner7", "inner8"],
    },
  ]

  const drillText = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
      layer_span: { from_layer: "inner7", to_layer: "inner8" },
    }),
  )

  expect(drillText).toContain("Plated,8,9,PTH")
})

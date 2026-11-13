import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("exports In1_Cu and In2_Cu gerbers for 4-layer board with inner copper pours and uncovered soldermask", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_4layer",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      material: "fr4",
      num_layers: 4,
      thickness: 1.6,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner1",
      layer: "inner1",
      shape: "rect",
      source_net_id: "net_gnd",
      covered_with_solder_mask: false,
      center: { x: 0, y: 0 },
      width: 16,
      height: 16,
      rotation: 0,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_inner2",
      layer: "inner2",
      shape: "rect",
      source_net_id: "net_gnd",
      covered_with_solder_mask: false,
      center: { x: 0, y: 0 },
      width: 14,
      height: 14,
      rotation: 0,
    } as PcbCopperPour,
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_bottom",
      layer: "bottom",
      shape: "rect",
      source_net_id: "net_gnd",
      covered_with_solder_mask: false,
      center: { x: 0, y: 0 },
      width: 18,
      height: 18,
      rotation: 0,
    } as PcbCopperPour,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph1",
      shape: "circle",
      x: -5,
      y: 0,
      outer_diameter: 1.2,
      hole_diameter: 0.6,
      layers: ["top", "inner1", "inner2", "bottom"],
    },
  ]

  const files = convertCircuitJsonToGerberFiles(circuitJson)

  expect(files["In1_Cu.gbr"]).toBeDefined()
  expect(files["In2_Cu.gbr"]).toBeDefined()
  expect(files["In1_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L2,Inr*%")
  expect(files["In2_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L3,Inr*%")
  expect(files["B_Cu.gbr"]).toContain("%TF.FileFunction,Copper,L4,Bot*%")
  expect(files["In1_Cu.gbr"]).toContain("G36*")
  expect(files["In2_Cu.gbr"]).toContain("G36*")
  expect(files["drill-L1-L4.drl"]).toBeDefined()
})

test("infers 4-layer stackup when inner layers are used without explicit board num_layers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_inner1",
      route: [
        {
          route_type: "wire",
          x: -4,
          y: 0,
          width: 0.25,
          layer: "inner1",
        },
        {
          route_type: "wire",
          x: 4,
          y: 0,
          width: 0.25,
          layer: "inner1",
        },
      ],
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      x: 0,
      y: 0,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["top", "inner1", "inner2", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    },
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  const files = convertCircuitJsonToGerberFiles(circuitJson)

  expect(gerberOutput.In1_Cu).toBeDefined()
  expect(gerberOutput.In2_Cu).toBeDefined()
  expect(gerberOutput.In1_Cu).toContain("%TF.FileFunction,Copper,L2,Inr*%")
  expect(gerberOutput.In2_Cu).toContain("%TF.FileFunction,Copper,L3,Inr*%")
  expect(files["drill-L1-L4.drl"]).toBeDefined()
})

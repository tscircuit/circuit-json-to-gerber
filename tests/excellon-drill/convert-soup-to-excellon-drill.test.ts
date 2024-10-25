import type { AnyCircuitElement } from "circuit-json"
import { test, expect } from "bun:test"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"

test("generate excellon drill text from axial resistor", async () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10000,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_0",
      x: -10,
      y: 10,
      layers: ["top", "bottom"],
      hole_diameter: 2.5,
      shape: "circle",
      outer_diameter: 3.2,
      port_hints: ["1"],
      pcb_component_id: "pcb_generic_component_0",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_1",
      x: 0.3103934649070921,
      y: -10.745920624907164,
      layers: ["top", "bottom"],
      hole_diameter: 1,
      shape: "circle",
      outer_diameter: 1.2,
      port_hints: ["1"],
      pcb_component_id: "pcb_component_simple_bug_1",
      pcb_port_id: "pcb_port_25",
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_0",
      x: -4.281249780862737,
      y: -14.233181814231745,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["top", "bottom"],
      from_layer: "top",
      to_layer: "bottom",
    },
  ]

  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: soup,
    is_plated: true,
  })

  const excellon_drill_file_content =
    stringifyExcellonDrill(excellon_drill_cmds)

  expect(excellon_drill_file_content.includes("X-10.0000Y10.0000")).toBeTrue()
  expect(excellon_drill_file_content.includes("T10C2.500000")).toBeTrue()
  expect(excellon_drill_file_content.includes("G90")).toBeTrue()
  expect(excellon_drill_file_content.includes("G05")).toBeTrue()
})

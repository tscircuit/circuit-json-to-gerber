import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommands } from "src/gerber/stringify-gerber"

// Test that 4-layer boards emit In1_Cu and In2_Cu gerber files
// for traces routed on inner1 and inner2 layers
test("4-layer board emits In1_Cu and In2_Cu gerbers for inner layer traces", () => {
  // Minimal circuit JSON with a trace on inner1 and inner2
  const circuitJson: any[] = [
    {
      type: "source_component",
      source_component_id: "sc0",
      name: "U1",
      ftype: "simple_chip",
    },
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 4,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_inner1",
      source_trace_id: "st0",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.25,
          layer: "inner1",
          start_pcb_port_id: "pp0",
        },
        {
          route_type: "wire",
          x: 5,
          y: 0,
          width: 0.25,
          layer: "inner1",
        },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_inner2",
      source_trace_id: "st1",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 2,
          width: 0.3,
          layer: "inner2",
          start_pcb_port_id: "pp1",
        },
        {
          route_type: "wire",
          x: 5,
          y: 2,
          width: 0.3,
          layer: "inner2",
        },
      ],
    },
  ]

  const gerberCmds = convertSoupToGerberCommands(circuitJson)

  // In1_Cu and In2_Cu should be present for the inner layer traces
  expect(gerberCmds.In1_Cu).toBeDefined()
  expect(gerberCmds.In2_Cu).toBeDefined()

  // In3_Cu and In4_Cu should NOT be present (no traces on those layers)
  expect(gerberCmds.In3_Cu).toBeUndefined()
  expect(gerberCmds.In4_Cu).toBeUndefined()

  // Standard layers should still be present
  expect(gerberCmds.F_Cu).toBeDefined()
  expect(gerberCmds.B_Cu).toBeDefined()
  expect(gerberCmds.Edge_Cuts).toBeDefined()

  // The In1_Cu gerber should contain a trace (wire plot operation)
  const in1GerberStr = stringifyGerberCommands(gerberCmds.In1_Cu!)
  expect(in1GerberStr).toContain("D01*") // plot operation (draw)
  expect(in1GerberStr).toContain("D02*") // move operation

  const in2GerberStr = stringifyGerberCommands(gerberCmds.In2_Cu!)
  expect(in2GerberStr).toContain("D01*")
  expect(in2GerberStr).toContain("D02*")

  // In1_Cu header should identify it as an inner copper layer
  expect(in1GerberStr).toContain("Copper,L2,Inr")
  expect(in2GerberStr).toContain("Copper,L3,Inr")
})

// Test that 2-layer boards (the default) do NOT emit inner layer gerbers
test("2-layer board does not emit inner copper layer gerbers", () => {
  const circuitJson: any[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_top",
      source_trace_id: "st0",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.25,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 5,
          y: 0,
          width: 0.25,
          layer: "top",
        },
      ],
    },
  ]

  const gerberCmds = convertSoupToGerberCommands(circuitJson)

  // Inner layers should not be present for a 2-layer board
  expect(gerberCmds.In1_Cu).toBeUndefined()
  expect(gerberCmds.In2_Cu).toBeUndefined()

  // Standard layers still present
  expect(gerberCmds.F_Cu).toBeDefined()
  expect(gerberCmds.B_Cu).toBeDefined()
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("direct cross-layer wire transitions do not emit false copper bridges", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_direct_layer_change",
      route: [
        {
          route_type: "wire",
          x: -8,
          y: 2,
          width: 0.25,
          layer: "top",
        },
        {
          route_type: "wire",
          x: -4,
          y: 2,
          width: 0.25,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 4,
          y: 2,
          width: 0.25,
          layer: "bottom",
        },
        {
          route_type: "wire",
          x: 8,
          y: 2,
          width: 0.25,
          layer: "bottom",
        },
      ],
    },
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )

  // F_Cu should only contain (-8, 2) -> (-4, 2), never bridging (-4, 2) -> (4, 2)
  expect(gerberOutput.F_Cu).toContain("X-08000000Y002000000D02*")
  expect(gerberOutput.F_Cu).toContain("X-04000000Y002000000D01*")
  expect(gerberOutput.F_Cu).not.toContain("X004000000Y002000000D01*")
  expect(gerberOutput.F_Cu.match(/D01\*/g)).toHaveLength(1)

  // B_Cu should only contain (4, 2) -> (8, 2)
  expect(gerberOutput.B_Cu).toContain("X004000000Y002000000D02*")
  expect(gerberOutput.B_Cu).toContain("X008000000Y002000000D01*")
  expect(gerberOutput.B_Cu.match(/D01\*/g)).toHaveLength(1)
})

test("blind and buried route vias do not bridge wires onto unrelated copper layers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_4l",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      num_layers: 4,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_blind_via_unrelated_layer",
      route: [
        {
          route_type: "wire",
          x: -5,
          y: 0,
          width: 0.2,
          layer: "top",
        },
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "inner1",
          to_layer: "inner2",
          hole_diameter: 0.3,
          outer_diameter: 0.6,
        },
        {
          route_type: "wire",
          x: 5,
          y: 0,
          width: 0.2,
          layer: "bottom",
        },
      ],
    },
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu.match(/D01\*/g) ?? []).toHaveLength(0)
  expect(gerberOutput.B_Cu.match(/D01\*/g) ?? []).toHaveLength(0)
})

test("through_pad transitions connect to vias, adjacent through_pads, and same-layer traversals without zero-length strokes", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_through_pad_via_and_pad_to_pad",
      route: [
        {
          route_type: "through_pad",
          start: { x: -8, y: 0 },
          end: { x: -7, y: 0 },
          width: 0.3,
          start_layer: "top",
          end_layer: "top",
        },
        {
          route_type: "via",
          x: -3,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
          hole_diameter: 0.4,
          outer_diameter: 0.8,
        },
        {
          route_type: "through_pad",
          start: { x: 2, y: 0 },
          end: { x: 2, y: 0 },
          width: 0.3,
          start_layer: "bottom",
          end_layer: "top",
        },
        {
          route_type: "through_pad",
          start: { x: 6, y: 0 },
          end: { x: 6, y: 0 },
          width: 0.3,
          start_layer: "top",
          end_layer: "bottom",
        },
        {
          route_type: "wire",
          x: 6,
          y: 0,
          width: 0.3,
          layer: "bottom",
        },
        {
          route_type: "wire",
          x: 10,
          y: 0,
          width: 0.3,
          layer: "bottom",
        },
      ],
    },
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )

  // Top layer:
  // 1) same-layer through_pad traversal (-8, 0) -> (-7, 0)
  // 2) through_pad -> via (-7, 0) -> (-3, 0)
  // 3) through_pad -> through_pad (2, 0) -> (6, 0)
  expect(gerberOutput.F_Cu).toContain("X-08000000Y000000000D02*")
  expect(gerberOutput.F_Cu).toContain("X-07000000Y000000000D01*")
  expect(gerberOutput.F_Cu).toContain("X-07000000Y000000000D02*")
  expect(gerberOutput.F_Cu).toContain("X-03000000Y000000000D01*")
  expect(gerberOutput.F_Cu).toContain("X002000000Y000000000D02*")
  expect(gerberOutput.F_Cu).toContain("X006000000Y000000000D01*")
  expect(gerberOutput.F_Cu.match(/D01\*/g)).toHaveLength(3)

  // Bottom layer:
  // 1) via -> through_pad (-3, 0) -> (2, 0)
  // 2) zero-length through_pad (6, 0) -> wire (6, 0) is skipped
  // 3) wire -> wire (6, 0) -> (10, 0)
  expect(gerberOutput.B_Cu).toContain("X-03000000Y000000000D02*")
  expect(gerberOutput.B_Cu).toContain("X002000000Y000000000D01*")
  expect(gerberOutput.B_Cu).toContain("X006000000Y000000000D02*")
  expect(gerberOutput.B_Cu).toContain("X010000000Y000000000D01*")
  expect(gerberOutput.B_Cu.match(/D01\*/g)).toHaveLength(2)
})

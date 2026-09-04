import type { AnyCircuitElement } from "circuit-json"

type Via = Extract<AnyCircuitElement, { type: "pcb_via" }>
type Trace = Extract<AnyCircuitElement, { type: "pcb_trace" }>
type RouteVia = Extract<Trace["route"][number], { route_type: "via" }>

export const makeDrillVia = (overrides: Partial<Via> = {}): Via => ({
  type: "pcb_via",
  pcb_via_id: "via",
  x: 1,
  y: 1,
  hole_diameter: 0.6,
  outer_diameter: 1.2,
  layers: ["top", "inner1", "inner2", "bottom"],
  from_layer: "top",
  to_layer: "bottom",
  ...overrides,
})

export const makeDrillTrace = (
  overrides: Partial<RouteVia> = {},
  traceId = "trace",
): Trace => ({
  type: "pcb_trace",
  pcb_trace_id: traceId,
  route: [
    {
      route_type: "via",
      x: 1,
      y: 1,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      from_layer: "top",
      to_layer: "bottom",
      ...overrides,
    },
  ],
})

export const makeDrillCircuit = (
  elements: AnyCircuitElement[],
): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 18,
    height: 6,
    num_layers: 4,
  } as AnyCircuitElement,
  ...elements,
]

export const duplicateViaDrillFixture = makeDrillCircuit([
  makeDrillVia({ pcb_via_id: "shared_a", x: -6 }),
  makeDrillVia({
    pcb_via_id: "shared_b",
    x: -6,
    layers: ["bottom", "inner2", "inner1", "top"],
  }),
  makeDrillVia({ pcb_via_id: "partial_transition", x: -3 }),
  makeDrillTrace({ x: -3, to_layer: "inner1" }, "partial_transition"),
  makeDrillVia({ pcb_via_id: "full_transition", x: 0 }),
  makeDrillTrace({ x: 0 }, "full_transition"),
  makeDrillTrace({ x: 3, from_layer: "inner1", to_layer: "inner2" }, "route_a"),
  makeDrillTrace({ x: 3, from_layer: "inner2", to_layer: "inner1" }, "route_b"),
  makeDrillVia({
    pcb_via_id: "genuine_blind",
    x: 6,
    layers: ["top", "inner1"],
    to_layer: "inner1",
  }),
])

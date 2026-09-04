import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  convertCircuitJsonToExcellonDrillCommands,
} from "src/excellon-drill"
import type { AnyExcellonDrillCommand } from "src/excellon-drill/any-excellon-drill-command-map"
import {
  makeDrillCircuit,
  makeDrillTrace,
  makeDrillVia,
} from "../fixtures/via-drill-deduplication"

const exportDrills = (elements: AnyCircuitElement[]) =>
  convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: makeDrillCircuit(elements),
  })

const drillHits = (commands: AnyExcellonDrillCommand[]) =>
  commands.filter((command) => command.command_code === "drill_at")

test("shared physical vias emit one drill despite different IDs and layer ordering", () => {
  const files = exportDrills([
    makeDrillVia({ pcb_trace_id: "trace_a" }),
    makeDrillVia({
      pcb_via_id: "copy",
      pcb_trace_id: "trace_b",
      outer_diameter: 1.4,
      layers: ["bottom", "top", "inner2", "inner1"],
    }),
  ])
  expect(Object.keys(files)).toEqual(["drill-L1-L4.drl"])
  expect(drillHits(files["drill-L1-L4.drl"])).toEqual([
    { command_code: "drill_at", x: 1, y: 1 },
  ])
})

test.each([
  { name: "missing", traceId: undefined },
  { name: "same", traceId: "trace" },
  { name: "different", traceId: "another_trace" },
])(
  "physical vias with $name trace IDs cover partial route transitions",
  ({ traceId }) => {
    const files = exportDrills([
      makeDrillTrace({ from_layer: "inner1", to_layer: "top" }),
      makeDrillVia({ pcb_trace_id: traceId }),
    ])
    expect(Object.keys(files)).toEqual(["drill-L1-L4.drl"])
    expect(drillHits(files["drill-L1-L4.drl"])).toHaveLength(1)
  },
)

test("an explicit via and its same-span route fallback produce one drill", () => {
  const files = exportDrills([makeDrillVia(), makeDrillTrace()])
  expect(drillHits(files["drill-L1-L4.drl"])).toHaveLength(1)
})

test("route-only vias remain supported and repeated reversed spans drill once", () => {
  const files = exportDrills([
    makeDrillTrace(),
    makeDrillTrace({ from_layer: "bottom", to_layer: "top" }, "reverse"),
  ])
  expect(Object.keys(files)).toEqual(["drill-L1-L4.drl"])
  expect(drillHits(files["drill-L1-L4.drl"])).toHaveLength(1)
})

test("coincident route-only vias with distinct spans remain separate", () => {
  const files = exportDrills([
    makeDrillTrace({ to_layer: "inner1" }, "upper"),
    makeDrillTrace({ from_layer: "inner1" }, "lower"),
  ])
  expect(Object.keys(files)).toEqual(["drill-L1-L2.drl", "drill-L2-L4.drl"])
  for (const file of Object.values(files))
    expect(drillHits(file)).toHaveLength(1)
})

test("coincident explicit vias with different physical spans remain separate", () => {
  const files = exportDrills([
    makeDrillVia(),
    makeDrillVia({ pcb_via_id: "blind", layers: ["inner1", "top"] }),
    makeDrillVia({ pcb_via_id: "buried", layers: ["inner2", "inner1"] }),
  ])
  expect(Object.keys(files)).toEqual([
    "drill-L1-L2.drl",
    "drill-L1-L4.drl",
    "drill-L2-L3.drl",
  ])
  for (const file of Object.values(files))
    expect(drillHits(file)).toHaveLength(1)
})

test("a route extending outside an explicit blind via keeps its own drill", () => {
  const files = exportDrills([
    makeDrillVia({ layers: ["top", "inner1"] }),
    makeDrillTrace({ from_layer: "inner1", to_layer: "bottom" }),
  ])
  expect(Object.keys(files)).toEqual(["drill-L1-L2.drl", "drill-L2-L4.drl"])
  for (const file of Object.values(files))
    expect(drillHits(file)).toHaveLength(1)
})

test("stacked explicit spans do not suppress a route crossing both barrels", () => {
  const files = exportDrills([
    makeDrillVia({ layers: ["top", "inner1"] }),
    makeDrillVia({ pcb_via_id: "lower", layers: ["inner1", "bottom"] }),
    makeDrillTrace(),
  ])
  expect(Object.keys(files)).toEqual([
    "drill-L1-L2.drl",
    "drill-L1-L4.drl",
    "drill-L2-L4.drl",
  ])
})

test("different drill diameters remain separate for explicit and route vias", () => {
  const files = exportDrills([
    makeDrillVia(),
    makeDrillVia({ pcb_via_id: "narrow", hole_diameter: 0.4 }),
    makeDrillTrace({ hole_diameter: 0.3 }),
  ])
  const file = files["drill-L1-L4.drl"]
  expect(drillHits(file)).toHaveLength(3)
  expect(
    file
      .filter((command) => command.command_code === "define_tool")
      .map((command) => command.diameter),
  ).toEqual([0.6, 0.4, 0.3])
})

test("different x or y coordinates are not merged", () => {
  const files = exportDrills([
    makeDrillVia(),
    makeDrillVia({ pcb_via_id: "nearby", x: 1.0002 }),
    makeDrillTrace({ y: 2 }),
  ])
  expect(drillHits(files["drill-L1-L4.drl"])).toEqual([
    { command_code: "drill_at", x: 1, y: 1 },
    { command_code: "drill_at", x: 1.0002, y: 1 },
    { command_code: "drill_at", x: 1, y: 2 },
  ])
})

test("legacy explicit via spans also reconcile matching route transitions", () => {
  const files = exportDrills([
    makeDrillVia({ layers: undefined, from_layer: "bottom", to_layer: "top" }),
    makeDrillTrace({ to_layer: "inner1" }),
  ])
  expect(Object.keys(files)).toEqual(["drill-L1-L4.drl"])
  expect(drillHits(files["drill-L1-L4.drl"])).toHaveLength(1)
})

test.each([{ flip_y_axis: false }, { flip_y_axis: true }])(
  "single-span deduplication preserves input and flip_y_axis=$flip_y_axis",
  ({ flip_y_axis }) => {
    const circuitJson = makeDrillCircuit([makeDrillVia(), makeDrillTrace()])
    const original = structuredClone(circuitJson)
    const file = convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
      flip_y_axis,
    })
    expect(drillHits(file)).toEqual([
      { command_code: "drill_at", x: 1, y: flip_y_axis ? -1 : 1 },
    ])
    expect(circuitJson).toEqual(original)
  },
)

test("non-plated holes and plated component holes are not deduplicated as vias", () => {
  const files = exportDrills([
    makeDrillVia(),
    makeDrillVia({ pcb_via_id: "duplicate" }),
    {
      type: "pcb_hole",
      pcb_hole_id: "mounting_hole",
      x: 3,
      y: 1,
      hole_diameter: 0.6,
      hole_shape: "circle",
    } as AnyCircuitElement,
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "component_hole",
      pcb_component_id: "component",
      x: -3,
      y: 1,
      hole_diameter: 0.6,
      outer_diameter: 1.2,
      shape: "circle",
      layers: ["top", "bottom"],
    } as AnyCircuitElement,
  ])
  expect(drillHits(files["drill_npth.drl"])).toEqual([
    { command_code: "drill_at", x: 3, y: 1 },
  ])
  expect(drillHits(files["drill-L1-L4.drl"])).toEqual([
    { command_code: "drill_at", x: 1, y: 1 },
    { command_code: "drill_at", x: -3, y: 1 },
  ])
})

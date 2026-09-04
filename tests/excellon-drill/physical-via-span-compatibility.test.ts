import { expect, test } from "bun:test"
import type { CircuitJson, LayerRef } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import autoViaCircuit from "../gerber/assets/autorouted-inner-layer-vias.json"

test("preserves blind/buried physical spans and legacy endpoint-only inputs", () => {
  for (const [layers, expectedFile, expectedAttribute] of [
    [["inner1", "top"], "drill-L1-L2.drl", "Plated,1,2,PTH"],
    [["inner2", "inner1"], "drill-L2-L3.drl", "Plated,2,3,PTH"],
    [
      ["bottom", "inner2", "inner1", "top"],
      "drill-L1-L4.drl",
      "Plated,1,4,PTH",
    ],
    [undefined, "drill-L1-L4.drl", "Plated,1,4,PTH"],
  ] as const) {
    // Keep the generated positions and drills; vary only physical span metadata.
    const circuitJson = autoViaCircuit.map((element) =>
      element.type === "pcb_via"
        ? {
            ...element,
            layers: layers && ([...layers] as LayerRef[]),
            from_layer: "bottom",
            to_layer: "top",
          }
        : element,
    ) as CircuitJson
    const drills = convertCircuitJsonToExcellonDrillCommandLayers({
      circuitJson,
    })
    expect(Object.keys(drills)).toEqual([expectedFile])
    expect(stringifyExcellonDrill(drills[expectedFile]!)).toContain(
      expectedAttribute,
    )
  }
})

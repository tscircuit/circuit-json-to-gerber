import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import autoViaCircuit from "../gerber/assets/autorouted-inner-layer-vias.json"

test("emits one drill per barrel when routes also carry drill dimensions", () => {
  const generated = autoViaCircuit as CircuitJson
  const circuitJson = generated.map((element) =>
    element.type === "pcb_trace"
      ? {
          ...element,
          route: element.route.map((point) => {
            if (point.route_type !== "via") return point
            const via = generated.find(
              (via) =>
                via.type === "pcb_via" &&
                via.x === point.x &&
                via.y === point.y,
            )
            if (via?.type !== "pcb_via")
              throw new Error("Generated route via has no physical barrel")
            return {
              ...point,
              hole_diameter: via.hole_diameter,
              outer_diameter: via.outer_diameter,
            }
          }),
        }
      : element,
  )
  const via = generated.find((element) => element.type === "pcb_via")!
  circuitJson.push({ ...via, pcb_via_id: `${via.pcb_via_id}_duplicate` })

  const drills = convertCircuitJsonToExcellonDrillCommandLayers({ circuitJson })
  expect(Object.keys(drills)).toEqual(["drill-L1-L4.drl"])
  expect(
    stringifyExcellonDrill(drills["drill-L1-L4.drl"]!).match(/^X.*Y.*$/gm),
  ).toHaveLength(2)

  const routeOnlyDrills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: circuitJson.filter((element) => element.type !== "pcb_via"),
  })
  expect(Object.keys(routeOnlyDrills)).toEqual(["drill-L1-L2.drl"])
  expect(
    stringifyExcellonDrill(routeOnlyDrills["drill-L1-L2.drl"]!).match(
      /^X.*Y.*$/gm,
    ),
  ).toHaveLength(2)
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

test("bottom copper and through drills agree with physical via layers", async () => {
  const transitions: Array<[LayerRef, LayerRef]> = [
    ["top", "inner1"],
    ["inner1", "inner2"],
    ["top", "bottom"],
  ]
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 14,
      height: 6,
      num_layers: 4,
    },
    ...transitions.map(([from_layer, to_layer], index) => ({
      type: "pcb_via",
      pcb_via_id: `via_${index}`,
      x: (index - 1) * 4,
      y: 0,
      hole_diameter: 0.6,
      outer_diameter: 1.4,
      layers: ["bottom", "inner2", "top", "inner1"],
      from_layer,
      to_layer,
    })),
  ] as AnyCircuitElement[]
  const files = convertCircuitJsonToGerberFiles(circuitJson)

  // Overlay the actual bottom copper and through-board Excellon output.
  // Including only the through drill file makes missing bottom holes visible,
  // without relying on a stackup renderer to interpret blind/buried spans.
  await expect({
    B_Cu: files["B_Cu.gbr"],
    Edge_Cuts: files["Edge_Cuts.gbr"],
    "drill-L1-L4.drl": files["drill-L1-L4.drl"],
  }).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "physical-via-layer-precedence-bottom",
    ["B_Cu", "drill-L1-L4.drl"],
    {
      backgroundColor: "#16382d",
      colors: { B_Cu: "#e5b65c", "drill-L1-L4.drl": "#0b1020" },
    },
  )

  expect(Object.keys(files).filter((name) => name.endsWith(".drl"))).toEqual([
    "drill-L1-L4.drl",
  ])
  expect(files["drill-L1-L4.drl"]).toContain("Plated,1,4,PTH")
  expect(files["drill-L1-L4.drl"].match(/^X.*Y.*$/gm)).toHaveLength(3)
})

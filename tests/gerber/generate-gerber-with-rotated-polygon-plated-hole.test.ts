import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const makeCircuitJson = (ccwRotation?: number) =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 12,
      height: 10,
      num_layers: 2,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "polygon_plated_hole",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.9,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      hole_offset_x: 0,
      hole_offset_y: 0,
      x: 0,
      y: 0,
      ...(ccwRotation === undefined ? {} : { ccw_rotation: ccwRotation }),
      layers: ["top", "bottom"],
      is_covered_with_solder_mask: false,
    } as AnyCircuitElement,
  ] as AnyCircuitElement[]

const getCopperRegionExtents = (ccwRotation?: number) => {
  const layers = convertSoupToGerberCommands(makeCircuitJson(ccwRotation))
  const gerberOutput = stringifyGerberCommandLayers(layers)
  const copper = gerberOutput.F_Cu ?? ""
  const regionPoints = [...copper.matchAll(/X(-?\d+)Y(-?\d+)D0[12]\*/g)].map(
    (m) => ({ x: Number(m[1]) / 1e6, y: Number(m[2]) / 1e6 }),
  )
  expect(regionPoints.length).toBeGreaterThan(0)
  const xs = regionPoints.map((p) => p.x)
  const ys = regionPoints.map((p) => p.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

test("polygon pad copper region respects ccw_rotation", () => {
  const unrotated = getCopperRegionExtents()
  // A 6x1 bar exports as 6mm wide, 1mm tall
  expect(unrotated.width).toBeCloseTo(6, 1)
  expect(unrotated.height).toBeCloseTo(1, 1)

  const rotated = getCopperRegionExtents(90)
  // Rotated 90 degrees the same bar must export 1mm wide, 6mm tall
  expect(rotated.width).toBeCloseTo(1, 1)
  expect(rotated.height).toBeCloseTo(6, 1)
})

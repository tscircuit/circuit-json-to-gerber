import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

// 6mm x 1mm bar; rotated 90deg ccw it must become a 1mm x 6mm bar
const bar = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "rotated_polygon_plated_hole",
  shape: "hole_with_polygon_pad",
  hole_shape: "circle",
  hole_diameter: 0.8,
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
  layers: ["top", "bottom"],
  is_covered_with_solder_mask: false,
} as const

const board = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  num_layers: 2,
} as const

// Gerber coordinates are integers in 1e-6 mm (FS LAX46Y46); region vertices are D01/D02 moves
const getRegionExtent = (layer: string) => {
  const xs: number[] = []
  const ys: number[] = []
  for (const match of layer.matchAll(/X(-?\d+)Y(-?\d+)D0[12]\*/g)) {
    xs.push(Number(match[1]) / 1_000_000)
    ys.push(Number(match[2]) / 1_000_000)
  }
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

test("polygon pad plated hole copper follows ccw_rotation", () => {
  const unrotated = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([board, bar] as AnyCircuitElement[]),
  )
  const rotated = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([
      board,
      { ...bar, ccw_rotation: 90 },
    ] as AnyCircuitElement[]),
  )

  const before = getRegionExtent(unrotated.F_Cu)
  const after = getRegionExtent(rotated.F_Cu)

  expect(before.width).toBeCloseTo(6, 3)
  expect(before.height).toBeCloseTo(1, 3)
  expect(after.width).toBeCloseTo(1, 3)
  expect(after.height).toBeCloseTo(6, 3)
})

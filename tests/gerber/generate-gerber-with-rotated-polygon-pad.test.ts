import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const makeCircuitJson = (
  holeProps: Record<string, unknown>,
): AnyCircuitElement[] =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
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
      x: 0,
      y: 0,
      layers: ["top", "bottom"],
      is_covered_with_solder_mask: false,
      ...holeProps,
    } as AnyCircuitElement,
  ] as AnyCircuitElement[]

const getFCu = (circuitJson: AnyCircuitElement[]) =>
  stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson)).F_Cu

test("hole_with_polygon_pad copper region honors ccw_rotation", () => {
  const fCu = getFCu(makeCircuitJson({ ccw_rotation: 90 }))

  // (-3, -0.5) rotated 90° CCW -> (0.5, -3)
  expect(fCu).toContain("X000500000Y-03000000")
  // (3, 0.5) rotated 90° CCW -> (-0.5, 3)
  expect(fCu).toContain("X-00500000Y003000000")
  // unrotated coordinates must not appear
  expect(fCu).not.toContain("X003000000Y000500000")
})

test("hole_with_polygon_pad rotation applies around hole center before translation", () => {
  const fCu = getFCu(makeCircuitJson({ x: 1, y: 2, ccw_rotation: 90 }))

  // (-3, -0.5) rotated 90° CCW -> (0.5, -3), translated by (1, 2) -> (1.5, -1)
  expect(fCu).toContain("X001500000Y-01000000")
  // (3, 0.5) rotated 90° CCW -> (-0.5, 3), translated by (1, 2) -> (0.5, 5)
  expect(fCu).toContain("X000500000Y005000000")
})

test("hole_with_polygon_pad without ccw_rotation is unchanged", () => {
  const fCu = getFCu(makeCircuitJson({}))

  expect(fCu).toContain("X003000000Y000500000")
  expect(fCu).not.toContain("X000500000Y-03000000")
})

import { expect, test } from "bun:test"
import { offsetPolygonOutline } from "../../src/gerber/convert-soup-to-gerber-commands/offsetPolygonOutline"
import { renderStiffenerLayers } from "../../src/gerber/convert-soup-to-gerber-commands/render-stiffener-layers"

test("renderStiffenerLayers skips degenerate stiffeners without creating empty layers and deduplicates closing vertices", () => {
  const emptyLayers = renderStiffenerLayers(
    [
      {
        type: "pcb_stiffener",
        pcb_stiffener_id: "stiff_empty_poly",
        pcb_board_id: "board_1",
        layer: "top",
        material: "polyimide",
        thickness: 0.2,
        shape: "polygon",
        outline: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      } as any,
      {
        type: "pcb_stiffener",
        pcb_stiffener_id: "stiff_zero_rect",
        pcb_board_id: "board_1",
        layer: "bottom",
        material: "fr4",
        thickness: 0.4,
        shape: "rect",
        center: { x: 0, y: 0 },
        width: 0,
        height: 5,
      } as any,
    ],
    {},
  )

  expect(Object.keys(emptyLayers)).toHaveLength(0)

  const validLayers = renderStiffenerLayers(
    [
      {
        type: "pcb_stiffener",
        pcb_stiffener_id: "stiff_closed_poly",
        pcb_board_id: "board_1",
        layer: "top",
        material: "polyimide",
        thickness: 0.2,
        shape: "polygon",
        outline: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 2 },
          { x: 0, y: 2 },
          { x: 0, y: 0 },
        ],
      } as any,
    ],
    {},
  )

  const plotOps = validLayers.F_Stiffener_polyimide.filter(
    (cmd) => cmd.command_code === "D01",
  )
  // 4 sides of the closed rectangle, without a redundant zero-length closing segment
  expect(plotOps).toHaveLength(4)
})

test("offsetPolygonOutline returns empty array when inward offset collapses or inverts the polygon", () => {
  const square = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ]

  expect(offsetPolygonOutline(square, -0.6)).toEqual([])

  const shrunk = offsetPolygonOutline(square, -0.1)
  expect(shrunk).toHaveLength(4)
  expect(shrunk[0]?.x).toBeCloseTo(-0.4, 5)
  expect(shrunk[0]?.y).toBeCloseTo(-0.4, 5)
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getFabRectPoints } from "src/gerber/convert-soup-to-gerber-commands/getFabRectPoints"
import { getSilkscreenShapeStroke } from "src/gerber/convert-soup-to-gerber-commands/getSilkscreenShapeStroke"

test("getSilkscreenShapeStroke rotates pcb_silkscreen_pill by ccw_rotation", () => {
  const unrotated = getSilkscreenShapeStroke({
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill_0",
    pcb_component_id: "comp_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 1,
    layer: "top",
    ccw_rotation: 0,
  } as AnyCircuitElement)

  const rotated90 = getSilkscreenShapeStroke({
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill_90",
    pcb_component_id: "comp_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 1,
    layer: "top",
    ccw_rotation: 90,
  } as AnyCircuitElement)

  expect(unrotated).not.toBeNull()
  expect(rotated90).not.toBeNull()

  const maxUnrotatedX = Math.max(...unrotated!.route.map((p) => Math.abs(p.x)))
  const maxUnrotatedY = Math.max(...unrotated!.route.map((p) => Math.abs(p.y)))
  expect(maxUnrotatedX).toBeCloseTo(2, 5)
  expect(maxUnrotatedY).toBeCloseTo(0.5, 5)

  const maxRotatedX = Math.max(...rotated90!.route.map((p) => Math.abs(p.x)))
  const maxRotatedY = Math.max(...rotated90!.route.map((p) => Math.abs(p.y)))
  expect(maxRotatedX).toBeCloseTo(0.5, 5)
  expect(maxRotatedY).toBeCloseTo(2, 5)
})

test("getFabRectPoints preserves corner_radius and ccw_rotation on pcb_fabrication_note_rect", () => {
  const sharp = getFabRectPoints({
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "fab_sharp",
    pcb_component_id: "comp_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    layer: "top",
    stroke_width: 0.1,
  })
  expect(sharp).toHaveLength(4)

  const rounded = getFabRectPoints({
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "fab_round",
    pcb_component_id: "comp_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    corner_radius: 0.5,
    layer: "top",
    stroke_width: 0.1,
  })
  expect(rounded.length).toBeGreaterThan(4)
  // No rounded corner point should reach the sharp corner (2, 1)
  for (const pt of rounded) {
    expect(Math.hypot(Math.abs(pt.x) - 2, Math.abs(pt.y) - 1)).toBeGreaterThan(
      0.1,
    )
  }

  const rotated = getFabRectPoints({
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "fab_rot",
    pcb_component_id: "comp_0",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    layer: "top",
    stroke_width: 0.1,
    ccw_rotation: 90,
  } as any)
  expect(rotated).toHaveLength(4)
  const maxX = Math.max(...rotated.map((p) => Math.abs(p.x)))
  const maxY = Math.max(...rotated.map((p) => Math.abs(p.y)))
  expect(maxX).toBeCloseTo(1, 5)
  expect(maxY).toBeCloseTo(2, 5)
})

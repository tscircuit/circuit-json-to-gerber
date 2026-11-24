import { test, expect } from "bun:test"
import type { AnyCircuitElement, PcbFabricationNoteRect } from "circuit-json"
import { getFabRectPoints } from "src/gerber/convert-soup-to-gerber-commands/getFabRectPoints"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const fabNoteRect: PcbFabricationNoteRect = {
  type: "pcb_fabrication_note_rect",
  pcb_fabrication_note_rect_id: "fab_rect_0",
  pcb_component_id: "comp_0",
  center: { x: 10, y: 20 },
  width: 4,
  height: 2,
  layer: "top",
  stroke_width: 0.1,
  corner_radius: 0.5,
  is_filled: true,
  has_stroke: false,
}

test("getFabRectPoints keeps corner_radius on the outline", () => {
  const points = getFabRectPoints(fabNoteRect)

  // A rounded rectangle needs more than the four sharp corners.
  expect(points.length).toBeGreaterThan(4)

  // No vertex may sit exactly on a sharp corner of the bounds.
  const sharpCorners = [
    { x: 8, y: 19 },
    { x: 12, y: 19 },
    { x: 12, y: 21 },
    { x: 8, y: 21 },
  ]
  for (const corner of sharpCorners) {
    expect(
      points.some(
        (point) =>
          Math.abs(point.x - corner.x) < 1e-9 &&
          Math.abs(point.y - corner.y) < 1e-9,
      ),
    ).toBe(false)
  }

  // Every emitted point stays on or inside the rectangle bounds.
  for (const point of points) {
    expect(point.x).toBeGreaterThanOrEqual(8 - 1e-9)
    expect(point.x).toBeLessThanOrEqual(12 + 1e-9)
    expect(point.y).toBeGreaterThanOrEqual(19 - 1e-9)
    expect(point.y).toBeLessThanOrEqual(21 + 1e-9)
  }
})

test("getFabRectPoints clamps corner_radius larger than half the height", () => {
  const points = getFabRectPoints({
    ...fabNoteRect,
    corner_radius: 99,
  })

  for (const point of points) {
    expect(point.x).toBeGreaterThanOrEqual(8 - 1e-9)
    expect(point.x).toBeLessThanOrEqual(12 + 1e-9)
    expect(point.y).toBeGreaterThanOrEqual(19 - 1e-9)
    expect(point.y).toBeLessThanOrEqual(21 + 1e-9)
  }
})

test("F_Fab region for a rounded fabrication note rect emits the rounded outline", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    } as AnyCircuitElement,
    fabNoteRect as AnyCircuitElement,
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  const regionBody = gerberOutput.F_Fab.split("G36*")[1]?.split("G37*")[0] ?? ""
  const sharpCorner = "X008000000Y019000000D01*"
  expect(regionBody).not.toContain(sharpCorner)
})

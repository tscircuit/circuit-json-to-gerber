import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbSilkscreenText,
} from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

const anchorAlignments = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const

interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const ANCHOR = { x: 3, y: -2 }

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 40,
  height: 40,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

/** Bounds (board frame, mm, +Y up) of the text ink on its silkscreen layer */
const getTextInkBounds = (
  anchorAlignment: (typeof anchorAlignments)[number],
  {
    layer = "top",
    ccwRotation = 0,
  }: { layer?: LayerRef; ccwRotation?: number },
): Bounds => {
  const text: PcbSilkscreenText = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "text",
    pcb_component_id: "",
    font: "tscircuit2024",
    font_size: 1,
    text: "TEXT",
    layer,
    anchor_position: ANCHOR,
    anchor_alignment: anchorAlignment,
    ccw_rotation: ccwRotation,
  }
  const gerberLayers = convertSoupToGerberCommands([board, text])
  const points = gerberLayers[layer === "top" ? "F_SilkScreen" : "B_SilkScreen"]
    .filter(
      (command) =>
        command.command_code === "D01" || command.command_code === "D02",
    )
    .map((command) => command as unknown as { x: number; y: number })
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

/** Bounds rotated by a quarter-turn multiple CCW about ANCHOR */
const rotateBoundsAboutAnchor = (bounds: Bounds, ccwDegrees: number) => {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
  ].map(({ x, y }) => {
    const radians = (ccwDegrees * Math.PI) / 180
    const dx = x - ANCHOR.x
    const dy = y - ANCHOR.y
    return {
      x: ANCHOR.x + dx * Math.cos(radians) - dy * Math.sin(radians),
      y: ANCHOR.y + dx * Math.sin(radians) + dy * Math.cos(radians),
    }
  })
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  }
}

const mirrorBoundsAboutAnchor = (bounds: Bounds): Bounds => ({
  minX: 2 * ANCHOR.x - bounds.maxX,
  maxX: 2 * ANCHOR.x - bounds.minX,
  minY: bounds.minY,
  maxY: bounds.maxY,
})

const expectBoundsToBeClose = (actual: Bounds, expected: Bounds) => {
  expect(actual.minX).toBeCloseTo(expected.minX, 6)
  expect(actual.maxX).toBeCloseTo(expected.maxX, 6)
  expect(actual.minY).toBeCloseTo(expected.minY, 6)
  expect(actual.maxY).toBeCloseTo(expected.maxY, 6)
}

test("rotated silkscreen text turns about its anchor", () => {
  for (const anchorAlignment of anchorAlignments) {
    const unrotated = getTextInkBounds(anchorAlignment, {})
    for (const ccwRotation of [90, 180, 270]) {
      expectBoundsToBeClose(
        getTextInkBounds(anchorAlignment, { ccwRotation }),
        rotateBoundsAboutAnchor(unrotated, ccwRotation),
      )
    }
  }
})

test("bottom-layer silkscreen text is mirrored about its anchor", () => {
  for (const anchorAlignment of anchorAlignments) {
    const top = getTextInkBounds(anchorAlignment, {})
    expectBoundsToBeClose(
      getTextInkBounds(anchorAlignment, { layer: "bottom" }),
      mirrorBoundsAboutAnchor(top),
    )
    // Mirrored text is then rotated CCW about the same anchor
    // (circuit-to-svg: translate(anchor) * rotate * scale(-1, 1)).
    expectBoundsToBeClose(
      getTextInkBounds(anchorAlignment, { layer: "bottom", ccwRotation: 90 }),
      rotateBoundsAboutAnchor(mirrorBoundsAboutAnchor(top), 90),
    )
  }
})

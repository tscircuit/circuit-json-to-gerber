import type { AnyCircuitElement } from "circuit-json"
import {
  applyToPoint,
  compose,
  identity,
  type Matrix,
  rotate,
  translate,
} from "transformation-matrix"
import { getBoundFromCenteredRect } from "@tscircuit/math-utils"

type Point = { x: number; y: number }

/** Silkscreen shape elements that are drawn as a stroked outline. */
const SILKSCREEN_SHAPE_TYPES = [
  "pcb_silkscreen_line",
  "pcb_silkscreen_rect",
  "pcb_silkscreen_circle",
  "pcb_silkscreen_oval",
  "pcb_silkscreen_pill",
] as const

type SilkscreenShapeElement = Extract<
  AnyCircuitElement,
  { type: (typeof SILKSCREEN_SHAPE_TYPES)[number] }
>

export const isSilkscreenShape = (
  element: AnyCircuitElement,
): element is SilkscreenShapeElement =>
  (SILKSCREEN_SHAPE_TYPES as readonly string[]).includes(element.type)

const DEFAULT_STROKE_WIDTH = 0.1
const ELLIPSE_SEGMENTS = 48
const CORNER_SEGMENTS = 12

/** A matrix that rotates `ccwDegrees` about `center` (identity when 0). */
const rotationAboutCenter = (center: Point, ccwDegrees: number): Matrix =>
  ccwDegrees
    ? compose(
        translate(center.x, center.y),
        rotate((ccwDegrees * Math.PI) / 180),
        translate(-center.x, -center.y),
      )
    : identity()

/** A closed elliptical outline, optionally rotated about its center. */
const ellipseRoute = (
  center: Point,
  radiusX: number,
  radiusY: number,
  ccwDegrees = 0,
): Point[] => {
  const matrix = rotationAboutCenter(center, ccwDegrees)
  return Array.from({ length: ELLIPSE_SEGMENTS + 1 }, (_, i) => {
    const angle = (i / ELLIPSE_SEGMENTS) * Math.PI * 2
    return applyToPoint(matrix, {
      x: center.x + radiusX * Math.cos(angle),
      y: center.y + radiusY * Math.sin(angle),
    })
  })
}

/**
 * A closed rectangle outline: sharp corners when cornerRadius <= 0, otherwise
 * rounded (a pill when the radius fills the shorter side). Optionally rotated
 * about its center.
 */
const rectangleRoute = (
  center: Point,
  width: number,
  height: number,
  cornerRadius: number,
  ccwDegrees = 0,
): Point[] => {
  const halfW = width / 2
  const halfH = height / 2
  const route: Point[] = []

  if (cornerRadius <= 0) {
    const bounds = getBoundFromCenteredRect({ center, width, height })
    route.push(
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    )
  } else {
    const insetW = halfW - cornerRadius
    const insetH = halfH - cornerRadius
    // One quarter-circle per corner, walked counter-clockwise from the +x side.
    const corners = [
      { x: center.x + insetW, y: center.y + insetH, start: 0 },
      { x: center.x - insetW, y: center.y + insetH, start: Math.PI / 2 },
      { x: center.x - insetW, y: center.y - insetH, start: Math.PI },
      { x: center.x + insetW, y: center.y - insetH, start: (3 * Math.PI) / 2 },
    ]
    for (const corner of corners) {
      for (let i = 0; i <= CORNER_SEGMENTS; i++) {
        const angle = corner.start + (i / CORNER_SEGMENTS) * (Math.PI / 2)
        route.push({
          x: corner.x + cornerRadius * Math.cos(angle),
          y: corner.y + cornerRadius * Math.sin(angle),
        })
      }
    }
  }

  route.push(route[0]!) // close the loop
  const matrix = rotationAboutCenter(center, ccwDegrees)
  return route.map((point) => applyToPoint(matrix, point))
}

/** Corner radius clamped to fit the rectangle, or 0 when unset/non-positive. */
const clampCornerRadius = (
  width: number,
  height: number,
  cornerRadius: unknown,
): number => {
  if (typeof cornerRadius !== "number" || cornerRadius <= 0) return 0
  return Math.min(cornerRadius, width / 2, height / 2)
}

/**
 * Convert a silkscreen shape element into a stroked outline (a route plus a
 * stroke width), so it can be rendered with the same open-path machinery used
 * for pcb_silkscreen_path. Returns null for anything that isn't a shape.
 */
export const getSilkscreenShapeStroke = (
  element: AnyCircuitElement,
): { route: Point[]; strokeWidth: number } | null => {
  const strokeWidth = (element as any).stroke_width ?? DEFAULT_STROKE_WIDTH

  switch (element.type) {
    case "pcb_silkscreen_line":
      return {
        route: [
          { x: element.x1, y: element.y1 },
          { x: element.x2, y: element.y2 },
        ],
        strokeWidth,
      }
    case "pcb_silkscreen_rect":
      return {
        route: rectangleRoute(
          element.center,
          element.width,
          element.height,
          clampCornerRadius(
            element.width,
            element.height,
            (element as any).corner_radius,
          ),
          element.ccw_rotation ?? 0,
        ),
        strokeWidth,
      }
    case "pcb_silkscreen_circle":
      return {
        route: ellipseRoute(element.center, element.radius, element.radius),
        strokeWidth,
      }
    case "pcb_silkscreen_oval":
      return {
        route: ellipseRoute(
          element.center,
          element.radius_x,
          element.radius_y,
          element.ccw_rotation ?? 0,
        ),
        strokeWidth,
      }
    case "pcb_silkscreen_pill":
      // A pill is a rectangle whose corner radius fills the shorter side. The
      // renderer does not rotate pills, so neither do we.
      return {
        route: rectangleRoute(
          element.center,
          element.width,
          element.height,
          Math.min(element.width, element.height) / 2,
        ),
        strokeWidth,
      }
    default:
      return null
  }
}

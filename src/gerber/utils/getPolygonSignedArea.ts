import type { Point } from "circuit-json"

/**
 * Computes the signed shoelace area of a 2D polygon in its coordinate space.
 * Positive values indicate counter-clockwise (CCW) winding; negative values
 * indicate clockwise (CW) winding.
 */
export const getPolygonSignedArea = (points: Point[]): number => {
  if (points.length < 3) return 0

  let twiceArea = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    twiceArea += current.x * next.y - next.x * current.y
  }

  return twiceArea / 2
}

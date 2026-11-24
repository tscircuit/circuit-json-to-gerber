import type { PcbFabricationNoteRect } from "circuit-json"
import { getBoundFromCenteredRect } from "@tscircuit/math-utils"

// Number of segments used to approximate each rounded corner arc.
const cornerArcSegmentCount = 8

export const getFabRectPoints = (element: PcbFabricationNoteRect) => {
  const bounds = getBoundFromCenteredRect({
    center: element.center,
    width: element.width,
    height: element.height,
  })

  const cornerRadius = Math.max(
    0,
    Math.min(
      element.corner_radius ?? 0,
      Math.abs(element.width / 2),
      Math.abs(element.height / 2),
    ),
  )

  if (cornerRadius === 0) {
    return [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    ]
  }

  // Rounded rect: walk the same counterclockwise perimeter as the sharp
  // rect, replacing each corner with a short arc approximation so both the
  // filled region and the stroke keep the requested radius.
  const { minX, minY, maxX, maxY } = bounds
  const r = cornerRadius
  const corners = [
    {
      center: { x: minX + r, y: minY + r },
      start: Math.PI,
      end: Math.PI * 1.5,
    },
    { center: { x: maxX - r, y: minY + r }, start: -Math.PI / 2, end: 0 },
    { center: { x: maxX - r, y: maxY - r }, start: 0, end: Math.PI / 2 },
    { center: { x: minX + r, y: maxY - r }, start: Math.PI / 2, end: Math.PI },
  ]

  const points: Array<{ x: number; y: number }> = []
  for (const corner of corners) {
    for (let i = 0; i <= cornerArcSegmentCount; i++) {
      const t = i / cornerArcSegmentCount
      const angle = corner.start + (corner.end - corner.start) * t
      points.push({
        x: corner.center.x + r * Math.cos(angle),
        y: corner.center.y + r * Math.sin(angle),
      })
    }
  }

  return points
}

import type { PcbFabricationNoteRect } from "circuit-json"
import { clampCornerRadius, rectangleRoute } from "./getSilkscreenShapeStroke"

export const getFabRectPoints = (element: PcbFabricationNoteRect) => {
  const closedRoute = rectangleRoute(
    element.center,
    element.width,
    element.height,
    clampCornerRadius(element.width, element.height, element.corner_radius),
    (element as { ccw_rotation?: number }).ccw_rotation ?? 0,
  )

  return closedRoute.slice(0, -1)
}

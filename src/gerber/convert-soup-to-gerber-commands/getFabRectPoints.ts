import type { PcbFabricationNoteRect } from "circuit-json"
import { getBoundFromCenteredRect } from "@tscircuit/math-utils"

export const getFabRectPoints = (element: PcbFabricationNoteRect) => {
  const bounds = getBoundFromCenteredRect({
    center: element.center,
    width: element.width,
    height: element.height,
  })

  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

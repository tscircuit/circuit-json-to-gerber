import type { PcbFabricationNoteRect } from "circuit-json"

export const getFabRectPoints = (element: PcbFabricationNoteRect) => {
  const halfWidth = element.width / 2
  const halfHeight = element.height / 2
  const { x, y } = element.center

  return [
    { x: x - halfWidth, y: y - halfHeight },
    { x: x + halfWidth, y: y - halfHeight },
    { x: x + halfWidth, y: y + halfHeight },
    { x: x - halfWidth, y: y + halfHeight },
  ]
}

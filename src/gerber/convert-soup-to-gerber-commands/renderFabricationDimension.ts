import type { PcbFabricationNoteDimension } from "circuit-json"
import type { AnyGerberCommand } from "../any_gerber_command"
import { getApertureConfigFromPcbFabricationNoteDimension } from "./defineAperturesForLayer"
import { renderOpenPath } from "./renderOpenPath"

type DimensionTextElement = PcbFabricationNoteDimension & {
  anchor_position: { x: number; y: number }
  anchor_alignment: "center"
  ccw_rotation: number
}

export const renderFabricationDimension = ({
  element,
  glayer,
  mapY,
  renderText,
}: {
  element: PcbFabricationNoteDimension
  glayer: AnyGerberCommand[]
  mapY: (y: number) => number
  renderText: (element: DimensionTextElement) => void
}) => {
  const from = element.from
  const to = element.to
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length <= 1e-9) return

  const offsetDistance = element.offset_distance ?? element.offset ?? 0
  const defaultOffsetDirection = { x: -dy / length, y: dx / length }
  const offsetDirection = element.offset_direction ?? defaultOffsetDirection
  const offsetMagnitude = Math.hypot(offsetDirection.x, offsetDirection.y) || 1
  const offsetVector = {
    x: (offsetDirection.x / offsetMagnitude) * offsetDistance,
    y: (offsetDirection.y / offsetMagnitude) * offsetDistance,
  }
  const dimStart = { x: from.x + offsetVector.x, y: from.y + offsetVector.y }
  const dimEnd = { x: to.x + offsetVector.x, y: to.y + offsetVector.y }
  const arrowSize = element.arrow_size ?? 1
  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const arrowHalfWidth = arrowSize * 0.35

  const lineConfig = getApertureConfigFromPcbFabricationNoteDimension(element)
  renderOpenPath({
    element,
    glayer,
    apertureConfig: lineConfig,
    route: [from, dimStart, dimEnd, to],
    mapY,
  })

  renderOpenPath({
    element,
    glayer,
    apertureConfig: lineConfig,
    route: [
      {
        x: dimStart.x + ux * arrowSize + px * arrowHalfWidth,
        y: dimStart.y + uy * arrowSize + py * arrowHalfWidth,
      },
      dimStart,
      {
        x: dimStart.x + ux * arrowSize - px * arrowHalfWidth,
        y: dimStart.y + uy * arrowSize - py * arrowHalfWidth,
      },
    ],
    mapY,
  })

  renderOpenPath({
    element,
    glayer,
    apertureConfig: lineConfig,
    route: [
      {
        x: dimEnd.x - ux * arrowSize + px * arrowHalfWidth,
        y: dimEnd.y - uy * arrowSize + py * arrowHalfWidth,
      },
      dimEnd,
      {
        x: dimEnd.x - ux * arrowSize - px * arrowHalfWidth,
        y: dimEnd.y - uy * arrowSize - py * arrowHalfWidth,
      },
    ],
    mapY,
  })

  if (element.text) {
    renderText({
      ...element,
      anchor_position: {
        x: (dimStart.x + dimEnd.x) / 2,
        y: (dimStart.y + dimEnd.y) / 2,
      },
      anchor_alignment: "center",
      ccw_rotation:
        element.text_ccw_rotation ?? (Math.atan2(dy, dx) * 180) / Math.PI,
    })
  }
}

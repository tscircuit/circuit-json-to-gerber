import type { AnyGerberCommand } from "../any_gerber_command"
import type { ApertureTemplateConfig } from "../commands/define_aperture_template"
import { gerberBuilder } from "../gerber-builder"
import { pairs } from "../utils/pairs"
import { findApertureNumber } from "./findApertureNumber"

type Point = { x: number; y: number }

type OpenPathStroke = {
  type: string
  is_stroke_dashed?: boolean
  stroke_width?: number
}

export const renderOpenPath = ({
  element,
  glayer,
  apertureConfig,
  route,
  mapY,
}: {
  element: OpenPathStroke
  glayer: AnyGerberCommand[]
  apertureConfig: ApertureTemplateConfig
  route: Point[]
  mapY: (y: number) => number
}) => {
  if (route.length === 0) return
  const gerber = gerberBuilder().add("select_aperture", {
    aperture_number: findApertureNumber(glayer, apertureConfig),
  })

  gerber.add("move_operation", {
    x: route[0].x,
    y: mapY(route[0].y),
  })

  const isDashed = element.is_stroke_dashed === true
  if (!isDashed) {
    for (let i = 1; i < route.length; i++) {
      gerber.add("plot_operation", {
        x: route[i].x,
        y: mapY(route[i].y),
      })
    }
    glayer.push(...gerber.build())
    return
  }

  const dashLength = Math.max(0.2, (element.stroke_width ?? 0.1) * 4)
  let isDrawingDash = true
  let remainingPatternLength = dashLength
  for (const [start, end] of pairs(route)) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length <= 1e-9) continue

    const ux = dx / length
    const uy = dy / length
    let distance = 0
    while (distance < length) {
      const stepLength = Math.min(remainingPatternLength, length - distance)
      const stepEndDistance = distance + stepLength
      if (isDrawingDash) {
        gerber.add("move_operation", {
          x: start.x + ux * distance,
          y: mapY(start.y + uy * distance),
        })
        gerber.add("plot_operation", {
          x: start.x + ux * stepEndDistance,
          y: mapY(start.y + uy * stepEndDistance),
        })
      }
      if (stepLength === remainingPatternLength) {
        isDrawingDash = !isDrawingDash
        remainingPatternLength = dashLength
      } else {
        remainingPatternLength -= stepLength
      }
      distance = stepEndDistance
    }
  }

  glayer.push(...gerber.build())
}

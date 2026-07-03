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
  const gapLength = dashLength
  for (const [start, end] of pairs(route)) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length <= 1e-9) continue

    const ux = dx / length
    const uy = dy / length
    let distance = 0
    while (distance < length) {
      const dashEndDistance = Math.min(distance + dashLength, length)
      const dashStart = {
        x: start.x + ux * distance,
        y: start.y + uy * distance,
      }
      const dashEnd = {
        x: start.x + ux * dashEndDistance,
        y: start.y + uy * dashEndDistance,
      }
      gerber.add("move_operation", {
        x: dashStart.x,
        y: mapY(dashStart.y),
      })
      gerber.add("plot_operation", {
        x: dashEnd.x,
        y: mapY(dashEnd.y),
      })
      distance += dashLength + gapLength
    }
  }

  glayer.push(...gerber.build())
}

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
  const cleanRoute: Point[] = []
  for (const point of route) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue
    }
    const prev = cleanRoute[cleanRoute.length - 1]
    if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) <= 1e-9) {
      continue
    }
    cleanRoute.push(point)
  }

  if (cleanRoute.length < 2) return
  const gerber = gerberBuilder().add("select_aperture", {
    aperture_number: findApertureNumber(glayer, apertureConfig),
  })

  gerber.add("move_operation", {
    x: cleanRoute[0].x,
    y: mapY(cleanRoute[0].y),
  })

  const isDashed = element.is_stroke_dashed === true
  if (!isDashed) {
    for (let i = 1; i < cleanRoute.length; i++) {
      gerber.add("plot_operation", {
        x: cleanRoute[i].x,
        y: mapY(cleanRoute[i].y),
      })
    }
    glayer.push(...gerber.build())
    return
  }

  const strokeWidth =
    typeof element.stroke_width === "number" &&
    Number.isFinite(element.stroke_width) &&
    element.stroke_width > 0
      ? element.stroke_width
      : 0.1
  const dashLength = Math.max(0.2, strokeWidth * 4)
  const gapLength = dashLength
  for (const [start, end] of pairs(cleanRoute)) {
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

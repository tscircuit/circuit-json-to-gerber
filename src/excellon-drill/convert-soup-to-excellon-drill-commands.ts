import type { AnyCircuitElement } from "circuit-json"
import type { AnyExcellonDrillCommand } from "./any-excellon-drill-command-map"
import { excellonDrill } from "./excellon-drill-builder"

const getHoleOffsets = (element: AnyCircuitElement) => {
  const offset_x =
    "hole_offset_x" in element && typeof element.hole_offset_x === "number"
      ? element.hole_offset_x
      : 0
  const offset_y =
    "hole_offset_y" in element && typeof element.hole_offset_y === "number"
      ? element.hole_offset_y
      : 0
  return { x: offset_x, y: offset_y }
}

const getHoleCenter = (element: AnyCircuitElement) => {
  const { x: offset_x, y: offset_y } = getHoleOffsets(element)
  const { x, y } = element as { x: number; y: number }
  return { x: x + offset_x, y: y + offset_y }
}

const getPillHoleDimensions = (element: AnyCircuitElement) => {
  if (
    "hole_width" in element &&
    "hole_height" in element &&
    typeof element.hole_width === "number" &&
    typeof element.hole_height === "number"
  ) {
    return {
      width: element.hole_width,
      height: element.hole_height,
    }
  }
  return undefined
}

const getPillHoleRotation = (element: AnyCircuitElement) => {
  if (
    "hole_ccw_rotation" in element &&
    typeof element.hole_ccw_rotation === "number"
  ) {
    return element.hole_ccw_rotation
  }
  if ("ccw_rotation" in element && typeof element.ccw_rotation === "number") {
    return element.ccw_rotation
  }
  return 0
}

export const convertSoupToExcellonDrillCommands = ({
  circuitJson,
  is_plated,
  flip_y_axis = false,
}: {
  circuitJson: Array<AnyCircuitElement>
  is_plated: boolean
  flip_y_axis?: boolean
}): Array<AnyExcellonDrillCommand> => {
  const builder = excellonDrill()

  // Start sequence commands
  builder.add("M48", {})

  // Add header comments
  const date_str = new Date().toISOString()
  builder
    .add("header_comment", {
      text: `DRILL file {tscircuit} date ${date_str}`,
    })
    .add("header_comment", {
      text: "FORMAT={-:-/ absolute / metric / decimal}",
    })
    .add("header_attribute", {
      attribute_name: "TF.CreationDate",
      attribute_value: date_str,
    })
    .add("header_attribute", {
      attribute_name: "TF.GenerationSoftware",
      attribute_value: "tscircuit",
    })
    .add("header_attribute", {
      attribute_name: "TF.FileFunction",
      attribute_value: "Plated,1,2,PTH",
    })
    .add("FMAT", { format: 2 }) // Assuming format 2 for the example
    .add("unit_format", { unit: "METRIC", lz: null })

  let tool_counter = 10 // Start tool numbering from 10 for example

  const diameterToToolNumber: Record<number, number> = {}

  // Define tools
  for (const element of circuitJson) {
    if (
      element.type === "pcb_plated_hole" ||
      element.type === "pcb_hole" ||
      element.type === "pcb_via"
    ) {
      let hole_diameter: number | undefined
      const pillDimensions =
        element.type === "pcb_plated_hole"
          ? getPillHoleDimensions(element)
          : undefined

      if (
        "hole_diameter" in element &&
        typeof element.hole_diameter === "number"
      ) {
        hole_diameter = element.hole_diameter
      } else if (pillDimensions) {
        // For pill shapes, use the minimum dimension as the hole diameter
        hole_diameter = Math.min(pillDimensions.width, pillDimensions.height)
      }

      if (!hole_diameter) continue

      if (!diameterToToolNumber[hole_diameter]) {
        builder.add("aper_function_header", {
          is_plated: true,
        })
        builder.add("define_tool", {
          tool_number: tool_counter,
          diameter: hole_diameter,
        })
        diameterToToolNumber[hole_diameter] = tool_counter
        tool_counter++
      }
    }
  }

  builder.add("percent_sign", {})
  builder.add("G90", {})
  builder.add("G05", {})

  // Execute drills for tool N
  for (let i = 10; i < tool_counter; i++) {
    builder.add("use_tool", { tool_number: i })
    for (const element of circuitJson) {
      if (
        element.type === "pcb_plated_hole" ||
        element.type === "pcb_hole" ||
        element.type === "pcb_via"
      ) {
        if (
          !is_plated &&
          (element.type === "pcb_plated_hole" || element.type === "pcb_via")
        )
          continue
        let hole_diameter: number | undefined

        if (
          "hole_diameter" in element &&
          typeof element.hole_diameter === "number"
        ) {
          hole_diameter = element.hole_diameter
        }

        const pillDimensions =
          element.type === "pcb_plated_hole"
            ? getPillHoleDimensions(element)
            : undefined

        if (pillDimensions) {
          hole_diameter = Math.min(pillDimensions.width, pillDimensions.height)

          if (hole_diameter && diameterToToolNumber[hole_diameter] === i) {
            const y_multiplier = flip_y_axis ? -1 : 1
            const { x: centerX, y: centerY } = getHoleCenter(element)
            const maxDim = Math.max(pillDimensions.width, pillDimensions.height)
            const minDim = Math.min(pillDimensions.width, pillDimensions.height)
            const offset = (maxDim - minDim) / 2

            if (offset <= 0) {
              builder.add("drill_at", {
                x: centerX,
                y: centerY * y_multiplier,
              })
            } else {
              const rotationRadians =
                (getPillHoleRotation(element) * Math.PI) / 180
              const cosTheta = Math.cos(rotationRadians)
              const sinTheta = Math.sin(rotationRadians)

              const rotate = (dx: number, dy: number) => ({
                x: dx * cosTheta - dy * sinTheta,
                y: dx * sinTheta + dy * cosTheta,
              })

              const isHorizontal = pillDimensions.width >= pillDimensions.height
              const startRelative = isHorizontal
                ? { x: -offset, y: 0 }
                : { x: 0, y: -offset }
              const endRelative = isHorizontal
                ? { x: offset, y: 0 }
                : { x: 0, y: offset }

              const startPoint = rotate(startRelative.x, startRelative.y)
              const endPoint = rotate(endRelative.x, endRelative.y)

              builder
                .add("G00", {})
                .add("drill_at", {
                  x: centerX + startPoint.x,
                  y: (centerY + startPoint.y) * y_multiplier,
                })
                .add("M15", {})
                .add("G01", {})
                .add("drill_at", {
                  x: centerX + endPoint.x,
                  y: (centerY + endPoint.y) * y_multiplier,
                })
                .add("M16", {})
                .add("G05", {})
            }
          }
        } else if (!hole_diameter) continue
        else if (diameterToToolNumber[hole_diameter] === i) {
          const { x, y } = getHoleCenter(element)
          builder.add("drill_at", {
            x,
            y: y * (flip_y_axis ? -1 : 1),
          })
        }
      }
    }
  }

  builder.add("M30", {})

  return builder.build()
}

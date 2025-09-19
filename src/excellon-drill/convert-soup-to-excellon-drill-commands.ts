import type { AnyCircuitElement } from "circuit-json"
import type { AnyExcellonDrillCommand } from "./any-excellon-drill-command-map"
import { excellonDrill } from "./excellon-drill-builder"

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
      attribute_value: is_plated ? "Plated,1,2,PTH" : "NonPlated,1,2,NPTH",
    })
    .add("FMAT", { format: 2 }) // Assuming format 2 for the example
    .add("unit_format", { unit: "METRIC", lz: null })

  let tool_counter = 10 // Start tool numbering from 10 for example

  const diameterToToolNumber: Record<number, number> = {}

  // Define tools
  for (const element of circuitJson) {
    if (
      element.type !== "pcb_plated_hole" &&
      element.type !== "pcb_hole" &&
      element.type !== "pcb_via"
    ) {
      continue
    }

    if (
      !is_plated &&
      (element.type === "pcb_plated_hole" || element.type === "pcb_via")
    ) {
      continue
    }

    const holeDiameter =
      "hole_diameter" in element && typeof element.hole_diameter === "number"
        ? element.hole_diameter
        : "hole_width" in element &&
            typeof element.hole_width === "number" &&
            "hole_height" in element &&
            typeof element.hole_height === "number"
          ? Math.min(element.hole_width, element.hole_height)
          : undefined

    if (!holeDiameter) continue

    if (!diameterToToolNumber[holeDiameter]) {
      builder.add("aper_function_header", {
        is_plated,
      })
      builder.add("define_tool", {
        tool_number: tool_counter,
        diameter: holeDiameter,
      })
      diameterToToolNumber[holeDiameter] = tool_counter
      tool_counter++
    }
  }

  builder.add("percent_sign", {})
  builder.add("G90", {})
  builder.add("G05", {})

  // --------------------
  // Execute drills/slots
  // --------------------
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
        ) {
          continue
        }

        const holeDiameter =
          "hole_diameter" in element &&
          typeof element.hole_diameter === "number"
            ? element.hole_diameter
            : "hole_width" in element &&
                typeof element.hole_width === "number" &&
                "hole_height" in element &&
                typeof element.hole_height === "number"
              ? Math.min(element.hole_width, element.hole_height)
              : undefined

        if (!holeDiameter || diameterToToolNumber[holeDiameter] !== i) {
          continue
        }

        const elementX =
          "x" in element && typeof element.x === "number" ? element.x : 0
        const elementY =
          "y" in element && typeof element.y === "number" ? element.y : 0
        const offsetX =
          "hole_offset_x" in element &&
          typeof element.hole_offset_x === "number"
            ? element.hole_offset_x
            : 0
        const offsetY =
          "hole_offset_y" in element &&
          typeof element.hole_offset_y === "number"
            ? element.hole_offset_y
            : 0
        const centerX = elementX + offsetX
        const centerY = elementY + offsetY
        const yMultiplier = flip_y_axis ? -1 : 1

        if (
          "hole_width" in element &&
          typeof element.hole_width === "number" &&
          "hole_height" in element &&
          typeof element.hole_height === "number"
        ) {
          const holeWidth = element.hole_width
          const holeHeight = element.hole_height
          const maxDim = Math.max(holeWidth, holeHeight)
          const minDim = Math.min(holeWidth, holeHeight)

          if (Math.abs(maxDim - minDim) <= 1e-6) {
            builder.add("drill_at", {
              x: centerX,
              y: centerY * yMultiplier,
            })
            continue
          }

          const rotationDegrees =
            "hole_ccw_rotation" in element &&
            typeof element.hole_ccw_rotation === "number"
              ? element.hole_ccw_rotation
              : "ccw_rotation" in element &&
                  typeof element.ccw_rotation === "number"
                ? element.ccw_rotation
                : 0
          const rotationRadians = (rotationDegrees * Math.PI) / 180
          const cosTheta = Math.cos(rotationRadians)
          const sinTheta = Math.sin(rotationRadians)

          const isWidthMajor = holeWidth >= holeHeight
          const slotHalfLength = (maxDim - minDim) / 2
          const startRelative = isWidthMajor
            ? { x: -slotHalfLength, y: 0 }
            : { x: 0, y: -slotHalfLength }
          const endRelative = isWidthMajor
            ? { x: slotHalfLength, y: 0 }
            : { x: 0, y: slotHalfLength }

          const rotatePoint = ({ x, y }: { x: number; y: number }) => ({
            x: x * cosTheta - y * sinTheta,
            y: x * sinTheta + y * cosTheta,
          })

          const startPoint = rotatePoint(startRelative)
          const endPoint = rotatePoint(endRelative)

          const startX = centerX + startPoint.x
          const startY = (centerY + startPoint.y) * yMultiplier
          const endX = centerX + endPoint.x
          const endY = (centerY + endPoint.y) * yMultiplier

          builder
            .add("drill_at", {
              x: startX,
              y: startY,
            })
            .add("G85", {
              x: endX,
              y: endY,
              width: minDim,
            })
          continue
        }

        builder.add("drill_at", {
          x: centerX,
          y: centerY * yMultiplier,
        })
      }
    }
  }

  builder.add("M30", {})

  return builder.build()
}

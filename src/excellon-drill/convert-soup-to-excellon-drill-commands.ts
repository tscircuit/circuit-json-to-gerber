import type { AnyCircuitElement } from "circuit-json"
import type { AnyExcellonDrillCommand } from "./any-excellon-drill-command-map"
import { excellonDrill } from "./excellon-drill-builder"

const getHoleDrillDiameter = (
  element: AnyCircuitElement,
): number | undefined => {
  if ("hole_diameter" in element && typeof element.hole_diameter === "number") {
    return element.hole_diameter
  }

  if (
    element.type === "pcb_plated_hole" &&
    "hole_width" in element &&
    "hole_height" in element &&
    typeof element.hole_width === "number" &&
    typeof element.hole_height === "number"
  ) {
    return Math.min(element.hole_width, element.hole_height)
  }

  return undefined
}

const getHoleOffset = (
  element: AnyCircuitElement,
): { x: number; y: number } => {
  if (
    element.type === "pcb_plated_hole" &&
    "hole_offset_x" in element &&
    "hole_offset_y" in element &&
    typeof element.hole_offset_x === "number" &&
    typeof element.hole_offset_y === "number"
  ) {
    return {
      x: element.hole_offset_x,
      y: element.hole_offset_y,
    }
  }

  return { x: 0, y: 0 }
}

const isPillSlotHole = (
  element: AnyCircuitElement,
): element is Extract<AnyCircuitElement, { type: "pcb_plated_hole" }> & {
  hole_width: number
  hole_height: number
  shape: string
} => {
  if (element.type !== "pcb_plated_hole") return false

  if (
    !("hole_width" in element) ||
    !("hole_height" in element) ||
    typeof element.hole_width !== "number" ||
    typeof element.hole_height !== "number"
  ) {
    return false
  }

  const { shape } = element as { shape?: string }

  return (
    shape === "pill" ||
    shape === "pill_hole_with_rect_pad" ||
    shape === "rotated_pill_hole_with_rect_pad"
  )
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
      const hole_diameter = getHoleDrillDiameter(element)

      if (hole_diameter === undefined) continue

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

  const y_multiplier = flip_y_axis ? -1 : 1

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
        const hole_diameter = getHoleDrillDiameter(element)

        if (hole_diameter === undefined) continue

        if (diameterToToolNumber[hole_diameter] !== i) continue

        const { x: hole_offset_x, y: hole_offset_y } = getHoleOffset(element)
        const hole_center_x = element.x + hole_offset_x
        const hole_center_y = element.y + hole_offset_y

        if (isPillSlotHole(element)) {
          const is_horizontal = element.hole_width > element.hole_height
          const slot_half_length = is_horizontal
            ? (element.hole_width - hole_diameter) / 2
            : (element.hole_height - hole_diameter) / 2

          if (slot_half_length <= 0) {
            builder.add("drill_at", {
              x: hole_center_x,
              y: hole_center_y * y_multiplier,
            })
          } else if (is_horizontal) {
            builder
              .add("G00", {})
              .add("drill_at", {
                x: hole_center_x - slot_half_length,
                y: hole_center_y * y_multiplier,
              })
              .add("M15", {})
              .add("G01", {})
              .add("drill_at", {
                x: hole_center_x + slot_half_length,
                y: hole_center_y * y_multiplier,
              })
              .add("M16", {})
              .add("G05", {})
          } else {
            builder
              .add("G00", {})
              .add("drill_at", {
                x: hole_center_x,
                y: (hole_center_y - slot_half_length) * y_multiplier,
              })
              .add("M15", {})
              .add("G01", {})
              .add("drill_at", {
                x: hole_center_x,
                y: (hole_center_y + slot_half_length) * y_multiplier,
              })
              .add("M16", {})
              .add("G05", {})
          }
        } else {
          builder.add("drill_at", {
            x: hole_center_x,
            y: hole_center_y * y_multiplier,
          })
        }
      }
    }
  }

  builder.add("M30", {})

  return builder.build()
}

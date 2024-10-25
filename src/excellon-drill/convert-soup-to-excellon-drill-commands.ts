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

      if ("hole_diameter" in element) {
        hole_diameter = element.hole_diameter
      } else if (
        element.type === "pcb_plated_hole" &&
        element.shape === "pill"
      ) {
        // For pill shapes, use the minimum dimension as the hole diameter
        hole_diameter = Math.min(element.hole_width, element.hole_height)
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

        if ("hole_diameter" in element) {
          hole_diameter = element.hole_diameter
        }

        if (element.type === "pcb_plated_hole" && element.shape === "pill") {
          hole_diameter = Math.min(element.hole_width, element.hole_height)

          // For pill shapes, we need to route the hole
          if (diameterToToolNumber[hole_diameter] === i) {
            const y_multiplier = flip_y_axis ? -1 : 1

            if (element.hole_width > element.hole_height) {
              // Horizontal pill
              const offset = (element.hole_width - element.hole_height) / 2
              builder
                .add("G85", {})
                .add("drill_at", {
                  x: element.x - offset,
                  y: element.y * y_multiplier,
                })
                .add("drill_at", {
                  x: element.x + offset,
                  y: element.y * y_multiplier,
                })
            } else {
              // Vertical pill
              const offset = (element.hole_height - element.hole_width) / 2
              builder
                .add("G85", {})
                .add("drill_at", {
                  x: element.x,
                  y: (element.y - offset) * y_multiplier,
                })
                .add("drill_at", {
                  x: element.x,
                  y: (element.y + offset) * y_multiplier,
                })
            }
          }
        } else if (!hole_diameter) continue
        else if (diameterToToolNumber[hole_diameter] === i) {
          builder.add("drill_at", {
            x: element.x,
            y: element.y * (flip_y_axis ? -1 : 1),
          })
        }
      }
    }
  }

  builder.add("M30", {})

  return builder.build()
}

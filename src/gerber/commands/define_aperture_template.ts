import { z } from "zod"
import { defineGerberCommand } from "../define-gerber-command"
import { getGerberCoordinateWithPadding } from "../stringify-gerber/get-gerber-coordinate-with-padding"

const circle_template = z.object({
  standard_template_code: z.literal("C").describe("circle"),
  diameter: z.number(),
  hole_diameter: z.number().optional(),
})

const rectangle_template = z.object({
  standard_template_code: z.literal("R").describe("rectangle"),
  x_size: z.number(),
  y_size: z.number(),
  hole_diameter: z.number().optional(),
})

const obround_template = z.object({
  standard_template_code: z.literal("O").describe("obround"),
  x_size: z.number(),
  y_size: z.number(),
  hole_diameter: z.number().optional(),
})

const polygon_template = z.object({
  standard_template_code: z.literal("P").describe("polygon"),
  outer_diameter: z.number(),
  number_of_vertices: z.number().int(),
  rotation: z.number().optional(),
  hole_diameter: z.number().optional(),
})

const standard_aperture_template_config = z.discriminatedUnion(
  "standard_template_code",
  [circle_template, rectangle_template, obround_template, polygon_template],
)

const horz_pill_template = z.object({
  macro_name: z.literal("HORZPILL"),
  x_size: z.number(),
  y_size: z.number(),
  circle_diameter: z.number(),
  circle_center_offset: z.number(),
})

const vert_pill_template = z.object({
  macro_name: z.literal("VERTPILL"),
  x_size: z.number(),
  y_size: z.number(),
  circle_diameter: z.number(),
  circle_center_offset: z.number(),
})

const roundrect_template = z.object({
  macro_name: z.literal("ROUNDRECT"),
  corner_radius: z.number(),
  corner_1_x: z.number(),
  corner_1_y: z.number(),
  corner_2_x: z.number(),
  corner_2_y: z.number(),
  corner_3_x: z.number(),
  corner_3_y: z.number(),
  corner_4_x: z.number(),
  corner_4_y: z.number(),
})

const macro_aperture_template_config = z.discriminatedUnion("macro_name", [
  horz_pill_template,
  vert_pill_template,
  roundrect_template,
  z.object({
    macro_name: z.literal("ROTATEDPILL"),
    diameter: z.number(),
    offset_x: z.number(),
    offset_y: z.number(),
  }),
])

const aperture_template_config = z.union([
  standard_aperture_template_config,
  macro_aperture_template_config,
])

const formatApertureNumber = (value: number): string =>
  (Math.abs(value) < 1e-12 ? 0 : value).toFixed(6)

export const define_aperture_template = defineGerberCommand({
  command_code: "ADD",
  schema: aperture_template_config.and(
    z.object({
      command_code: z.literal("ADD").default("ADD"),
      aperture_number: z.number().int(),
    }),
  ),
  stringify(props) {
    if ("macro_name" in props) {
      const { aperture_number, macro_name } = props
      let commandString = `%ADD${aperture_number}${macro_name},`

      if (macro_name === "HORZPILL" || macro_name === "VERTPILL") {
        commandString += `${formatApertureNumber(props.x_size)}X${formatApertureNumber(props.y_size)}X${formatApertureNumber(props.circle_diameter)}X${formatApertureNumber(props.circle_center_offset)}`
      } else if (macro_name === "ROTATEDPILL") {
        commandString += [props.diameter, props.offset_x, props.offset_y]
          .map((value) => formatApertureNumber(value))
          .join("X")
      } else if (macro_name === "ROUNDRECT") {
        commandString += [
          props.corner_radius,
          props.corner_1_x,
          props.corner_1_y,
          props.corner_2_x,
          props.corner_2_y,
          props.corner_3_x,
          props.corner_3_y,
          props.corner_4_x,
          props.corner_4_y,
        ]
          .map((value) => formatApertureNumber(value))
          .join("X")
      }

      commandString += "*%"
      return commandString
    }
    if ("standard_template_code" in props) {
      const { aperture_number, standard_template_code } = props
      let commandString = `%ADD${aperture_number}${standard_template_code},`

      if (standard_template_code === "C") {
        commandString += `${formatApertureNumber(props.diameter)}`
      } else if (
        standard_template_code === "R" ||
        standard_template_code === "O"
      ) {
        commandString += `${formatApertureNumber(props.x_size)}X${formatApertureNumber(props.y_size)}`
      } else if (standard_template_code === "P") {
        commandString += `${props.outer_diameter}X${props.number_of_vertices}`
        if (props.rotation) {
          commandString += `X${props.rotation}`
        } else if (props.hole_diameter) {
          commandString += "X0"
        }
      }

      if (props.hole_diameter) {
        commandString += `X${formatApertureNumber(props.hole_diameter)}`
      }

      commandString += "*%"

      return commandString
    }
    throw new Error(
      `Invalid aperture template config: ${JSON.stringify(props)}`,
    )
  },
})

export type DefineAperatureTemplateCommand = z.infer<
  typeof define_aperture_template.schema
>

export type ApertureTemplateConfig = z.infer<typeof aperture_template_config>

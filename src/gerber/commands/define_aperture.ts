import { z } from "zod"
import { defineGerberCommand } from "../define-gerber-command"

export const define_aperture = defineGerberCommand({
  command_code: "AD",
  schema: z
    .object({
      command_code: z.literal("AD").default("AD"),
      aperture_code: z.string(),
    })
    .describe(
      "Aperture define: Defines a template-based aperture, assigns a D code to it. 4.3",
    ),
  stringify({ aperture_code }) {
    return `%AD${aperture_code}*%`
  },
})

export type DefineAperture = z.infer<typeof define_aperture.schema>

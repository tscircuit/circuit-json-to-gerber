import { z } from "zod"
import { defineGerberCommand } from "../define-gerber-command"

export const start_region_statement = defineGerberCommand({
  command_code: "G36",
  schema: z
    .object({
      command_code: z.literal("G36").default("G36"),
    })
    .describe(
      "Start region statement: Starts a region statement which creates a region by defining its contours.",
    ),
  stringify() {
    return "G36*"
  },
})

export type StartRegionStatement = z.infer<typeof start_region_statement.schema>

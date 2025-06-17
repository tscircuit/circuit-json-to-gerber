import { z } from "zod"
import { defineGerberCommand } from "../define-gerber-command"

export const end_region_statement = defineGerberCommand({
  command_code: "G37",
  schema: z
    .object({
      command_code: z.literal("G37").default("G37"),
    })
    .describe("End region statement: Ends the region statement"),
  stringify() {
    return "G37*"
  },
})

export type EndRegionStatement = z.infer<typeof end_region_statement.schema>

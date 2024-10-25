import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

export const G00 = defineExcellonDrillCommand({
  command_code: "G00",
  schema: z.object({
    command_code: z.literal("G00").default("G00"),
  }),
  stringify: () => "G00",
})

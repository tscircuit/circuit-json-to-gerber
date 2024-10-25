import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

export const G01 = defineExcellonDrillCommand({
  command_code: "G01",
  schema: z.object({
    command_code: z.literal("G01").default("G01"),
  }),
  stringify: () => "G01",
})

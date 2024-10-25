import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

/**
 * Z-Axis Feed Down
 */
export const M15 = defineExcellonDrillCommand({
  command_code: "M15",
  schema: z.object({
    command_code: z.literal("M15").default("M15"),
  }),
  stringify: () => "M15",
})

import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

/**
 * Z-Axis Feed Up (lift drill up)
 */
export const M16 = defineExcellonDrillCommand({
  command_code: "M16",
  schema: z.object({
    command_code: z.literal("M16").default("M16"),
  }),
  stringify: () => "M16",
})

import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

export const G85 = defineExcellonDrillCommand({
  command_code: "G85",
  schema: z.object({
    command_code: z.literal("G85").default("G85"),
    x: z.number(),
    y: z.number(),
    width: z.number(), // slot width = tool diameter
  }),
  stringify: ({ x, y }) => `G85X${x.toFixed(3)}Y${y.toFixed(3)}`,
})

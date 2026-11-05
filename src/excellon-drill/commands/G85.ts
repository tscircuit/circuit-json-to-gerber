import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

const formatSlotCoordinate = (value: number): string => {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value
  return normalized.toFixed(3)
}

export const G85 = defineExcellonDrillCommand({
  command_code: "G85",
  schema: z.object({
    command_code: z.literal("G85").default("G85"),
    x: z.number(),
    y: z.number(),
    width: z.number(), // slot width = tool diameter
  }),
  stringify: ({ x, y }) =>
    `G85X${formatSlotCoordinate(x)}Y${formatSlotCoordinate(y)}`,
})

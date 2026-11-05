import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

const formatExcellonCoordinate = (value: number, precision: number): string => {
  const normalized = Math.abs(value) < 0.5 * 10 ** -precision ? 0 : value
  return normalized.toFixed(precision)
}

export const drill_at = defineExcellonDrillCommand({
  command_code: "drill_at",
  schema: z.object({
    command_code: z.literal("drill_at").default("drill_at"),
    x: z.number(),
    y: z.number(),
  }),
  stringify: (c) =>
    `X${formatExcellonCoordinate(c.x, 4)}Y${formatExcellonCoordinate(c.y, 4)}`,
})

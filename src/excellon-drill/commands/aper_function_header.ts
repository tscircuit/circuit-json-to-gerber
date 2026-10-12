import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

export const aper_function_header = defineExcellonDrillCommand({
  command_code: "aper_function_header",
  schema: z.object({
    command_code: z
      .literal("aper_function_header")
      .default("aper_function_header"),
    is_plated: z.boolean(),
    drill_function: z.enum(["ViaDrill", "ComponentDrill"]).optional(),
  }),
  stringify({ is_plated, drill_function }) {
    if (!is_plated) {
      return "; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill"
    }
    const func = drill_function ?? "ComponentDrill"
    return `; #@! TA.AperFunction,Plated,PTH,${func}`
  },
})

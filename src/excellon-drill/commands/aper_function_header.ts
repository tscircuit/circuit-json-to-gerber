import { z } from "zod"
import { defineExcellonDrillCommand } from "../define-excellon-drill-command"

export const aper_function_header = defineExcellonDrillCommand({
  command_code: "aper_function_header",
  schema: z.object({
    command_code: z
      .literal("aper_function_header")
      .default("aper_function_header"),
    is_plated: z.boolean(),
    drill_function: z
      .enum(["ViaDrill", "ComponentDrill"])
      .default("ComponentDrill"),
  }),
  stringify({ is_plated, drill_function }) {
    return is_plated
      ? `; #@! TA.AperFunction,Plated,PTH,${drill_function}`
      : "; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill"
  },
})

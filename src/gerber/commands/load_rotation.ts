import { z } from "zod"
import { defineGerberCommand } from "../define-gerber-command"

export const load_rotation = defineGerberCommand({
  command_code: "LR",
  schema: z
    .object({
      command_code: z.literal("LR").default("LR"),
      rotation_degrees: z.number(),
    })
    .describe(
      "Load rotation: Loads the rotation object transformation parameter.",
    ),
  stringify: ({ rotation_degrees }) => {
    return `%LR${rotation_degrees}*%`
  },
})

export type LoadRotation = z.infer<typeof load_rotation.schema>

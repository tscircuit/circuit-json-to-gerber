import { expect } from "bun:test"
import { pcb_smtpad, type AnyCircuitElement } from "circuit-json"
import type { AnyGerberCommand } from "src/gerber/any_gerber_command"

export const flexBoard: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "flex_board",
  center: { x: 100, y: -70 },
  width: 12,
  height: 12,
  num_layers: 2,
  thickness: 0.12,
  material: "flex",
}

export const goldFingers = (layer: "top" | "bottom") =>
  Array.from({ length: 8 }, (_, i) =>
    pcb_smtpad.parse({
      type: "pcb_smtpad",
      pcb_smtpad_id: `finger_${layer}_${i}`,
      shape: "rect",
      layer,
      x: 97.55 + i * 0.7,
      y: -66.5,
      width: 0.4,
      height: 3,
      soldermask_margin: 0,
    }),
  )

export const regionPoints = (commands: AnyGerberCommand[]) =>
  commands.flatMap((command) =>
    command.command_code === "D01" || command.command_code === "D02"
      ? [{ x: command.x, y: command.y }]
      : [],
  )

export const expectOtherFilesUnchanged = (
  actual: Record<string, string>,
  baseline: Record<string, string>,
  openingFile: string,
) => {
  // File timestamps are incidental to geometry; the opening must not add
  // copper, paste, silkscreen, outline, drills, or an opening on the other face.
  const withoutDates = (file: string) =>
    file.replace(/^.*(?:CreationDate|Created by tscircuit).*\n/gm, "")
  expect(Object.keys(actual)).toEqual(Object.keys(baseline))
  for (const file of Object.keys(actual)) {
    if (file === openingFile) continue
    expect(withoutDates(actual[file])).toEqual(withoutDates(baseline[file]))
  }
}

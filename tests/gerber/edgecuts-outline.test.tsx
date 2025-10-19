import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import type { AnyGerberCommand } from "src/gerber/any_gerber_command"

const isMoveOrPlotCommand = (
  command: AnyGerberCommand,
): command is Extract<AnyGerberCommand, { command_code: "D01" | "D02" }> => {
  return command.command_code === "D02" || command.command_code === "D01"
}

const normaliseZero = (value: number) => (Object.is(value, -0) ? 0 : value)

test("generates rectangular edge cuts when width/height are provided", () => {
  const board: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "board_rect",
    center: { x: 25, y: -10 },
    width: 40,
    height: 20,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  }

  const commands = convertSoupToGerberCommands([board])
  const edgeCutsPath = commands.Edge_Cuts.filter(isMoveOrPlotCommand).map(
    ({ command_code, x, y }) => ({
      command_code,
      x: normaliseZero(x),
      y: normaliseZero(y),
    }),
  )

  expect(edgeCutsPath).toEqual([
    { command_code: "D02", x: 5, y: -20 },
    { command_code: "D01", x: 45, y: -20 },
    { command_code: "D01", x: 45, y: 0 },
    { command_code: "D01", x: 5, y: 0 },
    { command_code: "D01", x: 5, y: -20 },
  ])
})

test("generates outline edge cuts when explicit outline is provided", () => {
  const boardWithOutline: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "board_outline",
    width: 0,
    height: 0,
    thickness: 1.6,
    num_layers: 2,
    center: { x: 0, y: 0 },
    material: "fr4",
    outline: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 22, y: 6 },
      { x: 4, y: 12 },
    ],
  }

  const commands = convertSoupToGerberCommands([boardWithOutline], {
    flip_y_axis: true,
  })

  const edgeCutsPath = commands.Edge_Cuts.filter(isMoveOrPlotCommand).map(
    ({ command_code, x, y }) => ({
      command_code,
      x: normaliseZero(x),
      y: normaliseZero(y),
    }),
  )

  expect(edgeCutsPath).toEqual([
    { command_code: "D02", x: 0, y: 0 },
    { command_code: "D01", x: 20, y: 0 },
    { command_code: "D01", x: 22, y: -6 },
    { command_code: "D01", x: 4, y: -12 },
    { command_code: "D01", x: 0, y: 0 },
  ])
})

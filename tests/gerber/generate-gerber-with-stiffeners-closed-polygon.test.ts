import { expect, test } from "bun:test"
import { board, polygon } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

test("does not add a duplicate closing segment for explicitly closed polygons", () => {
  const commands = convertCircuitJsonToGerberCommands([
    board,
    { ...polygon, outline: [...polygon.outline, polygon.outline[0]] },
  ])
  expect(
    commands.F_Stiffener_fr4.filter(
      (command) => command.command_code === "D01",
    ),
  ).toHaveLength(5)
})

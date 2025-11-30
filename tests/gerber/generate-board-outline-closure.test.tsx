import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

// Regression test: outlines should be closed in the Edge_Cuts layer
// even if the provided outline path does not repeat the starting point.
test("board outline paths are closed and flipped when required", () => {
  const circuit = new Circuit()
  circuit.add(
    <board
      width={10}
      height={10}
      outline={[
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
      ]}
    />, // outline intentionally does not repeat the starting point
  )

  const soup = circuit.getCircuitJson()
  const edgeCuts = convertSoupToGerberCommands(soup as any, {
    flip_y_axis: true,
  }).Edge_Cuts

  const outlineCommands = edgeCuts.filter(
    (cmd) => cmd.command_code === "D02" || cmd.command_code === "D01",
  )

  expect(
    outlineCommands.map(({ command_code, x, y }) => ({
      command_code,
      x,
      y: Object.is(y, -0) ? 0 : y,
    })),
  ).toEqual([
    { command_code: "D02", x: 0, y: 0 },
    { command_code: "D01", x: 10, y: 0 },
    { command_code: "D01", x: 10, y: -5 },
    { command_code: "D01", x: 0, y: -5 },
    { command_code: "D01", x: 0, y: 0 },
  ])
})

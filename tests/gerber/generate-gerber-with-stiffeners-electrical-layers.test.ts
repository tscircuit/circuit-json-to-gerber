import { expect, test } from "bun:test"
import {
  board,
  visualCopper,
  visualStiffeners,
} from "../fixtures/stiffener-visuals"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

test("leaves electrical layers and board cuts unchanged and emits no empty stiffener files", () => {
  const baseline = convertCircuitJsonToGerberCommands([board, ...visualCopper])
  const withStiffeners = convertCircuitJsonToGerberCommands([
    board,
    ...visualCopper,
    ...visualStiffeners,
  ])
  expect(Object.keys(baseline).some((key) => key.includes("Stiffener"))).toBe(
    false,
  )
  // Generated timestamps vary between calls, so compare all geometric commands.
  const withoutTimestamps = (commands: typeof baseline.F_Cu) =>
    commands.filter(
      (command) =>
        command.command_code !== "G04" &&
        !(
          command.command_code === "TF" &&
          command.attribute_name === "CreationDate"
        ),
    )
  for (const layerName of Object.keys(baseline)) {
    expect(withoutTimestamps(withStiffeners[layerName])).toEqual(
      withoutTimestamps(baseline[layerName]),
    )
  }
})

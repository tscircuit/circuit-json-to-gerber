import { expect, test } from "bun:test"
import { Circuit } from "tscircuit"
import {
  convertCircuitJsonToExcellonDrillCommands,
  excellonDrill,
  stringifyExcellonDrill,
} from "src/excellon-drill"

test("stringifies drill_at followed by G85 on a single Excellon slot block", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={10} height={10} routingDisabled>
      <platedhole
        name="USB_SHELL_SLOT"
        shape="pill"
        outerWidth={1.1}
        outerHeight={2.1}
        holeWidth={0.6}
        holeHeight={1.7}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const commands = convertCircuitJsonToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })
  const output = stringifyExcellonDrill(commands)
  const slotBlocks = output
    .split("\n")
    .filter((line) => line.startsWith("X") || line.startsWith("G85"))

  expect(slotBlocks).toEqual(["X0.0000Y-0.5500G85X0.0000Y0.5500"])
  expect(
    commands.filter((command) => command.command_code === "G85"),
  ).toHaveLength(1)

  const mixed = excellonDrill()
    .add("drill_at", { x: 1, y: 2 })
    .add("drill_at", { x: -1.25, y: 0 })
    .add("G85", { x: 1.25, y: 0, width: 0.8 })
    .add("drill_at", { x: 3, y: -4 })
    .build()
  expect(stringifyExcellonDrill(mixed).split("\n")).toEqual([
    "X1.0000Y2.0000",
    "X-1.2500Y0.0000G85X1.2500Y0.0000",
    "X3.0000Y-4.0000",
  ])
})

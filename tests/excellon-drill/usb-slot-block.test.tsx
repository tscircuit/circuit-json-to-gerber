import { expect, test } from "bun:test"
import { Circuit } from "tscircuit"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"

test("USB mounting slot start and G85 endpoint share one drill block", async () => {
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
  const commands = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })
  const output = stringifyExcellonDrill(commands)
  const slotBlocks = output
    .split("\n")
    .filter((line) => line.startsWith("X") || line.startsWith("G85"))
  expect(slotBlocks).toEqual(["X0.0000Y-0.5500G85X0.000Y0.550"])
  expect(
    commands.filter((command) => command.command_code === "G85"),
  ).toHaveLength(1)
  await expect(circuitJson).toMatchCircuitJsonPcbAndMessageSnapshot(
    import.meta.path,
    "usb-slot-block",
    [
      "USB shell slot: 0.60 mm wide x 1.70 mm long",
      "Start and G85 endpoint must share one Excellon block.",
      "Exported drill blocks:",
      ...slotBlocks,
      `Coordinate/slot blocks: ${slotBlocks.length}`,
    ],
    {
      circuitJsonLabel: "TSX: one plated USB mounting slot",
      messageLabel: "Actual Excellon output",
    },
  )
})

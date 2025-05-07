import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import UsbCFlashLightCircuitJson from "./components/UsbCFlashLight.circuit.json" with {
  type: "json",
}

test("Generate gerber of macrokeypad", async () => {
  const gerber_cmds = convertSoupToGerberCommands(
    UsbCFlashLightCircuitJson as any,
  )

  expect(gerber_cmds).toBeDefined()
  expect(
    Object.values(gerber_cmds)[0].filter((x: any) =>
      x?.macro_name?.includes?.("PILL"),
    ).length,
  ).not.toEqual(0)
})

import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import UsbCFlashLightCircuitJson from "./components/UsbCFlashLight.circuit.json" with {
  type: "json",
}

test("Generate gerber of macrokeypad", async () => {
  // @ts-ignore
  console.log(UsbCFlashLightCircuitJson.filter((x) => x.shape === "pill"))
  const gerber_cmds = convertSoupToGerberCommands(
    UsbCFlashLightCircuitJson as any,
  )
  expect(gerber_cmds).toBeDefined()
})

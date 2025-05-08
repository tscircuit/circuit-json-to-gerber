import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import breakoutMAX3232 from "./components/Breakout-MAX3232.json" with {
  type: "json",
}

test("Generate gerber of macrokeypad", async () => {
  const gerber_cmds = convertSoupToGerberCommands(breakoutMAX3232 as any)

  expect(gerber_cmds).toBeDefined()
  expect(
    Object.values(gerber_cmds)[0].filter((x: any) =>
      x?.command_code?.includes?.("LR"),
    ).length,
  ).toBeGreaterThan(0)
  expect(
    Object.values(gerber_cmds)[0].filter((x: any) =>
      x?.macro_name?.includes?.("RoundRect"),
    ).length,
  ).toBeGreaterThan(0)
})

import { expect, test } from "bun:test"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import greenboard from "./greenboard.json"

test("greenboard edge cuts follow the custom outline", async () => {
  const gerberCmds = convertSoupToGerberCommands(greenboard as any)

  const outlineCommands = gerberCmds.Edge_Cuts.filter(
    (cmd) => cmd.command_code === "D01" || cmd.command_code === "D02",
  ) as Array<{ command_code: "D01" | "D02"; x: number; y: number }>

  const moveCommand = outlineCommands.find((cmd) => cmd.command_code === "D02")
  expect(moveCommand).toBeDefined()

  const plotCommands = outlineCommands.filter(
    (cmd) => cmd.command_code === "D01",
  )
  expect(plotCommands.length).toBeGreaterThan(10)

  const lastPlot = plotCommands[plotCommands.length - 1]
  expect(lastPlot).toEqual({
    command_code: "D01",
    x: moveCommand!.x,
    y: moveCommand!.y,
  })

  const excellonDrillCmds = convertSoupToExcellonDrillCommands({
    circuitJson: greenboard as any,
    is_plated: true,
  })
  const excellonDrillCmdsUnplated = convertSoupToExcellonDrillCommands({
    circuitJson: greenboard as any,
    is_plated: false,
  })

  const gerberOutput = stringifyGerberCommandLayers(gerberCmds)
  const excellonDrillOutput = stringifyExcellonDrill(excellonDrillCmds)
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellonDrillCmdsUnplated,
  )

  expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
    "drill_npth.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "greenboard")
})

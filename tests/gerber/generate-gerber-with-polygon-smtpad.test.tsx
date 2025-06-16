import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"

test("Generate gerber with polygon smtpad", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={20}>
      <smtpad
        shape="polygon"
        layer="top"
        points={[
          { x: 0, y: 2 },
          { x: -0.588, y: 0.809 },
          { x: -1.902, y: 0.618 },
          { x: -0.951, y: -0.309 },
          { x: -1.176, y: -1.618 },
          { x: 0, y: -1 },
          { x: 1.176, y: -1.618 },
          { x: 0.951, y: -0.309 },
          { x: 1.902, y: 0.618 },
          { x: 0.588, y: 0.809 },
        ]}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(circuitJson as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: true,
  })

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
  }).toMatchGerberSnapshot(import.meta.path, "polygon-smtpad")
})

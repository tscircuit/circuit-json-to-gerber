import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"

test("Generate gerber with pill shape rotated", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={20}>
      <platedhole
        shape="pill"
        outerWidth={5}
        outerHeight={1.5}
        holeWidth={4}
        holeHeight={1}
        pcbX={2}
        pcbY={2}
        pcbRotation={45}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  const gerber_cmds = convertSoupToGerberCommands(circuitJson as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: true,
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: false,
  })

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellon_drill_cmds_unplated,
  )
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
    "drill_npth.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "pill-shape-rotated")
})

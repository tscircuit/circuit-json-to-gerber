import { test, expect } from "bun:test"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"
import { Circuit } from "@tscircuit/core"

test("Generate gerber with paste layers", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={10} height={10}>
      {/* Top layer pads */}
      <smtpad
        shape="rect"
        width={1}
        height={1.5}
        layer="top"
        pcbX={-2}
        pcbY={2}
      />
      <smtpad
        shape="circle"
        radius={0.75}
        layer="top"
        pcbX={2}
        pcbY={2}
      />

      {/* Bottom layer pads */}
      <smtpad
        shape="rect"
        width={1.5}
        height={1}
        layer="bottom"
        pcbX={-2}
        pcbY={-2}
      />
      <smtpad
        shape="circle"
        radius={0.5}
        layer="bottom"
        pcbX={2}
        pcbY={-2}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  // Generate commands
  const gerber_cmds = convertSoupToGerberCommands(circuitJson)
  const excellon_drill_cmds_plated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: true, // Paste usually goes with plated holes
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson,
    is_plated: false,
  })

  // Stringify outputs
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)
  const excellonDrillOutputPlated = stringifyExcellonDrill(
    excellon_drill_cmds_plated,
  )
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellon_drill_cmds_unplated,
  )

  // Optionally write files for debugging
  await maybeOutputGerber(gerberOutput, excellonDrillOutputPlated)

  // Assert against snapshot
  // This will generate SVGs for each layer, including F_Paste and B_Paste
  expect({
    ...gerberOutput,
    "drill_plated.drl": excellonDrillOutputPlated,
    "drill_unplated.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "paste-layer")
})

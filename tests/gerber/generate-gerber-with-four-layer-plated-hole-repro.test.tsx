import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("generates four-layer plated-hole copper without inner soldermask", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={12} height={8} layers={4}>
      <platedhole shape="circle" holeDiameter={1} outerDiameter={2} pcbX={-2} />
      <platedhole
        shape="pill"
        holeWidth={2}
        holeHeight={1}
        outerWidth={3}
        outerHeight={2}
        pcbX={2}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  for (const element of circuitJson) {
    if (element.type === "pcb_plated_hole") {
      element.layers = ["top", "inner1", "inner2", "bottom"]
    }
  }

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.In1_Cu).toBeDefined()
  expect(gerberOutput.In2_Cu).toBeDefined()
  expect(gerberOutput).toMatchGerberLayerSnapshots(
    import.meta.path,
    "four-layer-plated-hole",
    ["F_Cu", "In1_Cu", "In2_Cu", "B_Cu"],
  )
  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "four-layer-plated-hole-repro",
    circuitJson,
    ["F_Cu", "In1_Cu", "In2_Cu", "B_Cu"],
  )
})

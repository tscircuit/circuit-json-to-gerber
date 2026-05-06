import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import fourLayerCircuitJson from "tests/gerber/assets/four-layer.json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const copperGerberLayers = ["F_Cu", "In1_Cu", "In2_Cu", "B_Cu"] as const

test("generates svg snapshots for four layer asset", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(fourLayerCircuitJson as AnyCircuitElement[]),
  )

  expect(Object.keys(gerberOutput)).toContain("In1_Cu")
  expect(Object.keys(gerberOutput)).toContain("In2_Cu")
  expect(gerberOutput.F_Cu).toContain("%TF.FileFunction,Copper,L1,Top*%")
  expect(gerberOutput.In1_Cu).toContain("%TF.FileFunction,Copper,L2,Inr*%")
  expect(gerberOutput.In2_Cu).toContain("%TF.FileFunction,Copper,L3,Inr*%")
  expect(gerberOutput.B_Cu).toContain("%TF.FileFunction,Copper,L4,Bot*%")

  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "four-layer")
  expect(gerberOutput).toMatchGerberLayerSnapshots(
    import.meta.path,
    "four-layer",
    [...copperGerberLayers],
  )
  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "four-layer-all-copper",
    [...copperGerberLayers],
  )
})

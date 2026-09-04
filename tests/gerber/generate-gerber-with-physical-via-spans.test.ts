import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import autoViaCircuit from "./assets/autorouted-inner-layer-vias.json"

test("physical through-via layers override deprecated routing endpoints", async () => {
  const circuitJson = autoViaCircuit as CircuitJson
  const vias = circuitJson.filter((e) => e.type === "pcb_via")
  expect(vias).toHaveLength(2)
  expect(vias.every((via) => via.to_layer === "inner1")).toBe(true)

  const drills = convertCircuitJsonToExcellonDrillCommandLayers({ circuitJson })
  expect(Object.keys(drills)).toEqual(["drill-L1-L4.drl"])
  const output = stringifyExcellonDrill(drills["drill-L1-L4.drl"]!)
  expect(output).toContain("TF.FileFunction,Plated,1,4,PTH")
  expect(output.match(/^X.*Y.*$/gm)).toHaveLength(vias.length)

  const copper = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  await expect({ ...copper, "drill-L1-L4.drl": output }).toMatchGerberSnapshot(
    import.meta.path,
    "physical-via-spans",
  )
})

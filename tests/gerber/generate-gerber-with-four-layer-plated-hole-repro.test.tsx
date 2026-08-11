import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("repro: four-layer plated holes fail during Gerber export", async () => {
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

  let gerberError: string | undefined
  try {
    stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))
  } catch (error) {
    gerberError = error instanceof Error ? error.message : String(error)
  }

  expect(gerberError).toBe("Inner layer inner1 only supports copper gerbers")
  if (!gerberError) throw new Error("Expected Gerber export to fail")
  await expect(circuitJson).toMatchCircuitJsonPcbAndMessageSnapshot(
    import.meta.path,
    "four-layer-plated-hole-repro",
    ["Gerber generation currently throws:", gerberError],
    { messageLabel: "Current failure" },
  )
})

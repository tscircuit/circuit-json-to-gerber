import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const BottomCopperPourWithHole = () => (
  <board width="30mm" height="20mm">
    <hole radius="1.5mm" pcbX={0} pcbY={0} />
    <copperpour layer="bottom" connectsTo="net.GND" />
  </board>
)

test("repro: bottom copper pour with centered hole", async () => {
  const circuit = new Circuit()
  circuit.add(<BottomCopperPourWithHole />)
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "bottom-copper-pour-hole-repro",
    circuitJson,
    ["B_Cu"],
  )
})

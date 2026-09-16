import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { parseGerberFile } from "gerberts"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("covered rectangular touch electrode soldermask repro", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={30} height={35} routingDisabled>
      <chip
        name="K1"
        footprint={
          <footprint>
            <smtpad
              portHints={["pin1"]}
              shape="rect"
              width={11}
              height={27}
              pcbX={0}
              pcbY={0}
              layer="top"
              coveredWithSolderMask
            />
            <smtpad
              portHints={["pin2"]}
              shape="rect"
              width={1}
              height={1}
              pcbX={8}
              pcbY={0}
              layer="top"
            />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(
    circuitJson.filter(
      (element) =>
        element.type === "pcb_smtpad" && element.is_covered_with_solder_mask,
    ),
  ).toHaveLength(1)
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  expect(parseGerberFile(gerberOutput.F_Cu).operations).toHaveLength(2)
  await expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "covered-rect-smtpad-mask-repro",
    ["F_Cu", "F_Mask"],
  )
})

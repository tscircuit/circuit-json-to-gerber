import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import {
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("repro: rounded plated-pad corners are lost in Gerber", async () => {
  const circuit = new Circuit()
  const padProps = {
    rectPadWidth: 3.6,
    rectPadHeight: 2.4,
    rectBorderRadius: 0.6,
    solderMaskMargin: 0.2,
  }
  circuit.add(
    <board width={18} height={7}>
      <platedhole
        {...padProps}
        shape="circular_hole_with_rect_pad"
        holeDiameter={0.8}
        pcbX={-5.5}
      />
      <platedhole
        {...padProps}
        shape="pill_hole_with_rect_pad"
        holeWidth={1.6}
        holeHeight={0.8}
        pcbX={0}
      />
      <platedhole
        {...padProps}
        shape="pill_hole_with_rect_pad"
        holeWidth={1.6}
        holeHeight={0.8}
        pcbX={5.5}
        pcbRotation={30}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  const platedHoles = circuitJson.filter(
    (elm) => elm.type === "pcb_plated_hole",
  )
  expect(platedHoles).toHaveLength(3)
  for (const hole of platedHoles) {
    expect(hole).toMatchObject({ rect_border_radius: 0.6 })
  }

  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  const drillOutput = stringifyExcellonDrill(
    convertCircuitJsonToExcellonDrillCommands({
      circuitJson,
      is_plated: true,
    }),
  )

  await expect({
    ...gerberOutput,
    "drill.drl": drillOutput,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rounded-plated-pad-corners",
    circuitJson,
    ["F_Mask", "F_Cu"],
    {
      circuitJsonLabel: "Circuit JSON: 0.6 mm pad corner radius",
      gerberLabel: "Current Gerber: sharp pad and mask corners",
    },
  )
})

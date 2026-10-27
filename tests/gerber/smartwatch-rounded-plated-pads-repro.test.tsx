import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("repro: Smartwatch variant loses rounded switch plated-pad corners", async () => {
  const circuitJson = (await Bun.file(
    new URL(
      "./assets/smartwatch-rounded-plated-pads.circuit.json",
      import.meta.url,
    ),
  ).json()) as AnyCircuitElement[]
  const switchPads = circuitJson
    .filter((element) => element.type === "pcb_plated_hole")
    .filter((element) => element.pcb_plated_hole_id.startsWith("switch_"))
  expect(switchPads).toHaveLength(8)
  for (const pad of switchPads) {
    expect(pad).toMatchObject({
      shape: "circular_hole_with_rect_pad",
      hole_diameter: 0.3,
      rect_border_radius: 0.2,
    })
  }

  const drillLayers = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson,
  })
  const drillOutput = Object.fromEntries(
    Object.entries(drillLayers).map(([name, commands]) => [
      name,
      stringifyExcellonDrill(commands),
    ]),
  )
  const gerberOutput = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJson),
  )
  await expect({
    ...gerberOutput,
    ...drillOutput,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "smartwatch-rounded-plated-pads",
    circuitJson,
    ["F_Mask", "F_Cu", "F_SilkScreen"],
    {
      circuitJsonLabel:
        "Smartwatch variant: SW1/SW2 plated pads, radius 0.2 mm",
      gerberLabel: "Current Gerber: SW1/SW2 pad corners become sharp",
      panelWidth: 1200,
      panelHeight: 1200,
    },
  )
})

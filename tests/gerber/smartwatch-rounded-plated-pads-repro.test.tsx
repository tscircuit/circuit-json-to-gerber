import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { cloneElement } from "react"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("repro: Smartwatch variant loses rounded switch plated-pad corners", async () => {
  // Unmodified dist/pcb/circuit.json from https://tscircuit.com/anil08607/Smartwatch
  // v1.0.14, release 24553b2a-9ff8-40df-a1a5-6c519167a150.
  // This variant replaces SW1/SW2's eight SMT pads with rounded plated holes.
  // The published board's USB-C pads and existing mounting holes are unchanged.
  const original = (await Bun.file(
    new URL("./assets/smartwatch-v1.0.14.circuit.json", import.meta.url),
  ).json()) as AnyCircuitElement[]
  const switchSourceIds = original
    .filter((element) => element.type === "source_component")
    .filter((element) => element.name === "SW1" || element.name === "SW2")
    .map((element) => element.source_component_id)
  expect(switchSourceIds).toHaveLength(2)
  const switchComponentIds = original
    .filter((element) => element.type === "pcb_component")
    .filter((element) => switchSourceIds.includes(element.source_component_id))
    .map((element) => element.pcb_component_id)
  const switchPads = original.filter(
    (
      element,
    ): element is Extract<
      AnyCircuitElement,
      { type: "pcb_smtpad"; shape: "rect" }
    > =>
      element.type === "pcb_smtpad" &&
      element.shape === "rect" &&
      element.pcb_component_id !== undefined &&
      switchComponentIds.includes(element.pcb_component_id),
  )
  expect(switchPads).toHaveLength(8)
  const copperLayers = ["top", "inner1", "inner2", "bottom"] as const

  const pads = new Circuit()
  pads.add(
    <board width={46} height={46} layers={4}>
      {switchPads.map((pad) =>
        cloneElement(
          <platedhole
            shape="circular_hole_with_rect_pad"
            holeDiameter={0.3}
            rectPadWidth={pad.width}
            rectPadHeight={pad.height}
            rectBorderRadius={0.2}
            pcbX={pad.x}
            pcbY={pad.y}
          />,
          { key: pad.pcb_smtpad_id },
        ),
      )}
    </board>,
  )
  const roundedPads = pads
    .getCircuitJson()
    .filter((element) => element.type === "pcb_plated_hole")
  expect(roundedPads).toHaveLength(8)
  const replacements = new Map(
    switchPads.map((pad, index) => {
      expect(roundedPads[index]).toMatchObject({
        shape: "circular_hole_with_rect_pad",
        rect_border_radius: 0.2,
        hole_diameter: 0.3,
      })
      return [
        pad.pcb_smtpad_id,
        {
          ...roundedPads[index],
          pcb_plated_hole_id: `switch_${pad.pcb_smtpad_id}`,
          pcb_component_id: pad.pcb_component_id,
          pcb_port_id: pad.pcb_port_id,
          port_hints: pad.port_hints,
          subcircuit_id: pad.subcircuit_id,
          layers: [...copperLayers],
        },
      ]
    }),
  )
  const switchPortIds = new Set(switchPads.map((pad) => pad.pcb_port_id))
  const circuitJson = original.flatMap<AnyCircuitElement>((element) => {
    if (element.type === "pcb_smtpad")
      return [replacements.get(element.pcb_smtpad_id) ?? element]
    // Remove stale SMT paste and extend the converted pads' ports through the PCB.
    if (
      element.type === "pcb_solder_paste" &&
      element.pcb_smtpad_id &&
      replacements.has(element.pcb_smtpad_id)
    )
      return []
    if (element.type === "pcb_port" && switchPortIds.has(element.pcb_port_id))
      return [{ ...element, layers: [...copperLayers] }]
    return [element]
  })
  const usbCElements = (elements: AnyCircuitElement[]) =>
    elements.filter(
      (element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === "pcb_component_0",
    )
  expect(usbCElements(circuitJson)).toEqual(usbCElements(original))
  expect(circuitJson.filter((element) => element.type === "pcb_hole")).toEqual(
    original.filter((element) => element.type === "pcb_hole"),
  )

  const drillLayers = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson,
  })
  const originalDrills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: original,
  })
  const drillHits = Object.values(drillLayers)
    .flat()
    .filter((command) => command.command_code === "drill_at")
  const originalDrillHits = Object.values(originalDrills)
    .flat()
    .filter((command) => command.command_code === "drill_at")
  expect(drillHits).toHaveLength(originalDrillHits.length + 8)
  for (const pad of switchPads) {
    expect(drillHits).toContainEqual({
      command_code: "drill_at",
      x: pad.x,
      y: pad.y,
    })
  }
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

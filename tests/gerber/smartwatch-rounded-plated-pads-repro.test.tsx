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

test("repro: Smartwatch variant loses rounded USB-C plated-pad corners", async () => {
  // Unmodified dist/pcb/circuit.json from https://tscircuit.com/anil08607/Smartwatch
  // v1.0.14, release 24553b2a-9ff8-40df-a1a5-6c519167a150.
  // The published board has pill pads. This explicitly modified variant replaces
  // only J1's four outer copper pads with rounded rectangles, keeping its drills.
  const original = (await Bun.file(
    new URL("./assets/smartwatch-v1.0.14.circuit.json", import.meta.url),
  ).json()) as AnyCircuitElement[]
  const mountingPads = original.filter(
    (
      element,
    ): element is Extract<
      AnyCircuitElement,
      { type: "pcb_plated_hole"; shape: "pill" | "oval" }
    > =>
      element.type === "pcb_plated_hole" &&
      element.pcb_component_id === "pcb_component_0" &&
      element.shape === "pill",
  )
  expect(mountingPads).toHaveLength(4)
  expect(
    original.find((element) => element.type === "pcb_board"),
  ).toMatchObject({
    width: 46,
    height: 46,
    num_layers: 4,
  })
  expect(
    original.find(
      (element) =>
        element.type === "source_component" &&
        element.source_component_id === "source_component_0",
    ),
  ).toMatchObject({ name: "J1", manufacturer_part_number: "TYPE-C-31-M-12" })

  const pads = new Circuit()
  pads.add(
    <board width={46} height={46} layers={4}>
      {mountingPads.map((pad) =>
        cloneElement(
          <platedhole
            shape="pill_hole_with_rect_pad"
            holeWidth={pad.hole_width}
            holeHeight={pad.hole_height}
            rectPadWidth={pad.outer_width}
            rectPadHeight={pad.outer_height}
            rectBorderRadius={0.2}
            pcbRotation={pad.ccw_rotation}
            pcbX={pad.x}
            pcbY={pad.y}
          />,
          { key: pad.pcb_plated_hole_id },
        ),
      )}
    </board>,
  )
  const roundedPads = pads
    .getCircuitJson()
    .filter(
      (
        element,
      ): element is Extract<
        AnyCircuitElement,
        { type: "pcb_plated_hole"; shape: "rotated_pill_hole_with_rect_pad" }
      > =>
        element.type === "pcb_plated_hole" &&
        element.shape === "rotated_pill_hole_with_rect_pad",
    )
  expect(roundedPads).toHaveLength(4)

  const circuitJson = original.map((element) => {
    if (element.type !== "pcb_plated_hole" || element.shape !== "pill")
      return element
    const index = mountingPads.indexOf(element)
    if (index === -1) return element
    const rounded = roundedPads[index]
    expect(rounded).toMatchObject({
      shape: "rotated_pill_hole_with_rect_pad",
      rect_border_radius: 0.2,
    })
    // Preserve the real board's IDs, port links, layer span and drill geometry.
    const { outer_width, outer_height, ccw_rotation, ...unchanged } = element
    return {
      ...unchanged,
      shape: rounded.shape,
      hole_shape: rounded.hole_shape,
      pad_shape: rounded.pad_shape,
      hole_ccw_rotation: rounded.hole_ccw_rotation,
      rect_ccw_rotation: rounded.rect_ccw_rotation,
      rect_pad_width: rounded.rect_pad_width,
      rect_pad_height: rounded.rect_pad_height,
      rect_border_radius: rounded.rect_border_radius,
    }
  }) as AnyCircuitElement[]
  expect(
    circuitJson.filter((element, index) => element !== original[index]),
  ).toHaveLength(4)

  const drillLayers = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson,
  })
  const originalDrills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: original,
  })
  expect(Object.keys(drillLayers)).toEqual(Object.keys(originalDrills))
  const drillOutput = Object.fromEntries(
    Object.entries(drillLayers).map(([name, commands]) => {
      const drill = stringifyExcellonDrill(commands)
      const withoutDate = (text: string) =>
        text.replaceAll(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "TIMESTAMP")
      expect(withoutDate(drill)).toBe(
        withoutDate(stringifyExcellonDrill(originalDrills[name])),
      )
      return [name, drill]
    }),
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
      circuitJsonLabel: "Smartwatch variant: J1 pad radius 0.2 mm",
      gerberLabel: "Current Gerber: J1 pad corners become sharp",
      panelWidth: 1200,
      panelHeight: 1200,
    },
  )
})

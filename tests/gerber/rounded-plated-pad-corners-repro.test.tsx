import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import {
  convertCircuitJsonToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const createCircuitJson = (
  radius: number | undefined,
  margin: number,
  width = 3.6,
  height = 2.4,
) => {
  const circuit = new Circuit()
  const padProps = {
    rectPadWidth: width,
    rectPadHeight: height,
    rectBorderRadius: radius,
    solderMaskMargin: margin,
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

  return circuit.getCircuitJson()
}

test("rounded plated-pad corners are preserved in Gerber", async () => {
  const circuitJson = createCircuitJson(0.6, 0.2)
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
      gerberLabel: "Gerber: rounded pad and mask corners",
    },
  )
  for (const flip of [false, true]) {
    for (const [radius, margin, copperRadius, maskRadius] of [
      [0.6, 0.2, 0.6, 0.8],
      [10, 0.2, 1.2, 1.4],
      [0.6, -0.2, 0.6, 0.4],
      [0.6, -0.6, 0.6, 0],
      [0, 0.2, 0, 0],
      [undefined, 0.2, 0, 0],
    ] as const) {
      const commandLayers = convertCircuitJsonToGerberCommands(
        createCircuitJson(radius, margin),
        { flip_y_axis: flip },
      )
      for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
        const expectedRadius = layer.endsWith("_Mask")
          ? maskRadius
          : copperRadius
        const commands = commandLayers[layer]
        const apertures = commands.filter(
          (command) =>
            command.command_code === "ADD" &&
            "macro_name" in command &&
            command.macro_name === "ROUNDRECT",
        )
        expect(apertures).toHaveLength(expectedRadius > 0 ? 2 : 0)
        const output = stringifyGerberCommandLayers({ [layer]: commands })[
          layer
        ]
        expect(output.match(/D03\*/g)).toHaveLength(expectedRadius > 0 ? 3 : 2)
        expect(output.match(/G36\*/g) ?? []).toHaveLength(
          expectedRadius > 0 ? 0 : 1,
        )
        expect(output).not.toContain("%LR")

        for (const [index, aperture] of apertures.entries()) {
          if (
            !("macro_name" in aperture) ||
            aperture.macro_name !== "ROUNDRECT"
          )
            throw new Error("Expected rounded plated-pad aperture")
          expect(aperture.corner_radius).toBeCloseTo(expectedRadius, 10)
          // Expanding or shrinking the mask leaves the corner centers fixed.
          const x = -1.8 + copperRadius
          const y = 1.2 - copperRadius
          const angle = index === 0 ? 0 : (Math.PI / 6) * (flip ? -1 : 1)
          expect(aperture.corner_1_x).toBeCloseTo(
            x * Math.cos(angle) - y * Math.sin(angle),
            10,
          )
          expect(aperture.corner_1_y).toBeCloseTo(
            x * Math.sin(angle) + y * Math.cos(angle),
            10,
          )
        }
      }
    }
  }

  for (const radius of [0, 0.6]) {
    for (const margin of [-1.2, -1.3]) {
      for (const [width, height] of [
        [3.6, 2.4],
        [2.4, 3.6],
      ]) {
        const holes = createCircuitJson(radius, margin, width, height).filter(
          (elm) => elm.type === "pcb_plated_hole",
        )
        for (const hole of holes) {
          expect(() => convertCircuitJsonToGerberCommands([hole])).toThrow(
            `Invalid soldermask opening for plated hole ${hole.pcb_plated_hole_id}: soldermask_margin ${margin} must leave positive width and height`,
          )
          expect(() =>
            convertCircuitJsonToGerberCommands([
              { ...hole, is_covered_with_solder_mask: true },
            ]),
          ).not.toThrow()
        }
      }
    }
  }
})

import { expect, test } from "bun:test"
import type { PcbSmtPad } from "circuit-json"
import { parseGerberFile } from "gerberts"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const pad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pcb_smtpad_0",
  layer: "top",
  x: 0,
  y: 0,
  width: 4,
  height: 2,
} as const

const shapes: PcbSmtPad[] = [
  { ...pad, shape: "circle", radius: 1 },
  { ...pad, shape: "rect" },
  { ...pad, shape: "rect", corner_radius: 0.4 },
  { ...pad, shape: "rect", rect_border_radius: 0.4 },
  { ...pad, shape: "rotated_rect", ccw_rotation: 45 },
  { ...pad, shape: "rotated_rect", ccw_rotation: 45, corner_radius: 0.4 },
  { ...pad, shape: "rotated_rect", ccw_rotation: 45, rect_border_radius: 0.4 },
  { ...pad, shape: "pill", radius: 1 },
  { ...pad, shape: "pill", radius: 1, width: 2, height: 4 },
  { ...pad, shape: "rotated_pill", radius: 1, ccw_rotation: 45 },
  {
    ...pad,
    shape: "rotated_pill",
    radius: 1,
    ccw_rotation: 45,
    width: 2,
    height: 4,
  },
  {
    ...pad,
    shape: "polygon",
    points: [
      { x: -2, y: -1 },
      { x: 2, y: -1 },
      { x: 2, y: 1 },
      { x: -2, y: 1 },
    ],
  },
]

for (const [index, shape] of shapes.entries()) {
  for (const layer of ["top", "bottom"] as const) {
    for (const soldermaskMargin of [0, 0.2]) {
      test(`smtpad coverage: ${shape.shape} case ${index}, ${layer}, margin ${soldermaskMargin}`, () => {
        const exposedPad: PcbSmtPad = {
          ...shape,
          layer,
          soldermask_margin: soldermaskMargin,
        }
        const exposed = stringifyGerberCommandLayers(
          convertSoupToGerberCommands([exposedPad]),
        )
        let copperLayer = "F_Cu"
        let maskLayer = "F_Mask"
        if (layer === "bottom") {
          copperLayer = "B_Cu"
          maskLayer = "B_Mask"
        }
        expect(
          parseGerberFile(exposed[copperLayer]).operations.length,
        ).toBeGreaterThan(0)
        expect(
          parseGerberFile(exposed[maskLayer]).operations.length,
        ).toBeGreaterThan(0)
        for (const covered of [true, false]) {
          const output = stringifyGerberCommandLayers(
            convertSoupToGerberCommands([
              { ...exposedPad, is_covered_with_solder_mask: covered },
            ]),
          )
          expect(parseGerberFile(output[copperLayer]).operations).toEqual(
            parseGerberFile(exposed[copperLayer]).operations,
          )
          expect(
            parseGerberFile(output[copperLayer]).apertureDefinitions,
          ).toEqual(parseGerberFile(exposed[copperLayer]).apertureDefinitions)
          if (covered) {
            expect(parseGerberFile(output[maskLayer]).operations).toHaveLength(
              0,
            )
          } else {
            expect(parseGerberFile(output[maskLayer]).operations).toEqual(
              parseGerberFile(exposed[maskLayer]).operations,
            )
            expect(
              parseGerberFile(output[maskLayer]).apertureDefinitions,
            ).toEqual(parseGerberFile(exposed[maskLayer]).apertureDefinitions)
          }
          expect(parseGerberFile(output.F_Paste).operations).toHaveLength(0)
          expect(parseGerberFile(output.B_Paste).operations).toHaveLength(0)
        }
      })
    }
  }
}

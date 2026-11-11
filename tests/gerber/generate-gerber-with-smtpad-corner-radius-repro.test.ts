import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rounded_rect_pad",
    layer: "top",
    shape: "rotated_rect",
    width: 2.4,
    height: 1.2,
    x: 0,
    y: 0,
    ccw_rotation: 90,
    corner_radius: 0.25,
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("repro: smtpad corner radius does not collapse to a plain rectangular aperture", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "smtpad-corner-radius-repro",
    circuitJson,
    ["F_Cu"],
    {
      backgroundColor: "#111111",
    },
  )

  expect(gerberOutput.F_Cu).not.toMatch(/%ADD\d+R,2\.400000X1\.200000\*%/)
  expect(/ROUNDRECT|RoundRect|G36\*/.test(gerberOutput.F_Cu)).toBe(true)
})

test("smtpad rect_border_radius emits ROUNDRECT copper and soldermask apertures and 0 border radius stays rectangular", () => {
  const rectBorderRadiusOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([
      circuitJson[0],
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "rect_border_pad",
        layer: "top",
        shape: "rotated_rect",
        width: 2.4,
        height: 1.2,
        x: 0,
        y: 0,
        ccw_rotation: 90,
        rect_border_radius: 0.25,
        soldermask_margin: 0.1,
        is_covered_with_solder_mask: false,
      } as AnyCircuitElement,
    ]),
  )

  expect(rectBorderRadiusOutput.F_Cu).toContain("ROUNDRECT,0.25")
  expect(rectBorderRadiusOutput.F_Mask).toContain("ROUNDRECT,0.35")

  const sharpRectWithPositiveMaskMargin = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([
      circuitJson[0],
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "sharp_rect_pad",
        layer: "top",
        shape: "rect",
        width: 2.0,
        height: 1.0,
        x: 0,
        y: 0,
        corner_radius: 0,
        rect_border_radius: 0,
        soldermask_margin: 0.1,
        is_covered_with_solder_mask: false,
      } as AnyCircuitElement,
    ]),
  )

  expect(sharpRectWithPositiveMaskMargin.F_Mask).not.toContain("ROUNDRECT,")
  expect(sharpRectWithPositiveMaskMargin.F_Mask).toMatch(
    /%ADD\d+R,2\.2(?:0*)X1\.2(?:0*)\*%/,
  )
})

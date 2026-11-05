import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const points = [
  { x: 1, y: -2 },
  { x: 3, y: -2 },
  { x: 3, y: 0 },
  { x: 1, y: 0 },
]

const extractRegion = (gerber: string) => {
  const match = gerber.match(/G36\*[\s\S]*?G37\*/)
  return match?.[0] ?? ""
}

const renderPad = (
  pad: Partial<Extract<PcbSmtPad, { shape: "polygon" }>> = {},
) =>
  stringifyGerberCommandLayers(
    convertSoupToGerberCommands([
      {
        type: "pcb_board",
        pcb_board_id: "board",
        center: { x: 0, y: 0 },
        width: 10,
        height: 8,
        num_layers: 2,
        thickness: 1.6,
        material: "fr4",
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: "polygon_pad",
        shape: "polygon",
        layer: "top",
        points,
        ...pad,
      },
    ] as AnyCircuitElement[]),
  )

test("applies soldermask_margin to polygon SMT pad soldermask region while keeping copper outline unchanged", () => {
  const withoutMargin = renderPad()
  const withPositiveMargin = renderPad({ soldermask_margin: 0.2 })
  const withNegativeMargin = renderPad({ soldermask_margin: -0.1 })

  expect(extractRegion(withPositiveMargin.F_Cu)).toBe(
    extractRegion(withoutMargin.F_Cu),
  )
  expect(extractRegion(withNegativeMargin.F_Cu)).toBe(
    extractRegion(withoutMargin.F_Cu),
  )

  expect(extractRegion(withPositiveMargin.F_Mask)).not.toBe(
    extractRegion(withoutMargin.F_Mask),
  )
  expect(extractRegion(withPositiveMargin.F_Mask)).toContain(
    "X000800000Y-02200000",
  )
  expect(extractRegion(withPositiveMargin.F_Mask)).toContain(
    "X003200000Y000200000",
  )

  expect(extractRegion(withNegativeMargin.F_Mask)).not.toBe(
    extractRegion(withoutMargin.F_Mask),
  )
  expect(extractRegion(withNegativeMargin.F_Mask)).toContain(
    "X001100000Y-01900000",
  )
  expect(extractRegion(withNegativeMargin.F_Mask)).toContain(
    "X002900000Y-00100000",
  )
})

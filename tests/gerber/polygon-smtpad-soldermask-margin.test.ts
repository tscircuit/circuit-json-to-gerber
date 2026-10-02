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

// Read the actual serialized region, independently of the offset helper.
const getRegionBounds = (gerber: string) => {
  const region = gerber.match(/G36\*([\s\S]*?)G37\*/)?.[1]
  expect(region).toBeDefined()
  const coordinates = [...region!.matchAll(/X(-?\d+)Y(-?\d+)D0[12]\*/g)]
  expect(coordinates.length).toBe(5)
  const xs = coordinates.map((match) => Number(match[1]) / 1e6)
  const ys = coordinates.map((match) => Number(match[2]) / 1e6)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

for (const layer of ["top", "bottom"] as const) {
  const prefix = layer === "top" ? "F" : "B"
  for (const clockwise of [false, true]) {
    test(`${layer} polygon mask margin expands both windings: clockwise=${clockwise}`, () => {
      const gerber = renderPad({
        layer,
        points: clockwise ? [...points].reverse() : points,
        soldermask_margin: 0.2,
      })
      expect(getRegionBounds(gerber[`${prefix}_Mask`])).toEqual([
        0.8, -2.2, 3.2, 0.2,
      ])
      expect(getRegionBounds(gerber[`${prefix}_Cu`])).toEqual([1, -2, 3, 0])
    })
  }
}

test("negative polygon margin contracts the opening without changing copper", () => {
  const gerber = renderPad({ soldermask_margin: -0.2 })
  expect(getRegionBounds(gerber.F_Mask)).toEqual([1.2, -1.8, 2.8, -0.2])
  expect(getRegionBounds(gerber.F_Cu)).toEqual([1, -2, 3, 0])
})

test("zero and omitted polygon margins retain the original opening", () => {
  for (const pad of [{}, { soldermask_margin: 0 }]) {
    const gerber = renderPad(pad)
    expect(getRegionBounds(gerber.F_Mask)).toEqual([1, -2, 3, 0])
    expect(getRegionBounds(gerber.F_Cu)).toEqual([1, -2, 3, 0])
  }
})

test("covered polygon pad has no mask opening even when a margin is set", () => {
  const gerber = renderPad({
    is_covered_with_solder_mask: true,
    soldermask_margin: 0.2,
  })
  expect(gerber.F_Mask).not.toContain("G36*")
  expect(getRegionBounds(gerber.F_Cu)).toEqual([1, -2, 3, 0])
})

test("polygon margin follows diagonal edges rather than scaling about the origin", () => {
  const gerber = renderPad({
    points: [
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
    ],
    soldermask_margin: Math.SQRT1_2,
  })
  expect(getRegionBounds(gerber.F_Mask)).toEqual([0, -1, 4, 3])
  expect(getRegionBounds(gerber.F_Cu)).toEqual([1, 0, 3, 2])
})

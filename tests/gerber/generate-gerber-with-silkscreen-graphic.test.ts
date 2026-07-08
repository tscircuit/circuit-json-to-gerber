import { test, expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.2,
  num_layers: 2,
  material: "fr4",
}

// pcb_silkscreen_graphic is a filled brep (an outer ring, plus inner rings that
// act as holes). It used to be dropped from the Gerber silkscreen layer.
const graphic = (
  layer: "top" | "bottom",
  innerRings: Array<{ vertices: Array<{ x: number; y: number }> }>,
): AnyCircuitElement =>
  ({
    type: "pcb_silkscreen_graphic",
    pcb_silkscreen_graphic_id: "graphic_0",
    pcb_component_id: "c0",
    layer,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -4, y: -3 },
          { x: 4, y: -3 },
          { x: 4, y: 3 },
          { x: -4, y: 3 },
        ],
      },
      inner_rings: innerRings,
    },
    // Cast through unknown: the exact required fields of pcb_silkscreen_graphic
    // vary across circuit-json versions, and this repo may resolve a version
    // that predates the type.
  }) as unknown as AnyCircuitElement

const silkscreen = (elements: AnyCircuitElement[], layer: "F" | "B"): string =>
  stringifyGerberCommandLayers(convertSoupToGerberCommands(elements))[
    `${layer}_SilkScreen`
  ] ?? ""

const countRegions = (gerber: string): number =>
  (gerber.match(/G36\*/g) ?? []).length

test("pcb_silkscreen_graphic renders as a filled region", () => {
  const gerber = silkscreen([board, graphic("top", [])], "F")
  expect(countRegions(gerber)).toBe(1)
})

test("pcb_silkscreen_graphic inner rings are cut out with clear polarity", () => {
  const gerber = silkscreen(
    [
      board,
      graphic("top", [
        {
          vertices: [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
          ],
        },
      ]),
    ],
    "F",
  )
  // outer ring + one inner (hole) ring
  expect(countRegions(gerber)).toBe(2)
  // the hole is cut with clear polarity, then dark polarity is restored
  expect(gerber.includes("%LPC*%")).toBe(true)
  expect(gerber.includes("%LPD*%")).toBe(true)
})

test("pcb_silkscreen_graphic renders on the bottom silkscreen layer", () => {
  const elements = [board, graphic("bottom", [])]
  expect(countRegions(silkscreen(elements, "B"))).toBe(1)
  expect(countRegions(silkscreen(elements, "F"))).toBe(0)
})

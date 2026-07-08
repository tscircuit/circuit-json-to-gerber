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

// Each silkscreen shape below used to be silently dropped from the Gerber
// output because only pcb_silkscreen_path and _text were handled. A shape is
// "rendered" once it emits at least one draw operation (D01/D02/D03) on the
// top silkscreen layer.
const shapes: Record<string, AnyCircuitElement> = {
  rect: {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "sr",
    pcb_component_id: "c0",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.15,
  } as AnyCircuitElement,
  circle: {
    type: "pcb_silkscreen_circle",
    pcb_silkscreen_circle_id: "sc",
    pcb_component_id: "c0",
    layer: "top",
    center: { x: 0, y: 0 },
    radius: 1.5,
    stroke_width: 0.15,
  } as AnyCircuitElement,
  line: {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "sl",
    pcb_component_id: "c0",
    layer: "top",
    x1: -5,
    y1: -5,
    x2: 5,
    y2: 5,
    stroke_width: 0.15,
  } as AnyCircuitElement,
  oval: {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "so",
    pcb_component_id: "c0",
    layer: "top",
    center: { x: 0, y: 0 },
    radius_x: 3,
    radius_y: 1,
    stroke_width: 0.15,
  } as AnyCircuitElement,
  pill: {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "sp",
    pcb_component_id: "c0",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.15,
  } as AnyCircuitElement,
}

const topSilkscreenGerber = (elements: AnyCircuitElement[]): string =>
  stringifyGerberCommandLayers(convertSoupToGerberCommands(elements))
    .F_SilkScreen ?? ""

const countTopSilkscreenDrawOps = (elements: AnyCircuitElement[]): number =>
  (topSilkscreenGerber(elements).match(/D0[123]\*/g) ?? []).length

const hasRegion = (elements: AnyCircuitElement[]): boolean =>
  /G36\*/.test(topSilkscreenGerber(elements))

const rect = (extra: Record<string, unknown>): AnyCircuitElement =>
  ({
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "sr",
    pcb_component_id: "c0",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.15,
    ...extra,
  }) as AnyCircuitElement

for (const [name, shape] of Object.entries(shapes)) {
  test(`pcb_silkscreen_${name} is rendered to the gerber silkscreen layer`, () => {
    expect(countTopSilkscreenDrawOps([board, shape])).toBeGreaterThan(0)
  })
}

test("a silkscreen rect with has_stroke:false emits no stroke", () => {
  expect(countTopSilkscreenDrawOps([board, rect({ has_stroke: false })])).toBe(
    0,
  )
})

test("a silkscreen rect with is_filled:true emits a filled region", () => {
  const filled = [board, rect({ is_filled: true })]
  expect(hasRegion(filled)).toBe(true)
  // default has_stroke is undefined -> still stroked, so more ops than the
  // region alone.
  const filledNoStroke = [board, rect({ is_filled: true, has_stroke: false })]
  expect(hasRegion(filledNoStroke)).toBe(true)
  expect(countTopSilkscreenDrawOps(filled)).toBeGreaterThan(
    countTopSilkscreenDrawOps(filledNoStroke),
  )
})

test("a silkscreen rect with corner_radius renders rounded (arc) corners", () => {
  const sharp = countTopSilkscreenDrawOps([
    board,
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "sharp",
      pcb_component_id: "c0",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      stroke_width: 0.15,
    } as AnyCircuitElement,
  ])
  const rounded = countTopSilkscreenDrawOps([
    board,
    {
      type: "pcb_silkscreen_rect",
      pcb_silkscreen_rect_id: "rounded",
      pcb_component_id: "c0",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      corner_radius: 0.5,
      stroke_width: 0.15,
    } as AnyCircuitElement,
  ])
  // Rounded corners are drawn as arc segments, so a rounded rect emits many
  // more draw ops than the 4-sided sharp rect.
  expect(rounded).toBeGreaterThan(sharp)
})

test("silkscreen shapes render on the bottom silkscreen layer", () => {
  const layers = stringifyGerberCommandLayers(
    convertSoupToGerberCommands([
      board,
      {
        type: "pcb_silkscreen_circle",
        pcb_silkscreen_circle_id: "sc_bottom",
        pcb_component_id: "c0",
        layer: "bottom",
        center: { x: 0, y: 0 },
        radius: 1.5,
        stroke_width: 0.15,
      } as AnyCircuitElement,
    ]),
  )
  const bottomDraws = (layers.B_SilkScreen?.match(/D0[123]\*/g) ?? []).length
  const topDraws = (layers.F_SilkScreen?.match(/D0[123]\*/g) ?? []).length
  expect(bottomDraws).toBeGreaterThan(0)
  expect(topDraws).toBe(0)
})

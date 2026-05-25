import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const baseBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 10,
  num_layers: 2,
} as const

const topCircuitJson = [
  baseBoard,
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_knockout_text_top",
    text: "knockout",
    font: "tscircuit2024",
    font_size: 2.5,
    layer: "top",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    is_knockout: true,
    knockout_padding: {
      left: 0.6,
      right: 0.6,
      top: 0.4,
      bottom: 0.4,
    },
  } as AnyCircuitElement,
] as AnyCircuitElement[]

const bottomCircuitJson = [
  baseBoard,
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_knockout_text_bottom",
    text: "bottom",
    font: "tscircuit2024",
    font_size: 2.3,
    layer: "bottom",
    anchor_position: { x: 0, y: 0 },
    anchor_alignment: "center",
    is_knockout: true,
    knockout_padding: {
      left: 0.5,
      right: 0.5,
      top: 0.35,
      bottom: 0.35,
    },
  } as AnyCircuitElement,
] as AnyCircuitElement[]

const expectKnockoutPolarity = (gerberLayer?: string) => {
  expect(gerberLayer).toContain("%LPC*%")
  expect((gerberLayer?.match(/%LPD\*%/g) ?? []).length).toBeGreaterThan(1)
}

test("repro: silkscreen knockout emits clear polarity around text", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(topCircuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "silkscreen-knockout-repro",
    topCircuitJson,
    ["F_SilkScreen"],
    {
      colors: {
        F_SilkScreen: "#f3f3f3",
      },
      backgroundColor: "#111111",
    },
  )

  expectKnockoutPolarity(gerberOutput.F_SilkScreen)
})

test("repro: bottom silkscreen knockout emits clear polarity around text", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(bottomCircuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "silkscreen-knockout-repro-bottom",
    bottomCircuitJson,
    ["B_SilkScreen"],
    {
      colors: {
        B_SilkScreen: "#f3f3f3",
      },
      backgroundColor: "#111111",
    },
  )

  expectKnockoutPolarity(gerberOutput.B_SilkScreen)
})

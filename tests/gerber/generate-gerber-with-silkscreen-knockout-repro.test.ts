import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    num_layers: 2,
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silk_knockout_text",
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

test("silkscreen knockout emits clear polarity around text", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "silkscreen-knockout-repro",
    circuitJson,
    ["F_SilkScreen"],
    {
      colors: {
        F_SilkScreen: "#f3f3f3",
      },
      backgroundColor: "#111111",
    },
  )

  expect(gerberOutput.F_SilkScreen).toContain("%LPC*%")
  expect((gerberOutput.F_SilkScreen.match(/%LPD\*%/g) ?? []).length).toBe(2)
})

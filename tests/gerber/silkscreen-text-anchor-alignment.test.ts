import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSilkscreenText } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const anchorAlignments = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
] as const

type AnchorAlignment = (typeof anchorAlignments)[number]

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 52,
  height: 30,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const silkscreenText = (
  anchorAlignment: AnchorAlignment,
  anchorPosition = { x: 0, y: 0 },
  props: Partial<PcbSilkscreenText> = {},
): PcbSilkscreenText => ({
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: `text_${anchorAlignment}`,
  pcb_component_id: "",
  font: "tscircuit2024",
  font_size: 1,
  text: "TEXT",
  layer: "top",
  anchor_position: anchorPosition,
  anchor_alignment: anchorAlignment,
  ...props,
})

/** Bounds (board frame, mm, +Y up) of every point drawn on F_SilkScreen */
const getTopSilkscreenInkBounds = (circuitJson: AnyCircuitElement[]) => {
  const points = convertSoupToGerberCommands(circuitJson)
    .F_SilkScreen.filter(
      (command) =>
        command.command_code === "D01" || command.command_code === "D02",
    )
    .map((command) => command as unknown as { x: number; y: number })
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

const TOLERANCE = 1e-6

test("silkscreen text ink sits on the anchor_alignment side of the anchor", () => {
  for (const anchorAlignment of anchorAlignments) {
    const ink = getTopSilkscreenInkBounds([
      board,
      silkscreenText(anchorAlignment),
    ])
    const [vertical, horizontal = "center"] =
      anchorAlignment === "center" ? ["center"] : anchorAlignment.split("_")

    // The anchor is at (0, 0): "left" puts the ink to its right, "top" puts
    // the ink below it, "center" straddles it.
    if (horizontal === "left") expect(ink.minX).toBeGreaterThan(-TOLERANCE)
    if (horizontal === "right") expect(ink.maxX).toBeLessThan(TOLERANCE)
    if (horizontal === "center") {
      expect(ink.minX).toBeLessThan(0)
      expect(ink.maxX).toBeGreaterThan(0)
    }
    if (vertical === "top") expect(ink.maxY).toBeLessThan(TOLERANCE)
    if (vertical === "bottom") expect(ink.minY).toBeGreaterThan(-TOLERANCE)
    if (vertical === "center") {
      expect(ink.minY).toBeLessThan(0)
      expect(ink.maxY).toBeGreaterThan(0)
    }
  }
})

test("silkscreen text knockout padding is applied to the named sides", () => {
  const knockoutText = silkscreenText(
    "bottom_left",
    { x: 0, y: 0 },
    {
      is_knockout: true,
      knockout_padding: { left: 0.1, right: 0.2, top: 0.8, bottom: 0.4 },
    },
  )

  const ink = getTopSilkscreenInkBounds([board, knockoutText])
  const textBox = getTopSilkscreenInkBounds([
    board,
    silkscreenText("bottom_left"),
  ])

  // The knockout region is the outermost copper of the layer; the text box
  // for "TEXT" starts at the anchor and is 0.7 * font_size tall.
  expect(ink.minX).toBeCloseTo(-0.1, 6)
  expect(ink.minY).toBeCloseTo(-0.4, 6)
  expect(ink.maxY).toBeCloseTo(0.7 + 0.8, 6)
  expect(ink.maxX).toBeGreaterThan(textBox.maxX)
})

test("Gerber silkscreen text alignment matches the PCB viewer", async () => {
  const circuitJson: AnyCircuitElement[] = [board]
  anchorAlignments.forEach((anchorAlignment, index) => {
    const anchorPosition = {
      x: ((index % 3) - 1) * 16,
      y: (1 - Math.floor(index / 3)) * 8,
    }
    circuitJson.push(
      silkscreenText(anchorAlignment, anchorPosition, {
        pcb_silkscreen_text_id: `label_${anchorAlignment}`,
        text: anchorAlignment,
      }),
      {
        type: "pcb_silkscreen_path",
        pcb_silkscreen_path_id: `anchor_cross_h_${anchorAlignment}`,
        pcb_component_id: "",
        layer: "top",
        stroke_width: 0.05,
        route: [
          { x: anchorPosition.x - 1, y: anchorPosition.y },
          { x: anchorPosition.x + 1, y: anchorPosition.y },
        ],
      },
      {
        type: "pcb_silkscreen_path",
        pcb_silkscreen_path_id: `anchor_cross_v_${anchorAlignment}`,
        pcb_component_id: "",
        layer: "top",
        stroke_width: 0.05,
        route: [
          { x: anchorPosition.x, y: anchorPosition.y - 1 },
          { x: anchorPosition.x, y: anchorPosition.y + 1 },
        ],
      },
    )
  })

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "silkscreen-text-anchor-alignment",
    circuitJson,
    ["F_SilkScreen"],
    {
      colors: { F_SilkScreen: "#f6f36b" },
      backgroundColor: "#1b3a24",
      circuitJsonLabel: "PCB viewer (circuit-to-svg)",
      gerberLabel: "Gerber render",
      panelWidth: 520,
      panelHeight: 400,
    },
  )
})

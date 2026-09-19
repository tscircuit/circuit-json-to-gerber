import { expect, test } from "bun:test"
import { strokeWidthRatio } from "@tscircuit/alphabet"
import type { AnyCircuitElement, PcbSilkscreenText } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

type PcbSilkscreenTextWithVisibility = PcbSilkscreenText & {
  is_hidden?: boolean
}

const createSilkscreenText = ({
  id,
  text,
  fontSize,
  x,
  isHidden,
}: {
  id: string
  text: string
  fontSize: number
  x: number
  isHidden?: boolean
}): PcbSilkscreenTextWithVisibility => ({
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: id,
  pcb_component_id: "pcb_component_0",
  text,
  font: "tscircuit2024",
  font_size: fontSize,
  layer: "top",
  anchor_position: { x, y: 0 },
  anchor_alignment: "center",
  ...(isHidden === undefined ? {} : { is_hidden: isHidden }),
})

const getFrontSilkscreenCommands = (circuitJson: AnyCircuitElement[]) =>
  convertCircuitJsonToGerberCommands(circuitJson).F_SilkScreen

const withoutCreationMetadata = (
  commands: ReturnType<typeof getFrontSilkscreenCommands>,
) =>
  commands.filter((command) => {
    if (
      command.command_code === "TF" &&
      command.attribute_name === "CreationDate"
    ) {
      return false
    }
    if (
      command.command_code === "G04" &&
      command.comment.startsWith("Created by tscircuit")
    ) {
      return false
    }
    return true
  })

test("hidden silkscreen text emits no Gerber apertures or geometry", () => {
  const emptyCommands = getFrontSilkscreenCommands([])
  const hiddenCommands = getFrontSilkscreenCommands([
    createSilkscreenText({
      id: "pcb_silkscreen_text_hidden",
      text: "SHOULD NOT APPEAR",
      fontSize: 7.123,
      x: 42,
      isHidden: true,
    }),
  ])

  expect(withoutCreationMetadata(hiddenCommands)).toEqual(
    withoutCreationMetadata(emptyCommands),
  )
  expect(
    hiddenCommands.some(
      (command) =>
        command.command_code === "ADD" &&
        "diameter" in command &&
        command.diameter === 7.123 * strokeWidthRatio,
    ),
  ).toBe(false)
  expect(
    hiddenCommands.some(
      (command) =>
        command.command_code === "D01" || command.command_code === "D02",
    ),
  ).toBe(false)
})

test.each([
  ["is_hidden is false", false],
  ["is_hidden is omitted", undefined],
] as const)("visible silkscreen text emits when %s", (_, isHidden) => {
  const fontSize = isHidden === false ? 1.25 : 1.75
  const commands = getFrontSilkscreenCommands([
    createSilkscreenText({
      id: `pcb_silkscreen_text_${isHidden === false ? "false" : "omitted"}`,
      text: "VISIBLE",
      fontSize,
      x: isHidden === false ? -5 : 5,
      isHidden,
    }),
  ])

  expect(
    commands.some(
      (command) =>
        command.command_code === "ADD" &&
        "diameter" in command &&
        command.diameter === fontSize * strokeWidthRatio,
    ),
  ).toBe(true)
  expect(
    commands.some(
      (command) =>
        command.command_code === "D01" || command.command_code === "D02",
    ),
  ).toBe(true)
})

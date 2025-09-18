import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

import type { AnyExcellonDrillCommand } from "src/excellon-drill/any-excellon-drill-command-map"

const getDrillCommands = (commands: AnyExcellonDrillCommand[]) =>
  commands.filter(
    (
      command,
    ): command is Extract<
      AnyExcellonDrillCommand,
      { command_code: "drill_at" }
    > => command.command_code === "drill_at",
  )

const buildRectPadPlatedHoles = () => {
  const circular = {
    type: "pcb_plated_hole",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    hole_diameter: 0.8,
    rect_pad_width: 1.2,
    rect_pad_height: 1.4,
    hole_offset_x: 0.25,
    hole_offset_y: -0.15,
    x: 5,
    y: -3,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "hole_circular_rect_pad",
  } satisfies Record<string, unknown>

  const pill = {
    type: "pcb_plated_hole",
    shape: "pill_hole_with_rect_pad",
    hole_shape: "pill",
    pad_shape: "rect",
    hole_width: 2,
    hole_height: 1,
    rect_pad_width: 3,
    rect_pad_height: 3,
    hole_offset_x: -0.1,
    hole_offset_y: 0.2,
    x: 1,
    y: 1,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "hole_pill_rect_pad",
  } satisfies Record<string, unknown>

  const rotated = {
    type: "pcb_plated_hole",
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    pad_shape: "rect",
    hole_width: 1,
    hole_height: 3,
    hole_ccw_rotation: 0,
    rect_pad_width: 3.5,
    rect_pad_height: 2.5,
    rect_ccw_rotation: 0,
    hole_offset_x: 0.2,
    hole_offset_y: 0.3,
    x: -2,
    y: 4,
    layers: ["top", "bottom"],
    pcb_plated_hole_id: "hole_rotated_pill_rect_pad",
  } satisfies Record<string, unknown>

  return { circular, pill, rotated }
}

test("circular hole with rect pad applies hole offsets", () => {
  const { circular: hole } = buildRectPadPlatedHoles()
  const commands = convertSoupToExcellonDrillCommands({
    circuitJson: [hole as unknown as AnyCircuitElement],
    is_plated: true,
  })

  const drillCommands = getDrillCommands(commands)

  expect(drillCommands).toHaveLength(1)
  expect(drillCommands[0]).toEqual({
    command_code: "drill_at",
    x: 5.25,
    y: -3.15,
  })
})

test("pill hole with rect pad applies offsets to slot path", () => {
  const { pill: hole } = buildRectPadPlatedHoles()
  const commands = convertSoupToExcellonDrillCommands({
    circuitJson: [hole as unknown as AnyCircuitElement],
    is_plated: true,
  })

  const drillCommands = getDrillCommands(commands)

  expect(drillCommands).toHaveLength(2)
  expect(drillCommands[0]).toEqual({
    command_code: "drill_at",
    x: 0.4,
    y: 1.2,
  })
  expect(drillCommands[1]).toEqual({
    command_code: "drill_at",
    x: 1.4,
    y: 1.2,
  })
})

test("rotated pill hole with rect pad applies offsets when flipped", () => {
  const { rotated: hole } = buildRectPadPlatedHoles()
  const commands = convertSoupToExcellonDrillCommands({
    circuitJson: [hole as unknown as AnyCircuitElement],
    is_plated: true,
    flip_y_axis: true,
  })

  const drillCommands = getDrillCommands(commands)

  expect(drillCommands).toHaveLength(2)
  expect(drillCommands[0]).toEqual({
    command_code: "drill_at",
    x: -1.8,
    y: -3.3,
  })
  expect(drillCommands[1]).toEqual({
    command_code: "drill_at",
    x: -1.8,
    y: -5.3,
  })
})

test("circular plated hole with rect pad produces expected gerber snapshot", async () => {
  const { circular } = buildRectPadPlatedHoles()
  const board = {
    type: "pcb_board",
    pcb_board_id: "rect_pad_offset_board",
    center: { x: 0, y: 0 },
    width: 12,
    height: 12,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  } satisfies Record<string, unknown>

  const soup = [
    board as unknown as AnyCircuitElement,
    circular as unknown as AnyCircuitElement,
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(soup),
  )

  const drillOutput = stringifyExcellonDrill(
    convertSoupToExcellonDrillCommands({
      circuitJson: soup,
      is_plated: true,
    }),
  )

  await expect({
    ...gerberOutput,
    "plated-holes.drl": drillOutput,
  }).toMatchGerberSnapshot(import.meta.path, "circular-rect-pad-offset")
})

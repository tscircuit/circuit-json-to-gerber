import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { convertSoupToExcellonDrillCommands } from "src/excellon-drill"

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

test("circular hole with rect pad applies hole offsets", () => {
  const hole = {
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
  const hole = {
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
  const hole = {
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

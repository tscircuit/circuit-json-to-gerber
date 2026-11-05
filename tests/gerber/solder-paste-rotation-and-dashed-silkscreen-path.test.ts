import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber/convert-soup-to-gerber-commands"

test("rotates oval solder paste and negates solder paste load_rotation when flip_y_axis is true", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "ph_oval_1",
      shape: "oval",
      x: 0,
      y: 0,
      outer_width: 4,
      outer_height: 2,
      hole_width: 2,
      hole_height: 1,
      ccw_rotation: 90,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "sp_oval_1",
      shape: "oval",
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      ccw_rotation: 90,
      layer: "top",
    } as any,
    {
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "sp_rot_rect_1",
      shape: "rotated_rect",
      x: 5,
      y: 2,
      width: 2,
      height: 1,
      ccw_rotation: 30,
      layer: "top",
    },
  ]

  const commands = convertCircuitJsonToGerberCommands(circuitJson, {
    flip_y_axis: true,
  })
  const pastePlotPoints = commands.F_Paste.filter(
    (cmd): cmd is Extract<typeof cmd, { command_code: "D01" }> =>
      cmd.command_code === "D01",
  )
  // A 4x2 oval rotated 90° around (0, 0) spans x in [-1, 1] and y in [-2, 2]
  const maxAbsX = Math.max(...pastePlotPoints.map((pt) => Math.abs(pt.x)))
  const maxAbsY = Math.max(...pastePlotPoints.map((pt) => Math.abs(pt.y)))
  expect(maxAbsX).toBeCloseTo(1, 3)
  expect(maxAbsY).toBeCloseTo(2, 3)

  const loadRotationCmds = commands.F_Paste.filter(
    (cmd): cmd is Extract<typeof cmd, { command_code: "LR" }> =>
      cmd.command_code === "LR",
  )
  expect(loadRotationCmds[0]?.rotation_degrees).toBe(-30)
})

test("renders dashed pcb_silkscreen_path with dash-gap segments", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "ss_dashed_1",
      pcb_component_id: "comp_0",
      layer: "top",
      stroke_width: 0.15,
      is_stroke_dashed: true,
      route: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ],
    } as any,
  ]

  const commands = convertCircuitJsonToGerberCommands(circuitJson)
  const moveCommands = commands.F_SilkScreen.filter(
    (cmd) => cmd.command_code === "D02",
  )
  const plotCommands = commands.F_SilkScreen.filter(
    (cmd) => cmd.command_code === "D01",
  )
  expect(moveCommands.length).toBeGreaterThan(2)
  expect(plotCommands.length).toBeGreaterThan(2)
})

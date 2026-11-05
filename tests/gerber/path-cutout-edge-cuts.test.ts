import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

test("exports path pcb_cutout elements onto Edge_Cuts and avoids duplicate closing segment on pre-closed polygon cutouts", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_path_0",
      shape: "path",
      route: [
        { x: -4, y: 2 },
        { x: 0, y: 2 },
        { x: 4, y: -2 },
      ],
    } as AnyCircuitElement,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_closed_poly_0",
      shape: "polygon",
      points: [
        { x: -2, y: -2 },
        { x: 2, y: -2 },
        { x: 0, y: -4 },
        { x: -2, y: -2 },
      ],
    } as AnyCircuitElement,
  ]

  const commands = convertCircuitJsonToGerberCommands(circuitJson, {
    flip_y_axis: true,
  })
  const edgeCutOps = commands.Edge_Cuts.filter(
    (cmd) =>
      cmd.command_code === "D02" ||
      cmd.command_code === "D01" ||
      ("x" in cmd && "y" in cmd),
  )

  // Path cutout points (with flipped Y) must be present on Edge_Cuts
  expect(edgeCutOps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ command_code: "D02", x: -4, y: -2 }),
      expect.objectContaining({ command_code: "D01", x: 0, y: -2 }),
      expect.objectContaining({ command_code: "D01", x: 4, y: 2 }),
    ]),
  )

  // Pre-closed polygon cutout has 3 edges (1 D02 move + 3 D01 plots, not 4 D01 plots)
  const polyStartIdx = edgeCutOps.findIndex(
    (cmd) => "x" in cmd && cmd.x === -2 && cmd.y === 2,
  )
  expect(polyStartIdx).toBeGreaterThanOrEqual(0)
  const polyOps = edgeCutOps.slice(polyStartIdx, polyStartIdx + 5)
  expect(polyOps.slice(0, 4)).toEqual([
    expect.objectContaining({ command_code: "D02", x: -2, y: 2 }),
    expect.objectContaining({ command_code: "D01", x: 0, y: 4 }),
    expect.objectContaining({ command_code: "D01", x: 2, y: 2 }),
    expect.objectContaining({ command_code: "D01", x: -2, y: 2 }),
  ])
})

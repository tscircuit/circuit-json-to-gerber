import { expect, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import { board, rectangle, polygon } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

test.each([false, true])(
  "uses each stiffener's pcb_board_id when exporting two boards with flip_y_axis=%s",
  (flipY) => {
    const firstBoard: PcbBoard = { ...board, center: { x: 30, y: -10 } }
    const secondBoard: PcbBoard = {
      ...board,
      pcb_board_id: "pcb_board_1",
      center: { x: -40, y: 20 },
    }
    const commands = convertCircuitJsonToGerberCommands(
      [
        // List the second owner first to catch accidental first-board lookup.
        secondBoard,
        firstBoard,
        rectangle,
        {
          ...polygon,
          pcb_board_id: secondBoard.pcb_board_id,
          layer: "bottom",
          material: "polyimide",
        },
      ],
      { flip_y_axis: flipY },
    ).B_Stiffener_polyimide
    const outline = commands.flatMap((command) =>
      command.command_code === "D02" || command.command_code === "D01"
        ? [[command.x, command.y]]
        : [],
    )
    const vertices = [
      [29, -16],
      [31, -16],
      [31, -18],
      [29, -18],
      [29, -16],
      [-35, 24],
      [-32, 24],
      [-32, 26],
      [-34, 27],
      [-35, 26],
      [-35, 24],
    ]
    expect(outline).toHaveLength(vertices.length)
    outline.forEach(([x, y], index) => {
      expect(x).toBeCloseTo(vertices[index][0], 6)
      expect(y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
    })
  },
)

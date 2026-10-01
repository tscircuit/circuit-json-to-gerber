import { expect, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import { board, rectangle, polygon } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

test.each([false, true])(
  "translates rotated rectangles and polygons from an off-origin board before flip_y_axis=%s",
  (flipY) => {
    const offsetBoard: PcbBoard = { ...board, center: { x: 30, y: -10 } }
    const commands = convertCircuitJsonToGerberCommands(
      [
        offsetBoard,
        {
          ...rectangle,
          center: { x: 3, y: 7 },
          width: 4,
          height: 2,
          rotation: 90,
        },
        polygon,
      ],
      { flip_y_axis: flipY },
    )
    const expectedOutlines = {
      B_Stiffener_polyimide: [
        [32, -5],
        [32, -1],
        [34, -1],
        [34, -5],
        [32, -5],
      ],
      F_Stiffener_fr4: [
        [35, -6],
        [38, -6],
        [38, -4],
        [36, -3],
        [35, -4],
        [35, -6],
      ],
    }
    for (const [layerName, vertices] of Object.entries(expectedOutlines)) {
      const outline = commands[layerName].flatMap((command) =>
        command.command_code === "D02" || command.command_code === "D01"
          ? [[command.x, command.y]]
          : [],
      )
      expect(outline).toHaveLength(vertices.length)
      outline.forEach(([x, y], index) => {
        expect(x).toBeCloseTo(vertices[index][0], 6)
        expect(y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
      })
    }
  },
)

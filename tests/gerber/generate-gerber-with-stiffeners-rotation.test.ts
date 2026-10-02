import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { board, rectangle } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

test.each(["top", "bottom"] as const)(
  "rotates rectangles on %s in the flat board's top view before flipping Y",
  (layer) => {
    const circuitJson: AnyCircuitElement[] = [
      board,
      {
        ...rectangle,
        layer,
        center: { x: 3, y: 7 },
        width: 4,
        height: 2,
        rotation: 90,
      },
    ]
    const layerName = `${layer === "top" ? "F" : "B"}_Stiffener_polyimide`

    for (const flipY of [false, true]) {
      const commands = convertCircuitJsonToGerberCommands(circuitJson, {
        flip_y_axis: flipY,
      })[layerName]
      const outline = commands.filter(
        (command) =>
          command.command_code === "D02" || command.command_code === "D01",
      )
      const vertices = [
        [2, 5],
        [2, 9],
        [4, 9],
        [4, 5],
        [2, 5],
      ]
      expect(outline).toHaveLength(vertices.length)
      outline.forEach((command, index) => {
        if (command.command_code !== "D02" && command.command_code !== "D01") {
          throw new Error("Expected an outline coordinate")
        }
        expect(command.x).toBeCloseTo(vertices[index][0], 6)
        expect(command.y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
      })
    }
  },
)

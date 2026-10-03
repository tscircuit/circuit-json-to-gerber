import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const createCircuit = (rotation: number, withBoard: boolean) => {
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_cutout",
      pcb_cutout_id: "rounded_cutout",
      shape: "rect",
      center: { x: 3, y: 4 },
      width: 8,
      height: 6,
      corner_radius: 1,
      rotation,
    },
  ]
  if (withBoard) {
    circuit.unshift({
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    })
  }
  return circuit
}

for (const flip_y_axis of [false, true]) {
  for (const rotation of [0, 30]) {
    for (const withBoard of [false, true]) {
      test(`rounded cutout corners stay quarter circles: flip=${flip_y_axis}, rotation=${rotation}, board=${withBoard}`, () => {
        const commands = convertCircuitJsonToGerberCommands(
          createCircuit(rotation, withBoard),
          { flip_y_axis },
        ).Edge_Cuts
        let previous = { x: 0, y: 0 }
        let clockwise = false
        let arcCount = 0
        for (const command of commands) {
          if (command.command_code === "G02") clockwise = true
          if (command.command_code === "G03") clockwise = false
          if (
            command.command_code !== "D01" &&
            command.command_code !== "D02"
          ) {
            continue
          }
          const point = { x: command.x, y: command.y }
          if (
            command.command_code === "D01" &&
            command.i !== undefined &&
            command.j !== undefined
          ) {
            const center = {
              x: previous.x + command.i,
              y: previous.y + command.j,
            }
            const start = Math.atan2(
              previous.y - center.y,
              previous.x - center.x,
            )
            const end = Math.atan2(point.y - center.y, point.x - center.x)
            const angle = clockwise ? start - end : end - start
            const sweep =
              ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
            expect(Math.hypot(command.i, command.j)).toBeCloseTo(1, 8)
            expect(sweep).toBeCloseTo(Math.PI / 2, 8)
            arcCount++
          }
          previous = point
        }
        expect(arcCount).toBe(4)
      })
    }
  }
}

test("reflected rounded cutout Gerber geometry", async () => {
  const layers = convertCircuitJsonToGerberCommands(createCircuit(30, true), {
    flip_y_axis: true,
  })
  await expect(
    stringifyGerberCommandLayers(layers),
  ).toMatchGerberLayerSnapshots(import.meta.path, "rounded-cutout-y-flip", [
    "Edge_Cuts",
  ])
})

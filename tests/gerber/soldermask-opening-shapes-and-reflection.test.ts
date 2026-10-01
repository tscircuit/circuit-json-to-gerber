import { expect, test } from "bun:test"
import { pcb_soldermask_opening } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { flexBoard, regionPoints } from "tests/fixtures/soldermask-opening"

test("circles and rotated rectangles select the face and reflect after rotation", async () => {
  for (const layer of ["top", "bottom"] as const) {
    const mask = layer === "top" ? "F_Mask" : "B_Mask"
    const otherMask = layer === "top" ? "B_Mask" : "F_Mask"
    const openings = [
      pcb_soldermask_opening.parse({
        type: "pcb_soldermask_opening",
        shape: "circle",
        layer,
        x: 98,
        y: -72,
        radius: 0.75,
      }),
      pcb_soldermask_opening.parse({
        type: "pcb_soldermask_opening",
        shape: "rotated_rect",
        layer,
        x: 101,
        y: -69,
        width: 4,
        height: 2,
        ccw_rotation: 30,
      }),
    ]
    const original = structuredClone(openings)
    for (const flip_y_axis of [false, true]) {
      const sign = flip_y_axis ? -1 : 1
      const circuitJson = [flexBoard, ...openings]
      const commands = convertCircuitJsonToGerberCommands(circuitJson, {
        flip_y_axis,
      })
      expect(commands[mask]).toContainEqual({
        command_code: "D03",
        x: 98,
        y: -72 * sign,
      })
      // Independent 30-degree probes of a 4x2 rectangle around (101,-69).
      const expected = [
        { x: 101 - Math.sqrt(3) - 0.5, y: -70 + Math.sqrt(3) / 2 },
        { x: 101 + Math.sqrt(3) - 0.5, y: -68 + Math.sqrt(3) / 2 },
        { x: 101 + Math.sqrt(3) + 0.5, y: -68 - Math.sqrt(3) / 2 },
        { x: 101 - Math.sqrt(3) + 0.5, y: -70 - Math.sqrt(3) / 2 },
      ]
      const actual = regionPoints(commands[mask])
      expect(actual).toHaveLength(5)
      for (let i = 0; i < actual.length; i++) {
        expect(actual[i].x).toBeCloseTo(expected[i % 4].x, 8)
        expect(actual[i].y).toBeCloseTo(expected[i % 4].y * sign, 8)
      }
      expect(regionPoints(commands[otherMask])).toEqual([])
      const files = convertCircuitJsonToGerberFiles(circuitJson, {
        flip_y_axis,
      })
      expect(files[`${mask}.gbr`]).toContain("C,1.500000*%")
      if (!flip_y_axis) {
        await expect({
          [mask]: files[`${mask}.gbr`],
          Edge_Cuts: files["Edge_Cuts.gbr"],
        }).toMatchGerberLayerSnapshots(
          import.meta.path,
          `soldermask-opening-${layer}`,
          [mask],
        )
      }
    }
    expect(openings).toEqual(original)
  }
})

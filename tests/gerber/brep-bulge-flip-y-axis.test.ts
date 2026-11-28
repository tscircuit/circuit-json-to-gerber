import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"

test("preserves BRep bulge arc center under flip_y_axis reflection", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_rounded_corner",
      layer: "top",
      shape: "brep",
      covered_with_solder_mask: false,
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -5, y: 5 },
            { x: 3, y: 5, bulge: -(Math.SQRT2 - 1) },
            { x: 5, y: 3 },
            { x: 5, y: -5 },
            { x: -5, y: -5 },
          ],
        },
        inner_rings: [],
      },
    },
  ]

  const unflipped = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis: false,
  })
  const flipped = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis: true,
  })

  const unflippedArc = unflipped.F_Cu.find(
    (cmd): cmd is Extract<typeof cmd, { command_code: "D01" }> =>
      cmd.command_code === "D01" && "i" in cmd && cmd.i !== undefined,
  )
  const flippedArc = flipped.F_Cu.find(
    (cmd): cmd is Extract<typeof cmd, { command_code: "D01" }> =>
      cmd.command_code === "D01" && "i" in cmd && cmd.i !== undefined,
  )
  const flippedMaskArc = flipped.F_Mask.find(
    (cmd): cmd is Extract<typeof cmd, { command_code: "D01" }> =>
      cmd.command_code === "D01" && "i" in cmd && cmd.i !== undefined,
  )

  expect(unflippedArc).toBeDefined()
  expect(flippedArc).toBeDefined()
  expect(flippedMaskArc).toBeDefined()

  // Unflipped arc starts at (5, 3), ends at (3, 5), center at (3, 3) => i = -2, j = 0
  expect(unflippedArc?.x).toBeCloseTo(3, 6)
  expect(unflippedArc?.y).toBeCloseTo(5, 6)
  expect(unflippedArc?.i).toBeCloseTo(-2, 6)
  expect(unflippedArc?.j).toBeCloseTo(0, 6)

  // Y-flipped arc starts at (5, -3), ends at (3, -5), center at (3, -3) => i = -2, j = 0
  expect(flippedArc?.x).toBeCloseTo(3, 6)
  expect(flippedArc?.y).toBeCloseTo(-5, 6)
  expect(flippedArc?.i).toBeCloseTo(-2, 6)
  expect(flippedArc?.j).toBeCloseTo(0, 6)

  expect(flippedMaskArc?.i).toBeCloseTo(-2, 6)
  expect(flippedMaskArc?.j).toBeCloseTo(0, 6)
})

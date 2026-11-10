import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

/**
 * A slot that runs to the board edge and ends exactly on it (it does not extend
 * past the edge) is physically a notch in the board outline.
 *
 * It must be merged into the outer Edge.Cuts contour. If it is emitted as a
 * separate closed loop that shares a segment with the board edge, fab CAM tools
 * (seen with JLCPCB's gerber viewer) read the area as solid board and the slot
 * is not milled.
 */
const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 50,
    height: 40,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  // Slot from the bottom edge (y = -20) up to y = -10, flush with the edge
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_edge_flush_slot",
    shape: "polygon",
    points: [
      { x: -1, y: -20 },
      { x: 1, y: -20 },
      { x: 1, y: -10 },
      { x: -1, y: -10 },
    ],
  } as AnyCircuitElement,
  // A cutout fully inside the board must stay a separate closed loop
  {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_internal",
    shape: "rect",
    center: { x: 15, y: 10 },
    width: 4,
    height: 2,
  } as AnyCircuitElement,
]

const getEdgeCutsContours = () => {
  const gerberLayers = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  const contours: Array<Array<{ x: number; y: number }>> = []
  let x = 0
  let y = 0
  for (const match of gerberLayers.Edge_Cuts.matchAll(
    /^(?:X(-?\d+))?(?:Y(-?\d+))?D0([12])\*$/gm,
  )) {
    if (match[1] !== undefined) x = Number(match[1]) / 1e6
    if (match[2] !== undefined) y = Number(match[2]) / 1e6
    if (match[3] === "2") contours.push([])
    contours[contours.length - 1]!.push({ x, y })
  }
  return contours
}

test("cutout flush with the board edge is merged into the board outline", () => {
  const contours = getEdgeCutsContours()

  // One contour for the board outline (with the notch) and one for the internal cutout
  expect(contours.length).toBe(2)

  const outline = contours.find((contour) =>
    contour.some((point) => Math.abs(point.x) === 25),
  )!
  expect(outline).toBeDefined()

  // The outline itself goes up into the notch
  expect(
    outline.some((point) => Math.abs(point.x) === 1 && point.y === -10),
  ).toBe(true)

  // No contour may be a standalone slot loop lying on the board edge
  const standaloneEdgeLoops = contours.filter(
    (contour) =>
      contour !== outline && contour.some((point) => Math.abs(point.y) === 20),
  )
  expect(standaloneEdgeLoops).toEqual([])
})

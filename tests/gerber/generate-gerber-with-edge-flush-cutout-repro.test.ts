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

type Contour = Array<{ x: number; y: number }>

const getEdgeCutsContours = (edgeCutsGerber: string): Contour[] => {
  const contours: Contour[] = []
  let x = 0
  let y = 0
  for (const match of edgeCutsGerber.matchAll(
    /^(?:X(-?\d+))?(?:Y(-?\d+))?D0([12])\*$/gm,
  )) {
    if (match[1] !== undefined) x = Number(match[1]) / 1e6
    if (match[2] !== undefined) y = Number(match[2]) / 1e6
    if (match[3] === "2") contours.push([])
    contours[contours.length - 1]!.push({ x, y })
  }
  return contours
}

/**
 * Draws every Edge.Cuts contour as its own stroked path so a contour that lies
 * on top of the board edge is visible:
 * - blue: board outline
 * - green: internal cutout loop (correct)
 * - red: standalone loop touching the board edge (the bug)
 */
const renderEdgeCutsContoursSvg = (contours: Contour[]) => {
  const scale = 10
  const margin = 40
  const boardHalfWidth = 25
  const boardHalfHeight = 20
  const toSvgX = (x: number) => margin + (x + boardHalfWidth) * scale
  const toSvgY = (y: number) => margin + (boardHalfHeight - y) * scale
  const isOnBoardEdge = (point: { x: number; y: number }) =>
    Math.abs(Math.abs(point.x) - boardHalfWidth) < 1e-6 ||
    Math.abs(Math.abs(point.y) - boardHalfHeight) < 1e-6
  const isBoardOutline = (contour: Contour) =>
    contour.some((point) => Math.abs(point.x) === boardHalfWidth) &&
    contour.some((point) => Math.abs(point.y) === boardHalfHeight) &&
    contour.some((point) => point.x === -boardHalfWidth) &&
    contour.some((point) => point.x === boardHalfWidth)

  const paths = contours.map((contour) => {
    const kind = isBoardOutline(contour)
      ? "outline"
      : contour.some(isOnBoardEdge)
        ? "standalone-loop-on-board-edge"
        : "internal-cutout"
    const color = {
      outline: "#2563eb",
      "internal-cutout": "#16a34a",
      "standalone-loop-on-board-edge": "#dc2626",
    }[kind]
    const d = contour
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${toSvgX(point.x).toFixed(1)} ${toSvgY(point.y).toFixed(1)}`,
      )
      .join(" ")
    return {
      kind,
      svg: `<path d="${d}" fill="none" stroke="${color}" stroke-width="${kind === "outline" ? 6 : 3}" stroke-linejoin="round"/>`,
    }
  })

  const countOf = (kind: string) =>
    paths.filter((path) => path.kind === kind).length
  const width = 2 * margin + 2 * boardHalfWidth * scale
  const height = 2 * margin + 2 * boardHalfHeight * scale + 70
  const legendY = height - 62

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    ...paths.map((path) => path.svg),
    `<g font-family="monospace" font-size="14">`,
    `<text x="${margin}" y="${legendY}" fill="#2563eb">board outline contours: ${countOf("outline")}</text>`,
    `<text x="${margin}" y="${legendY + 20}" fill="#16a34a">internal cutout loops: ${countOf("internal-cutout")}</text>`,
    `<text x="${margin}" y="${legendY + 40}" fill="#dc2626">standalone loops lying on the board edge: ${countOf("standalone-loop-on-board-edge")}</text>`,
    `</g>`,
    `</svg>`,
  ].join("\n")
}

test("cutout flush with the board edge is merged into the board outline", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  await expect(
    renderEdgeCutsContoursSvg(getEdgeCutsContours(gerberOutput.Edge_Cuts)),
  ).toMatchSvgSnapshot(import.meta.path, "edge-flush-cutout-edge-cuts-contours")
})

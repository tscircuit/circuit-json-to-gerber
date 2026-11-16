import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import pcbStackup from "pcb-stackup"
import { Readable } from "stream"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

/**
 * A breakaway sensor tab at the bottom of a board, held by two mouse-bite
 * bridges. The two side slots run to the board edge and end exactly on it
 * (they do not extend past it), so physically they are notches in the board
 * outline. The small slot between the bridges is a true internal cutout.
 *
 * The side slots must be merged into the outer Edge.Cuts contour. If they are
 * emitted as separate closed loops that share a segment with the board edge,
 * fab CAM tools (seen with JLCPCB's gerber viewer) read the tab area as solid
 * board and the slots are not milled.
 */
const BOARD_WIDTH = 40
const BOARD_HEIGHT = 30

const pad = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): AnyCircuitElement =>
  ({
    type: "pcb_smtpad",
    pcb_smtpad_id: id,
    shape: "rect",
    layer: "top",
    x,
    y,
    width,
    height,
  }) as AnyCircuitElement

const trace = (
  id: string,
  points: Array<{ x: number; y: number }>,
  width = 0.25,
): AnyCircuitElement =>
  ({
    type: "pcb_trace",
    pcb_trace_id: id,
    route: points.map((point) => ({
      route_type: "wire",
      ...point,
      width,
      layer: "top",
    })),
  }) as AnyCircuitElement

const silkscreenText = (
  id: string,
  text: string,
  x: number,
  y: number,
): AnyCircuitElement =>
  ({
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: id,
    pcb_component_id: "pcb_component_0",
    anchor_alignment: "center",
    anchor_position: { x, y },
    font: "tscircuit2024",
    font_size: 1.2,
    layer: "top",
    text,
  }) as AnyCircuitElement

const mouseBite = (id: string, x: number): AnyCircuitElement =>
  ({
    type: "pcb_hole",
    pcb_hole_id: id,
    hole_shape: "circle",
    hole_diameter: 0.4,
    x,
    y: -5,
  }) as AnyCircuitElement

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },

  // Left side slot: from the bottom board edge (y = -15) up, flush with the edge
  {
    type: "pcb_cutout",
    pcb_cutout_id: "tab_slot_left",
    shape: "polygon",
    points: [
      { x: -5.5, y: -15 },
      { x: -4, y: -15 },
      { x: -4, y: -5 },
      { x: -2.5, y: -5 },
      { x: -2.5, y: -4 },
      { x: -5.5, y: -4 },
    ],
  } as AnyCircuitElement,
  // Right side slot, mirrored
  {
    type: "pcb_cutout",
    pcb_cutout_id: "tab_slot_right",
    shape: "polygon",
    points: [
      { x: 4, y: -15 },
      { x: 5.5, y: -15 },
      { x: 5.5, y: -4 },
      { x: 2.5, y: -4 },
      { x: 2.5, y: -5 },
      { x: 4, y: -5 },
    ],
  } as AnyCircuitElement,
  // Slot between the two bridges: fully inside the board, stays a separate loop
  {
    type: "pcb_cutout",
    pcb_cutout_id: "tab_slot_top",
    shape: "rect",
    center: { x: 0, y: -4.5 },
    width: 2,
    height: 1,
  } as AnyCircuitElement,

  // Mouse bites across the two bridges
  mouseBite("bite_0", -2.2),
  mouseBite("bite_1", -1.75),
  mouseBite("bite_2", -1.3),
  mouseBite("bite_3", 1.3),
  mouseBite("bite_4", 1.75),
  mouseBite("bite_5", 2.2),

  // Sensor tab: connector pads, thermistor pads and the traces between them
  pad("tab_conn_1", -0.5, -7.5, 0.6, 1.5),
  pad("tab_conn_2", 0.5, -7.5, 0.6, 1.5),
  pad("tab_sensor_1", -0.8, -12.5, 0.8, 0.9),
  pad("tab_sensor_2", 0.8, -12.5, 0.8, 0.9),
  trace("tab_trace_1", [
    { x: -0.5, y: -7.5 },
    { x: -0.8, y: -9 },
    { x: -0.8, y: -12.5 },
  ]),
  trace("tab_trace_2", [
    { x: 0.5, y: -7.5 },
    { x: 0.8, y: -9 },
    { x: 0.8, y: -12.5 },
  ]),
  silkscreenText("tab_label", "NTC", 0, -10.3),

  // Main board: an 8-pin IC, a connector and some routing
  ...[-1.905, -0.635, 0.635, 1.905].flatMap((x, index) => [
    pad(`ic_pad_bottom_${index}`, x, 3.3, 0.6, 1.5),
    pad(`ic_pad_top_${index}`, x, 8.7, 0.6, 1.5),
  ]),
  pad("conn_1", -13, 6, 1.2, 2.2),
  pad("conn_2", -11, 6, 1.2, 2.2),
  pad("cap_1", 11, 5.2, 1, 1.1),
  pad("cap_2", 11, 6.8, 1, 1.1),
  trace("main_trace_1", [
    { x: -13, y: 6 },
    { x: -13, y: 1 },
    { x: -1.905, y: 1 },
    { x: -1.905, y: 3.3 },
  ]),
  trace("main_trace_2", [
    { x: -11, y: 6 },
    { x: -11, y: 11 },
    { x: -1.905, y: 11 },
    { x: -1.905, y: 8.7 },
  ]),
  trace(
    "main_trace_3",
    [
      { x: 1.905, y: 3.3 },
      { x: 1.905, y: 1 },
      { x: 11, y: 1 },
      { x: 11, y: 5.2 },
    ],
    0.4,
  ),
  trace(
    "main_trace_4",
    [
      { x: 1.905, y: 8.7 },
      { x: 1.905, y: 11 },
      { x: 11, y: 11 },
      { x: 11, y: 6.8 },
    ],
    0.4,
  ),
  silkscreenText("ic_label", "U1", 0, 6),
  silkscreenText("board_label", "BREAKAWAY TAB", 0, -1.5),
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
 * Edge.Cuts contours other than the board outline that touch the board edge.
 * There must be none: such a loop lies on top of the outline.
 */
const getStandaloneLoopsOnBoardEdge = (contours: Contour[]) => {
  const isOnBoardEdge = (point: { x: number; y: number }) =>
    Math.abs(Math.abs(point.x) - BOARD_WIDTH / 2) < 1e-6 ||
    Math.abs(Math.abs(point.y) - BOARD_HEIGHT / 2) < 1e-6
  const isBoardOutline = (contour: Contour) =>
    contour.some((point) => point.x === -BOARD_WIDTH / 2) &&
    contour.some((point) => point.x === BOARD_WIDTH / 2) &&
    contour.some((point) => point.y === -BOARD_HEIGHT / 2) &&
    contour.some((point) => point.y === BOARD_HEIGHT / 2)

  return contours.filter(
    (contour) => !isBoardOutline(contour) && contour.some(isOnBoardEdge),
  )
}

/**
 * Renders the top of the board with pcb-stackup, like the other gerber
 * snapshots, and marks every standalone Edge.Cuts loop that lies on the board
 * edge in red. The stackup renderer fills the outline layer with the even-odd
 * rule, so on its own it shows such a loop as an open slot and hides the bug.
 */
const renderTopWithStandaloneEdgeLoopsMarked = async (
  gerberOutput: Record<string, string>,
) => {
  const stackup = await pcbStackup(
    Object.entries(gerberOutput).map(([filename, content]) => ({
      filename,
      gerber: Readable.from(content),
    })),
  )
  const standaloneLoops = getStandaloneLoopsOnBoardEdge(
    getEdgeCutsContours(gerberOutput.Edge_Cuts),
  )

  // The stackup SVG is drawn in micrometres with the y axis flipped
  const toMicrons = (valueMm: number) => Math.round(valueMm * 1000)
  const markers = standaloneLoops
    .map((contour) => {
      const d = contour
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"}${toMicrons(point.x)} ${toMicrons(point.y)}`,
        )
        .join(" ")
      return `<path d="${d} Z" fill="#ff0000" fill-opacity="0.45" stroke="#ff0000" stroke-width="220"/>`
    })
    .join("")
  const label =
    standaloneLoops.length > 0
      ? `<text x="0" y="${toMicrons(-BOARD_HEIGHT / 2 + 2.2)}" font-family="monospace" font-size="1100" text-anchor="middle" fill="#ff0000" stroke="none">${standaloneLoops.length} standalone Edge.Cuts loop(s) on the board edge</text>`
      : ""

  return stackup.top.svg.replace(
    /<\/svg>\s*$/,
    `<g transform="scale(1,-1)">${markers}</g>${label}</svg>`,
  )
}

test("cutout flush with the board edge is merged into the board outline", async () => {
  const gerberOutput = {
    ...stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson)),
    "drill_npth.drl": stringifyExcellonDrill(
      convertSoupToExcellonDrillCommands({ circuitJson, is_plated: false }),
    ),
  }

  await expect(
    await renderTopWithStandaloneEdgeLoopsMarked(gerberOutput),
  ).toMatchSvgSnapshot(import.meta.path, "edge-flush-cutout-top")
})

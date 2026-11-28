import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCutout, Point } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import type { AnyGerberCommand } from "src/gerber/any_gerber_command"
import {
  doesSolidCutoutOverlapBoardEdge,
  getBoardOutlinePolygons,
  isCutoutFullyInternal,
} from "src/gerber/utils/boardCutoutGeometry"
import { emitCutoutEdgeCuts } from "src/gerber/utils/emitCutoutEdgeCuts"
import { getPolygonSignedArea } from "src/gerber/utils/getPolygonSignedArea"
import { gerberBuilder } from "src/gerber/gerber-builder"

const extractClosedLoops = (commands: AnyGerberCommand[]): Point[][] => {
  const loops: Point[][] = []
  let current: Point[] = []

  for (const command of commands) {
    if (command.command_code === "D02") {
      if (current.length >= 3) {
        loops.push(current)
      }
      current = [{ x: command.x, y: command.y }]
    } else if (command.command_code === "D01") {
      current.push({ x: command.x, y: command.y })
    }
  }

  if (current.length >= 3) {
    loops.push(current)
  }

  return loops.map((loop) => {
    const first = loop[0]
    const last = loop[loop.length - 1]
    if (
      loop.length > 3 &&
      Math.abs(first.x - last.x) < 1e-6 &&
      Math.abs(first.y - last.y) < 1e-6
    ) {
      return loop.slice(0, -1)
    }
    return loop
  })
}

const ccwTriangle: Point[] = [
  { x: 0, y: -3 },
  { x: 4, y: 2 },
  { x: -4, y: 2 },
]

const cwTriangle: Point[] = [...ccwTriangle].reverse()

test("internal polygon cutouts are emitted CW regardless of input winding and flip_y_axis", () => {
  for (const flipY of [false, true]) {
    for (const points of [ccwTriangle, cwTriangle]) {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_board",
          pcb_board_id: "pcb_board_0",
          center: { x: 0, y: 0 },
          width: 40,
          height: 30,
          thickness: 1.6,
          num_layers: 2,
          material: "fr4",
        },
        {
          type: "pcb_cutout",
          pcb_cutout_id: "pcb_cutout_rect_0",
          shape: "rect",
          center: { x: -10, y: 0 },
          width: 4,
          height: 4,
        },
        {
          type: "pcb_cutout",
          pcb_cutout_id: "pcb_cutout_poly_0",
          shape: "polygon",
          points,
        },
      ]

      const gerberLayers = convertCircuitJsonToGerberCommands(circuitJson, {
        flip_y_axis: flipY,
      })
      const loops = extractClosedLoops(gerberLayers.Edge_Cuts)

      expect(loops).toHaveLength(3)
      const boardArea = getPolygonSignedArea(loops[0])
      const rectCutoutArea = getPolygonSignedArea(loops[1])
      const polyCutoutArea = getPolygonSignedArea(loops[2])

      if (!flipY) {
        expect(boardArea).toBeGreaterThan(0)
      }
      expect(rectCutoutArea).toBeLessThan(0)
      expect(polyCutoutArea).toBeLessThan(0)
    }
  }
})

test("emitCutoutEdgeCuts honors drawCw=false for both CW and CCW polygon inputs", () => {
  for (const mfy of [(y: number) => y, (y: number) => -y]) {
    for (const points of [ccwTriangle, cwTriangle]) {
      const cutout: Extract<PcbCutout, { shape: "polygon" }> = {
        type: "pcb_cutout",
        pcb_cutout_id: "pcb_cutout_outer",
        shape: "polygon",
        points,
      }
      const builder = gerberBuilder()
      emitCutoutEdgeCuts({ cutout, builder, mfy, drawCw: false })
      const loops = extractClosedLoops(builder.build())

      expect(loops).toHaveLength(1)
      expect(getPolygonSignedArea(loops[0])).toBeGreaterThan(0)
    }
  }
})

test("isCutoutFullyInternal returns false for edge-flush cutouts merged into the outline", () => {
  const flushRectCutout: PcbCutout = {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_flush_rect",
    shape: "rect",
    center: { x: -8, y: 0 },
    width: 4,
    height: 6,
  }
  const flushPolygonCutout: PcbCutout = {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_flush_poly",
    shape: "polygon",
    points: [
      { x: 10, y: -3 },
      { x: 10, y: 3 },
      { x: 6, y: 0 },
    ],
  }
  const internalPolygonCutout: PcbCutout = {
    type: "pcb_cutout",
    pcb_cutout_id: "pcb_cutout_internal_poly",
    shape: "polygon",
    points: ccwTriangle,
  }
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    flushRectCutout,
    flushPolygonCutout,
    internalPolygonCutout,
  ]

  const boardOutlinePolygons = getBoardOutlinePolygons(circuitJson)

  expect(
    doesSolidCutoutOverlapBoardEdge({
      cutout: flushRectCutout,
      boardOutlinePolygons,
    }),
  ).toBe(true)
  expect(
    isCutoutFullyInternal({
      cutout: flushRectCutout,
      boardOutlinePolygons,
    }),
  ).toBe(false)

  expect(
    doesSolidCutoutOverlapBoardEdge({
      cutout: flushPolygonCutout,
      boardOutlinePolygons,
    }),
  ).toBe(true)
  expect(
    isCutoutFullyInternal({
      cutout: flushPolygonCutout,
      boardOutlinePolygons,
    }),
  ).toBe(false)

  expect(
    doesSolidCutoutOverlapBoardEdge({
      cutout: internalPolygonCutout,
      boardOutlinePolygons,
    }),
  ).toBe(false)
  expect(
    isCutoutFullyInternal({
      cutout: internalPolygonCutout,
      boardOutlinePolygons,
    }),
  ).toBe(true)
})

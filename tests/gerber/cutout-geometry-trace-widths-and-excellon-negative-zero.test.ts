import { describe, expect, test } from "bun:test"
import { drill_at } from "../../src/excellon-drill/commands/drill_at"
import { G85 } from "../../src/excellon-drill/commands/G85"
import { getAllTraceWidths } from "../../src/gerber/convert-soup-to-gerber-commands/getAllTraceWidths"
import {
  doesSolidCutoutOverlapBoardEdge,
  getBoardOutlinePolygons,
  getSolidCutoutOutlinePolygon,
  isCutoutFullyInternal,
} from "../../src/gerber/utils/boardCutoutGeometry"

describe("cutout geometry validation, trace widths filtering, and excellon negative-zero normalization", () => {
  test("getSolidCutoutOutlinePolygon and board outline helpers reject degenerate or invalid cutouts/boards", () => {
    const validBoards = getBoardOutlinePolygons([
      {
        type: "pcb_board",
        pcb_board_id: "board_valid",
        center: { x: 0, y: 0 },
        width: 20,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
      {
        type: "pcb_board",
        pcb_board_id: "board_invalid_no_dims",
        center: { x: 0, y: 0 },
        width: 0,
        height: 10,
        thickness: 1.6,
        num_layers: 2,
        material: "fr4",
      },
    ] as any)
    expect(validBoards).toHaveLength(1)

    const degeneratePolygonCutout = {
      type: "pcb_cutout" as const,
      pcb_cutout_id: "deg_poly",
      shape: "polygon" as const,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    }
    const collinearPolygonCutout = {
      type: "pcb_cutout" as const,
      pcb_cutout_id: "collinear_poly",
      shape: "polygon" as const,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    }
    const zeroRadiusCircleCutout = {
      type: "pcb_cutout" as const,
      pcb_cutout_id: "zero_circle",
      shape: "circle" as const,
      center: { x: 0, y: 0 },
      radius: 0,
    }
    const zeroWidthRectCutout = {
      type: "pcb_cutout" as const,
      pcb_cutout_id: "zero_rect",
      shape: "rect" as const,
      center: { x: 0, y: 0 },
      width: 0,
      height: 5,
    }

    expect(getSolidCutoutOutlinePolygon(degeneratePolygonCutout)).toBeNull()
    expect(getSolidCutoutOutlinePolygon(collinearPolygonCutout)).toBeNull()
    expect(getSolidCutoutOutlinePolygon(zeroRadiusCircleCutout)).toBeNull()
    expect(getSolidCutoutOutlinePolygon(zeroWidthRectCutout)).toBeNull()

    expect(
      doesSolidCutoutOverlapBoardEdge({
        cutout: degeneratePolygonCutout,
        boardOutlinePolygons: validBoards,
      }),
    ).toBe(false)
    expect(
      isCutoutFullyInternal({
        cutout: degeneratePolygonCutout,
        boardOutlinePolygons: validBoards,
      }),
    ).toBe(false)
  })

  test("getAllTraceWidths ignores missing routes and non-positive or non-finite segment widths", () => {
    const widths = getAllTraceWidths([
      {
        type: "pcb_trace",
        pcb_trace_id: "trace_1",
        route: [
          { route_type: "wire", x: 0, y: 0, width: 0.25, layer: "top" },
          { route_type: "wire", x: 1, y: 0, width: 0, layer: "top" },
          { route_type: "wire", x: 2, y: 0, width: -0.1, layer: "top" },
          { route_type: "wire", x: 3, y: 0, width: Number.NaN, layer: "top" },
          {
            route_type: "through_pad",
            x: 4,
            y: 0,
            width: 0.4,
            start_layer: "top",
            end_layer: "bottom",
          },
          {
            route_type: "through_pad",
            x: 5,
            y: 0,
            width: 0,
            start_layer: "top",
            end_layer: "bottom",
          },
        ],
      },
      {
        type: "pcb_trace",
        pcb_trace_id: "trace_missing_route",
      },
    ] as any)

    expect(widths.top).toEqual([0.25, 0.4])
    expect(widths.bottom).toEqual([0.4])
  })

  test("drill_at and G85 normalize negative zero coordinates", () => {
    expect(
      drill_at.stringify({ command_code: "drill_at", x: -0, y: -1e-6 }),
    ).toBe("X0.0000Y0.0000")
    expect(
      G85.stringify({ command_code: "G85", x: -0, y: -0.0001, width: 0.8 }),
    ).toBe("G85X0.000Y0.000")
  })
})

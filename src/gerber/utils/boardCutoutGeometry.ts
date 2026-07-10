import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCutout,
  PcbCutoutCircle,
  PcbCutoutPolygon,
  PcbCutoutRect,
  Point,
} from "circuit-json"
import polygonClipping, {
  type MultiPolygon,
  type Polygon,
  type Ring,
} from "polygon-clipping"
import { applyToPoint, compose, rotate, translate } from "transformation-matrix"

type SolidCutoutInCircuitJson =
  | PcbCutoutRect
  | PcbCutoutCircle
  | PcbCutoutPolygon

// Used only to approximate curved cutout edges before polygon clipping.
const roundedRectCornerArcSegmentCount = 8
const circleCutoutPolygonSegmentCount = 64

/**
 * Use for one `pcb_board` element when polygon-clipping needs that board's outline.
 */
export const getBoardOutlinePolygon = (board: PcbBoard): Polygon => {
  if (board.outline && board.outline.length > 2) {
    return [board.outline.map((point) => [point.x, point.y])]
  }

  // Boards without an explicit outline are represented by their bounding rectangle.
  return [
    [
      [board.center!.x - board.width! / 2, board.center!.y - board.height! / 2],
      [board.center!.x + board.width! / 2, board.center!.y - board.height! / 2],
      [board.center!.x + board.width! / 2, board.center!.y + board.height! / 2],
      [board.center!.x - board.width! / 2, board.center!.y + board.height! / 2],
    ],
  ]
}

/**
 * Use for whole-circuit cutout decisions that must consider every board outline.
 */
export const getBoardOutlinePolygons = (
  circuitJson: AnyCircuitElement[],
): Polygon[] =>
  circuitJson
    .filter((element): element is PcbBoard => element.type === "pcb_board")
    .map(getBoardOutlinePolygon)

const getRectCutoutOutlinePoints = (cutout: PcbCutoutRect): Point[] => {
  const { center, width, height, rotation, corner_radius } = cutout
  const w = width / 2
  const h = height / 2
  const r = Math.max(0, Math.min(corner_radius ?? 0, Math.abs(w), Math.abs(h)))
  let transformMatrix = translate(center.x, center.y)

  if (rotation) {
    transformMatrix = compose(
      transformMatrix,
      rotate((rotation * Math.PI) / 180),
    )
  }

  if (r === 0) {
    return [
      { x: -w, y: h },
      { x: w, y: h },
      { x: w, y: -h },
      { x: -w, y: -h },
    ].map((point) => applyToPoint(transformMatrix, point))
  }

  const points: Point[] = []
  const corners = [
    { center: { x: w - r, y: h - r }, start: Math.PI / 2, end: 0 },
    { center: { x: w - r, y: -h + r }, start: 0, end: -Math.PI / 2 },
    { center: { x: -w + r, y: -h + r }, start: -Math.PI / 2, end: -Math.PI },
    { center: { x: -w + r, y: h - r }, start: Math.PI, end: Math.PI / 2 },
  ]

  // Approximate each rounded corner with short linear segments for clipping.
  for (const corner of corners) {
    for (let i = 0; i <= roundedRectCornerArcSegmentCount; i++) {
      const t = i / roundedRectCornerArcSegmentCount
      const angle = corner.start + (corner.end - corner.start) * t
      points.push({
        x: corner.center.x + r * Math.cos(angle),
        y: corner.center.y + r * Math.sin(angle),
      })
    }
  }

  return points.map((point) => applyToPoint(transformMatrix, point))
}

const getCircleCutoutOutlinePolygon = (cutout: PcbCutoutCircle): Polygon => {
  const points: Ring = []
  for (let i = 0; i < circleCutoutPolygonSegmentCount; i++) {
    const angle = (i / circleCutoutPolygonSegmentCount) * Math.PI * 2
    points.push([
      cutout.center.x + cutout.radius * Math.cos(angle),
      cutout.center.y + cutout.radius * Math.sin(angle),
    ])
  }
  return [points]
}

/**
 * Use for one solid circuit-json cutout when polygon-clipping needs its closed outline.
 */
export const getSolidCutoutOutlinePolygon = (
  cutout: PcbCutout,
): Polygon | null => {
  if (cutout.shape === "rect") {
    return [
      getRectCutoutOutlinePoints(cutout).map((point) => [point.x, point.y]),
    ]
  }
  if (cutout.shape === "circle") {
    return getCircleCutoutOutlinePolygon(cutout)
  }
  if (cutout.shape === "polygon") {
    return [cutout.points.map((point) => [point.x, point.y])]
  }
  return null
}

/**
 * Use when the caller still has a circuit-json cutout and needs to know whether
 * that cutout can become a closed clipping polygon.
 */
export const isSolidCutoutInCircuitJson = (
  cutout: PcbCutout,
): cutout is SolidCutoutInCircuitJson =>
  cutout.shape === "rect" ||
  cutout.shape === "circle" ||
  cutout.shape === "polygon"

/**
 * Use when the caller must convert an arbitrary circuit element into a circle cutout.
 */
export const isCircleCutoutInCircuitJson = (
  element: AnyCircuitElement,
): element is PcbCutoutCircle =>
  element.type === "pcb_cutout" && element.shape === "circle"

/**
 * Use when classifying whether a solid cutout should be merged into the board outline.
 */
export const doesSolidCutoutOverlapBoardEdge = ({
  cutout,
  boardOutlinePolygons,
}: {
  cutout: PcbCutout
  boardOutlinePolygons: Polygon[]
}) => {
  const cutoutOutlinePolygon = getSolidCutoutOutlinePolygon(cutout)
  if (!cutoutOutlinePolygon) return false

  return boardOutlinePolygons.some((boardOutlinePolygon) => {
    const overlapsBoard =
      polygonClipping.intersection(boardOutlinePolygon, cutoutOutlinePolygon)
        .length > 0
    const extendsOutsideBoard =
      polygonClipping.difference(cutoutOutlinePolygon, boardOutlinePolygon)
        .length > 0
    return overlapsBoard && extendsOutsideBoard
  })
}

/**
 * Use before Edge.Cuts emission to collect only the cutout polygons that merge
 * into the board outline instead of being emitted as separate closed loops.
 */
export const getCutoutOutlinePolygonsMergedIntoBoard = ({
  circuitJson,
  boardOutlinePolygons,
}: {
  circuitJson: AnyCircuitElement[]
  boardOutlinePolygons: Polygon[]
}): Polygon[] =>
  circuitJson
    .filter((element): element is PcbCutout => element.type === "pcb_cutout")
    .filter((cutout) =>
      doesSolidCutoutOverlapBoardEdge({ cutout, boardOutlinePolygons }),
    )
    .map(getSolidCutoutOutlinePolygon)
    .filter((cutoutOutlinePolygon): cutoutOutlinePolygon is Polygon => {
      return cutoutOutlinePolygon !== null
    })

/**
 * Use after collecting merged cutout polygons to produce the final board outline
 * geometry that should be emitted on Edge.Cuts.
 */
export const subtractCutoutOutlinePolygonsFromBoardOutline = ({
  boardOutlinePolygon,
  mergedCutoutOutlinePolygons,
}: {
  boardOutlinePolygon: Polygon
  mergedCutoutOutlinePolygons: Polygon[]
}): MultiPolygon => {
  if (mergedCutoutOutlinePolygons.length === 0) {
    return [boardOutlinePolygon]
  }

  return polygonClipping.difference(
    boardOutlinePolygon,
    ...mergedCutoutOutlinePolygons,
  )
}

/**
 * Returns true when a solid cutout lies entirely within the board outline and
 * does NOT overlap the board edge.  Such cutouts must stay on Edge.Cuts as
 * standalone closed loops (not merged into the outer outline), and they must
 * be drawn CW so that gerber viewers using the non-zero / even-odd fill rule
 * treat the loop as a hole instead of additional filled material.
 */
export const isCutoutFullyInternal = ({
  cutout,
  boardOutlinePolygons,
}: {
  cutout: PcbCutout
  boardOutlinePolygons: Polygon[]
}): boolean => {
  const cutoutOutlinePolygon = getSolidCutoutOutlinePolygon(cutout)
  if (!cutoutOutlinePolygon) return false

  return boardOutlinePolygons.some(
    (boardOutlinePolygon) =>
      // Has overlap with the board interior …
      polygonClipping.intersection(boardOutlinePolygon, cutoutOutlinePolygon)
        .length > 0 &&
      // … but does not extend outside it at all.
      polygonClipping.difference(cutoutOutlinePolygon, boardOutlinePolygon)
        .length === 0,
  )
}

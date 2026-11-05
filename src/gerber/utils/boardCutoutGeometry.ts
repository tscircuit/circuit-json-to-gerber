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
import { getBoundFromCenteredRect } from "@tscircuit/math-utils"

type SolidCutoutInCircuitJson =
  | PcbCutoutRect
  | PcbCutoutCircle
  | PcbCutoutPolygon

// Used only to approximate curved cutout edges before polygon clipping.
const roundedRectCornerArcSegmentCount = 8
const circleCutoutPolygonSegmentCount = 64

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const getSignedRingArea = (ring: Ring): number => {
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % ring.length]!
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

const sanitizePolygonRing = (
  points: ReadonlyArray<{ x: number; y: number }> | undefined,
): Ring | null => {
  if (!Array.isArray(points)) return null
  const filtered: Ring = []
  for (const point of points) {
    if (!point || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) continue
    const prev = filtered[filtered.length - 1]
    if (prev && Math.hypot(point.x - prev[0], point.y - prev[1]) <= 1e-9) {
      continue
    }
    filtered.push([point.x, point.y])
  }
  if (filtered.length > 2) {
    const first = filtered[0]!
    const last = filtered[filtered.length - 1]!
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) <= 1e-9) {
      filtered.pop()
    }
  }
  if (filtered.length < 3 || Math.abs(getSignedRingArea(filtered)) <= 1e-10) {
    return null
  }
  return filtered
}

/**
 * Use for one `pcb_board` element when polygon-clipping needs that board's outline.
 */
export const getBoardOutlinePolygon = (board: PcbBoard): Polygon => {
  const sanitizedOutline = sanitizePolygonRing(board.outline)
  if (sanitizedOutline) {
    return [sanitizedOutline]
  }

  if (
    !board.center ||
    !isFiniteNumber(board.center.x) ||
    !isFiniteNumber(board.center.y) ||
    !isFiniteNumber(board.width) ||
    board.width <= 0 ||
    !isFiniteNumber(board.height) ||
    board.height <= 0
  ) {
    return []
  }

  // Boards without an explicit outline are represented by their bounding rectangle.
  const bounds = getBoundFromCenteredRect({
    center: board.center,
    width: board.width,
    height: board.height,
  })

  return [
    [
      [bounds.minX, bounds.minY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
      [bounds.minX, bounds.maxY],
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
    .filter((polygon) => polygon.length > 0 && polygon[0]!.length >= 3)

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
    if (
      !cutout.center ||
      !isFiniteNumber(cutout.center.x) ||
      !isFiniteNumber(cutout.center.y) ||
      !isFiniteNumber(cutout.width) ||
      cutout.width <= 0 ||
      !isFiniteNumber(cutout.height) ||
      cutout.height <= 0
    ) {
      return null
    }
    return [
      getRectCutoutOutlinePoints(cutout).map((point) => [point.x, point.y]),
    ]
  }
  if (cutout.shape === "circle") {
    if (
      !cutout.center ||
      !isFiniteNumber(cutout.center.x) ||
      !isFiniteNumber(cutout.center.y) ||
      !isFiniteNumber(cutout.radius) ||
      cutout.radius <= 0
    ) {
      return null
    }
    return getCircleCutoutOutlinePolygon(cutout)
  }
  if (cutout.shape === "polygon") {
    const ring = sanitizePolygonRing(cutout.points)
    return ring ? [ring] : null
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

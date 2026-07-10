import type { PcbCutout } from "circuit-json"
import { gerberBuilder } from "../gerber-builder"
import {
  applyToPoint,
  compose,
  identity,
  rotate,
  translate,
} from "transformation-matrix"

type GerberBuilder = ReturnType<typeof gerberBuilder>

/**
 * Emits a single pcb_cutout as a closed Edge.Cuts path onto builder.
 *
 * Pass drawCw = true for cutouts fully inside the board outline so gerber
 * viewers using the non-zero or even-odd fill rule treat the inner loop as
 * a hole (removed material) rather than additional filled area.
 */
export const emitCutoutEdgeCuts = ({
  cutout,
  builder,
  mfy,
  drawCw,
}: {
  cutout: PcbCutout
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  if (cutout.shape === "circle") {
    emitCircle({ cutout, builder, mfy, drawCw })
  } else if (cutout.shape === "rect") {
    emitRect({ cutout, builder, mfy, drawCw })
  } else if (cutout.shape === "polygon") {
    emitPolygon({ cutout, builder, mfy, drawCw })
  }
}

const emitCircle = ({
  cutout,
  builder,
  mfy,
  drawCw,
}: {
  cutout: Extract<PcbCutout, { shape: "circle" }>
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  const { center, radius } = cutout
  const p1 = { x: center.x + radius, y: center.y }
  const p2 = { x: center.x - radius, y: center.y }
  // Edge cutouts (boundary notch): CCW so the outline is a standard outer ring.
  // Internal holes: CW so fill rules treat the loop as removed material.
  // Gerber viewers use the non-zero winding rule to determine what is filled.
  const isYFlipped = mfy(1) < 0
  let isClockwise = drawCw
  if (isYFlipped) {
    // If the Y-axis is inverted, the geometric mirroring means that a path that
    // was CW in math-space is now tracing CCW in output-space.
    isClockwise = !isClockwise
  }

  let arcMode:
    | "set_movement_mode_to_counterclockwise_circular"
    | "set_movement_mode_to_clockwise_circular" =
    "set_movement_mode_to_counterclockwise_circular"
  if (isClockwise) {
    arcMode = "set_movement_mode_to_clockwise_circular"
  }

  builder
    .add("move_operation", { x: p1.x, y: mfy(p1.y) })
    .add(arcMode, {})
    .add("plot_operation", { x: p2.x, y: mfy(p2.y), i: -radius, j: 0 })
    .add("plot_operation", { x: p1.x, y: mfy(p1.y), i: radius, j: 0 })
    .add("set_movement_mode_to_linear", {})
}

const emitRect = ({
  cutout,
  builder,
  mfy,
  drawCw,
}: {
  cutout: Extract<PcbCutout, { shape: "rect" }>
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  const { center, width, height, rotation, corner_radius } = cutout
  const w = width / 2
  const h = height / 2
  let cr = 0
  if (corner_radius !== undefined) {
    cr = corner_radius
  }
  const r = Math.max(0, Math.min(cr, Math.abs(w), Math.abs(h)))

  let rotationTransform = identity()
  if (rotation) {
    rotationTransform = rotate((rotation * Math.PI) / 180)
  }
  const transformMatrix = compose(
    translate(center.x, center.y),
    rotationTransform,
  )
  if (r > 0) {
    emitRoundedRect({ w, h, r, transformMatrix, builder, mfy, drawCw })
  } else {
    emitSharpRect({ w, h, transformMatrix, builder, mfy, drawCw })
  }
}

const emitSharpRect = ({
  w,
  h,
  transformMatrix,
  builder,
  mfy,
  drawCw,
}: {
  w: number
  h: number
  transformMatrix: ReturnType<typeof compose>
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  // Standard CW order: Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left
  const cwPoints = [
    { x: -w, y: h },
    { x: w, y: h },
    { x: w, y: -h },
    { x: -w, y: -h },
  ]
  const isYFlipped = mfy(1) < 0
  let shouldReverse = !drawCw
  if (isYFlipped) {
    shouldReverse = !shouldReverse
  }

  let pts = cwPoints
  if (shouldReverse) {
    pts = [...cwPoints].reverse()
  }
  const tpts = pts.map((p) => applyToPoint(transformMatrix, p))
  builder.add("move_operation", { x: tpts[0].x, y: mfy(tpts[0].y) })
  for (let i = 1; i < tpts.length; i++) {
    builder.add("plot_operation", { x: tpts[i].x, y: mfy(tpts[i].y) })
  }
  builder.add("plot_operation", { x: tpts[0].x, y: mfy(tpts[0].y) })
}

const emitRoundedRect = ({
  w,
  h,
  r,
  transformMatrix,
  builder,
  mfy,
  drawCw,
}: {
  w: number
  h: number
  r: number
  transformMatrix: ReturnType<typeof compose>
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  // Edge cutouts: CW gerber arc mode (CCW winding). Internal holes: CCW arc mode (CW winding).
  // Note: gerber arc modes are based on the direction the tool travels.
  const isYFlipped = mfy(1) < 0
  let isClockwise = drawCw
  if (isYFlipped) {
    // If the Y-axis is inverted, the geometric mirroring means that a path that
    // was CW in math-space is now tracing CCW in output-space.
    isClockwise = !isClockwise
  }

  let arcMode:
    | "set_movement_mode_to_counterclockwise_circular"
    | "set_movement_mode_to_clockwise_circular" =
    "set_movement_mode_to_counterclockwise_circular"
  if (isClockwise) {
    arcMode = "set_movement_mode_to_clockwise_circular"
  }

  let currentPoint: { x: number; y: number }

  const addLine = (pt: { x: number; y: number }) => {
    const tpt = applyToPoint(transformMatrix, pt)
    builder.add("plot_operation", { x: tpt.x, y: mfy(tpt.y) })
    currentPoint = tpt
  }

  const addArc = (
    endPt: { x: number; y: number },
    centerPt: { x: number; y: number },
  ) => {
    const tEnd = applyToPoint(transformMatrix, endPt)
    const tCenter = applyToPoint(transformMatrix, centerPt)
    builder
      .add(arcMode, {})
      .add("plot_operation", {
        x: tEnd.x,
        y: mfy(tEnd.y),
        i: tCenter.x - currentPoint.x,
        j: mfy(tCenter.y) - mfy(currentPoint.y),
      })
      .add("set_movement_mode_to_linear", {})
    currentPoint = tEnd
  }

  if (isClockwise) {
    const cwSegments = [
      {
        lineTo: { x: w - r, y: h },
        arcEnd: { x: w, y: h - r },
        arcCenter: { x: w - r, y: h - r },
      },
      {
        lineTo: { x: w, y: -h + r },
        arcEnd: { x: w - r, y: -h },
        arcCenter: { x: w - r, y: -h + r },
      },
      {
        lineTo: { x: -w + r, y: -h },
        arcEnd: { x: -w, y: -h + r },
        arcCenter: { x: -w + r, y: -h + r },
      },
      {
        lineTo: { x: -w, y: h - r },
        arcEnd: { x: -w + r, y: h },
        arcCenter: { x: -w + r, y: h - r },
      },
    ]

    const startPt = { x: -w + r, y: h }
    const tStart = applyToPoint(transformMatrix, startPt)
    builder.add("move_operation", { x: tStart.x, y: mfy(tStart.y) })
    currentPoint = tStart

    for (const seg of cwSegments) {
      addLine(seg.lineTo)
      addArc(seg.arcEnd, seg.arcCenter)
    }
  } else {
    // Start at Top-Right going LEFT (Top edge)
    const startPt = { x: w - r, y: h }
    const tStart = applyToPoint(transformMatrix, startPt)
    builder.add("move_operation", { x: tStart.x, y: mfy(tStart.y) })
    currentPoint = tStart

    // Top edge -> Top-Left corner
    addLine({ x: -w + r, y: h })
    addArc({ x: -w, y: h - r }, { x: -w + r, y: h - r })

    // Left edge -> Bottom-Left corner
    addLine({ x: -w, y: -h + r })
    addArc({ x: -w + r, y: -h }, { x: -w + r, y: -h + r })

    // Bottom edge -> Bottom-Right corner
    addLine({ x: w - r, y: -h })
    addArc({ x: w, y: -h + r }, { x: w - r, y: -h + r })

    // Right edge -> Top-Right corner
    addLine({ x: w, y: h - r })
    addArc({ x: w - r, y: h }, { x: w - r, y: h - r })
  }
}

const emitPolygon = ({
  cutout,
  builder,
  mfy,
  drawCw,
}: {
  cutout: Extract<PcbCutout, { shape: "polygon" }>
  builder: GerberBuilder
  mfy: (y: number) => number
  drawCw: boolean
}) => {
  const points = cutout.points
  if (points.length === 0) return

  const isYFlipped = mfy(1) < 0
  let shouldReverse = !drawCw
  if (isYFlipped) {
    shouldReverse = !shouldReverse
  }

  let ordered = points
  if (shouldReverse) {
    ordered = [...points].reverse()
  }

  builder.add("move_operation", { x: ordered[0].x, y: mfy(ordered[0].y) })
  for (let i = 1; i < ordered.length; i++) {
    builder.add("plot_operation", { x: ordered[i].x, y: mfy(ordered[i].y) })
  }
  builder.add("plot_operation", { x: ordered[0].x, y: mfy(ordered[0].y) })
}

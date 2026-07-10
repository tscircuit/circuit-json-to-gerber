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
  let arcMode:
    | "set_movement_mode_to_counterclockwise_circular"
    | "set_movement_mode_to_clockwise_circular" =
    "set_movement_mode_to_counterclockwise_circular"
  if (drawCw) {
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
  let pts = cwPoints
  // Reverse the array to draw in CCW order if this is an edge cutout
  if (!drawCw) {
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
  let arcMode:
    | "set_movement_mode_to_counterclockwise_circular"
    | "set_movement_mode_to_clockwise_circular" =
    "set_movement_mode_to_counterclockwise_circular"
  if (drawCw) {
    arcMode = "set_movement_mode_to_clockwise_circular"
  }

  // CW traversal segments. Each entry represents a straight line to the edge,
  // followed by an arc around the corner.
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

  const lastSeg = cwSegments[cwSegments.length - 1]!

  // If we are drawing CCW, we start at the end of the last segment's arc
  // and trace backwards through the CW path.
  let startPt = { x: -w + r, y: h }
  if (!drawCw) {
    startPt = lastSeg.arcEnd
  }

  let currentPoint = applyToPoint(transformMatrix, startPt)
  builder.add("move_operation", { x: currentPoint.x, y: mfy(currentPoint.y) })

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

  if (!drawCw) {
    // To reverse the path into CCW, we walk the CW segments in reverse order.
    // The target of the arc becomes the end of the previous segment.
    const reversed = [...cwSegments].reverse()
    for (let i = 0; i < reversed.length; i++) {
      const cur = reversed[i]!
      addLine(cur.lineTo)
      const prevSeg = reversed[i + 1]
      let arcTarget = lastSeg.arcEnd
      if (prevSeg) {
        arcTarget = prevSeg.arcEnd
      }
      addArc(arcTarget, cur.arcCenter)
    }
  } else {
    for (const seg of cwSegments) {
      addLine(seg.lineTo)
      addArc(seg.arcEnd, seg.arcCenter)
    }
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
  const { points } = cutout
  if (points.length === 0) return

  // Reverse point order if we need to enforce CCW winding (though polygon
  // winding depends on how it was originally defined). For now we assume
  // polygons are defined in CW order as well.
  let ordered = points
  if (!drawCw) {
    ordered = [...points].reverse()
  }
  builder.add("move_operation", { x: ordered[0].x, y: mfy(ordered[0].y) })
  for (let i = 1; i < ordered.length; i++) {
    builder.add("plot_operation", { x: ordered[i].x, y: mfy(ordered[i].y) })
  }
  builder.add("plot_operation", { x: ordered[0].x, y: mfy(ordered[0].y) })
}

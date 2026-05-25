export type Point = { x: number; y: number }

const getSignedPolygonArea = (points: Point[]) => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

const getLineIntersection = (
  lineA: { start: Point; end: Point },
  lineB: { start: Point; end: Point },
): Point | null => {
  const ax = lineA.end.x - lineA.start.x
  const ay = lineA.end.y - lineA.start.y
  const bx = lineB.end.x - lineB.start.x
  const by = lineB.end.y - lineB.start.y
  const denominator = ax * by - ay * bx

  if (Math.abs(denominator) < 1e-9) {
    return null
  }

  const cx = lineB.start.x - lineA.start.x
  const cy = lineB.start.y - lineA.start.y
  const t = (cx * by - cy * bx) / denominator

  return {
    x: lineA.start.x + ax * t,
    y: lineA.start.y + ay * t,
  }
}

export const offsetPolygonOutline = (
  points: Point[],
  offset: number,
): Point[] => {
  if (points.length < 3 || offset === 0) {
    return points
  }

  const isCounterClockwise = getSignedPolygonArea(points) > 0
  const shiftedEdges: Array<{ start: Point; end: Point }> = []

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length < 1e-9) {
      continue
    }

    let normalX = -dy / length
    let normalY = dx / length
    if (isCounterClockwise) {
      normalX = dy / length
      normalY = -dx / length
    }

    shiftedEdges.push({
      start: {
        x: start.x + normalX * offset,
        y: start.y + normalY * offset,
      },
      end: {
        x: end.x + normalX * offset,
        y: end.y + normalY * offset,
      },
    })
  }

  if (shiftedEdges.length < 3) {
    return points
  }

  const offsetPoints: Point[] = []
  for (let i = 0; i < shiftedEdges.length; i++) {
    const previousEdge =
      shiftedEdges[(i - 1 + shiftedEdges.length) % shiftedEdges.length]
    const currentEdge = shiftedEdges[i]
    const intersection = getLineIntersection(previousEdge, currentEdge)
    if (intersection) {
      offsetPoints.push(intersection)
    } else {
      offsetPoints.push(currentEdge.start)
    }
  }

  return offsetPoints
}

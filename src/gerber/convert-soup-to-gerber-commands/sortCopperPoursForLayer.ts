import type { AnyCircuitElement, LayerRef, PcbCopperPour } from "circuit-json"
import polygonClipping, { type Ring } from "polygon-clipping"
import {
  applyToPoint,
  compose,
  identity,
  rotate,
  translate,
} from "transformation-matrix"

const ARC_SAMPLE_SEGMENTS = 16

function closeRingPoints(points: Ring): Ring {
  if (points.length < 3) return []
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return []
  if (first[0] === last[0] && first[1] === last[1]) {
    return points.length >= 4 ? points : []
  }
  return [...points, [first[0], first[1]]]
}

function sampleBrepRing(ring: {
  vertices: Array<{ x: number; y: number; bulge?: number }>
}): Ring {
  const { vertices } = ring
  if (!vertices || vertices.length < 2) return []

  const sampled: Ring = []
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    sampled.push([start.x, start.y])

    if (!start.bulge || Math.abs(start.bulge) <= 1e-9) continue

    const dx = end.x - start.x
    const dy = end.y - start.y
    const chord = Math.hypot(dx, dy)
    if (chord <= 1e-9) continue

    const theta = 4 * Math.atan(Math.abs(start.bulge))
    const sinHalf = Math.sin(theta / 2)
    if (Math.abs(sinHalf) <= 1e-9) continue

    const radius = chord / (2 * sinHalf)
    const alpha = (Math.PI - theta) / 2
    const phi = Math.atan2(dy, dx)
    const centerAngle = phi + (start.bulge > 0 ? alpha : -alpha)
    const cx = start.x + radius * Math.cos(centerAngle)
    const cy = start.y + radius * Math.sin(centerAngle)
    const startAngle = Math.atan2(start.y - cy, start.x - cx)
    const sweep = start.bulge > 0 ? theta : -theta

    for (let step = 1; step < ARC_SAMPLE_SEGMENTS; step++) {
      const angle = startAngle + (sweep * step) / ARC_SAMPLE_SEGMENTS
      sampled.push([
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ])
    }
  }

  return closeRingPoints(sampled)
}

function getOuterRingForPour(pour: PcbCopperPour): Ring {
  if (pour.shape === "brep") {
    if (!pour.brep_shape?.outer_ring) return []
    return sampleBrepRing(pour.brep_shape.outer_ring)
  }

  if (pour.shape === "rect") {
    const halfW = pour.width / 2
    const halfH = pour.height / 2
    const rotationTransform = pour.rotation
      ? rotate((pour.rotation * Math.PI) / 180)
      : identity()
    const transform = compose(
      translate(pour.center.x, pour.center.y),
      rotationTransform,
    )
    const corners: Ring = [
      [-halfW, halfH],
      [halfW, halfH],
      [halfW, -halfH],
      [-halfW, -halfH],
    ].map(([x, y]) => {
      const pt = applyToPoint(transform, { x, y })
      return [pt.x, pt.y]
    })
    return closeRingPoints(corners)
  }

  if (pour.shape === "polygon") {
    return closeRingPoints(pour.points.map((pt) => [pt.x, pt.y]))
  }

  return []
}

function getUnsignedRingArea(ring: Ring): number {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(sum) / 2
}

function doesHoleOverlapPour(holeRing: Ring, outerRing: Ring): boolean {
  if (holeRing.length < 4 || outerRing.length < 4) return false
  try {
    return polygonClipping.intersection([[holeRing]], [[outerRing]]).length > 0
  } catch {
    return false
  }
}

/**
 * Orders copper pours on a single layer so any enclosing BRep pour whose `LPC`
 * inner-ring cutouts contain a nested island pour is emitted before that island,
 * while preserving original declaration order for non-nested pours.
 */
export function sortCopperPoursForLayer(
  circuitJson: AnyCircuitElement[],
  layer: LayerRef,
): PcbCopperPour[] {
  const pours: PcbCopperPour[] = []
  for (const element of circuitJson) {
    if (element.type === "pcb_copper_pour" && element.layer === layer) {
      pours.push(element)
    }
  }
  if (pours.length <= 1) return pours

  const geometries = pours.map((pour) => {
    const outerRing = getOuterRingForPour(pour)
    const innerRings =
      pour.shape === "brep" && pour.brep_shape?.inner_rings
        ? pour.brep_shape.inner_rings
            .map(sampleBrepRing)
            .filter((ring) => ring.length >= 4)
        : []
    return {
      outerRing,
      outerArea: getUnsignedRingArea(outerRing),
      innerRings,
    }
  })

  const mustPrecede: number[][] = Array.from({ length: pours.length }, () => [])
  const inDegree = new Array<number>(pours.length).fill(0)

  for (let i = 0; i < pours.length; i++) {
    if (geometries[i].innerRings.length === 0) continue
    for (let j = 0; j < pours.length; j++) {
      if (i === j) continue
      const iClearsJ = geometries[i].innerRings.some((hole) =>
        doesHoleOverlapPour(hole, geometries[j].outerRing),
      )
      if (!iClearsJ) continue

      const jClearsI = geometries[j].innerRings.some((hole) =>
        doesHoleOverlapPour(hole, geometries[i].outerRing),
      )
      if (jClearsI && geometries[j].outerArea > geometries[i].outerArea) {
        continue
      }

      mustPrecede[i].push(j)
      inDegree[j]++
    }
  }

  const visited = new Array<boolean>(pours.length).fill(false)
  const ordered: PcbCopperPour[] = []

  for (let step = 0; step < pours.length; step++) {
    let chosen = -1
    for (let idx = 0; idx < pours.length; idx++) {
      if (!visited[idx] && inDegree[idx] === 0) {
        chosen = idx
        break
      }
    }
    if (chosen === -1) {
      let bestArea = -1
      for (let idx = 0; idx < pours.length; idx++) {
        if (!visited[idx] && geometries[idx].outerArea > bestArea) {
          bestArea = geometries[idx].outerArea
          chosen = idx
        }
      }
    }

    visited[chosen] = true
    ordered.push(pours[chosen])
    for (const dependent of mustPrecede[chosen]) {
      inDegree[dependent]--
    }
  }

  return ordered
}

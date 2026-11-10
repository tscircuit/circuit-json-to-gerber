import { applyToPoint, compose, rotate, translate } from "transformation-matrix"

export const isGeometryChangingRectRotation = ({
  width,
  height,
  ccwRotationDegrees,
}: {
  width: number
  height: number
  ccwRotationDegrees: number
}) => {
  if (!Number.isFinite(ccwRotationDegrees)) return false
  const isSquare = Math.abs(width - height) <= 1e-9
  const symmetryPeriod = isSquare ? 90 : 180
  const normalizedRotation =
    ((ccwRotationDegrees % symmetryPeriod) + symmetryPeriod) % symmetryPeriod

  return normalizedRotation > 1e-9 && symmetryPeriod - normalizedRotation > 1e-9
}

export const getRotatedRectPoints = ({
  center,
  width,
  height,
  ccwRotationDegrees,
}: {
  center: { x: number; y: number }
  width: number
  height: number
  ccwRotationDegrees: number
}) => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const safeRotationDegrees = Number.isFinite(ccwRotationDegrees)
    ? ccwRotationDegrees
    : 0
  const ccwRotationRadians = (safeRotationDegrees * Math.PI) / 180
  const rectToPcbTransform = compose(
    translate(center.x, center.y),
    rotate(ccwRotationRadians),
  )

  return [
    { x: -halfWidth, y: halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: -halfWidth, y: -halfHeight },
  ].map((point) => {
    const transformed = applyToPoint(rectToPcbTransform, point)
    return {
      x: Math.abs(transformed.x) < 1e-12 ? 0 : transformed.x,
      y: Math.abs(transformed.y) < 1e-12 ? 0 : transformed.y,
    }
  })
}

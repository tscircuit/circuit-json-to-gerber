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
  const ccwRotationRadians = (ccwRotationDegrees * Math.PI) / 180
  const rectToPcbTransform = compose(
    translate(center.x, center.y),
    rotate(ccwRotationRadians),
  )

  return [
    { x: -halfWidth, y: halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: -halfWidth, y: -halfHeight },
  ].map((point) => applyToPoint(rectToPcbTransform, point))
}

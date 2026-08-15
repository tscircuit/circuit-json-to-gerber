import { applyToPoint, compose, rotate, translate } from "transformation-matrix"

export const isGeometryChangingSquareRotation = ({
  width,
  height,
  ccwRotationDegrees,
}: {
  width: number
  height: number
  ccwRotationDegrees: number
}) => {
  if (Math.abs(width - height) > 1e-9) return false

  const normalizedQuarterTurn = ((ccwRotationDegrees % 90) + 90) % 90
  return normalizedQuarterTurn > 1e-9 && 90 - normalizedQuarterTurn > 1e-9
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

import type { gerberBuilder } from "../gerber-builder"

export const drawRingToBuilder = ({
  builder,
  ring,
  flipYAxis = false,
}: {
  builder: ReturnType<typeof gerberBuilder>
  ring: {
    vertices: Array<{ x: number; y: number; bulge?: number }>
  }
  flipYAxis?: boolean
}) => {
  const firstVertex = ring.vertices[0]
  if (!firstVertex) return

  builder.add("move_operation", {
    x: firstVertex.x,
    y: flipYAxis ? -firstVertex.y : firstVertex.y,
  })

  const verticesLoop = [...ring.vertices, firstVertex]

  for (let i = 0; i < verticesLoop.length - 1; i++) {
    const start = verticesLoop[i]
    const end = verticesLoop[i + 1]
    if (!start || !end) continue

    const endY = flipYAxis ? -end.y : end.y
    const unflippedBulge = start.bulge

    if (unflippedBulge && Math.abs(unflippedBulge) > 1e-9) {
      const gerberBulge = (flipYAxis ? -1 : 1) * unflippedBulge
      if (gerberBulge > 0) {
        builder.add("set_movement_mode_to_counterclockwise_circular", {})
      } else {
        builder.add("set_movement_mode_to_clockwise_circular", {})
      }

      const dx = end.x - start.x
      const dy = end.y - start.y
      const d = Math.sqrt(dx * dx + dy * dy)

      if (d < 1e-9) {
        builder.add("set_movement_mode_to_linear", {})
        builder.add("plot_operation", { x: end.x, y: endY })
        continue
      }

      const absB = Math.abs(unflippedBulge)
      const theta = 4 * Math.atan(absB)
      if (Math.abs(Math.sin(theta / 2)) < 1e-9) {
        builder.add("set_movement_mode_to_linear", {})
        builder.add("plot_operation", { x: end.x, y: endY })
        continue
      }

      const radius = d / (2 * Math.sin(theta / 2))
      const alpha = (Math.PI - theta) / 2
      const phi = Math.atan2(dy, dx)
      const deltaAngle = unflippedBulge > 0 ? alpha : -alpha
      const angleStartToCenter = phi + deltaAngle
      const centerX = start.x + radius * Math.cos(angleStartToCenter)
      const centerY = start.y + radius * Math.sin(angleStartToCenter)

      const iOffset = centerX - start.x
      const jOffset = centerY - start.y

      builder.add("plot_operation", {
        x: end.x,
        y: endY,
        i: iOffset,
        j: flipYAxis ? -jOffset : jOffset,
      })
    } else {
      builder.add("set_movement_mode_to_linear", {})
      builder.add("plot_operation", { x: end.x, y: endY })
    }
  }
}

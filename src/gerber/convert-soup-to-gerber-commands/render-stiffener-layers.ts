import type { AnyCircuitElement, PcbBoard, PcbStiffener } from "circuit-json"
import type { AnyGerberCommand } from "../any_gerber_command"
import { gerberBuilder } from "../gerber-builder"
import type { GerberLayerName } from "./GerberLayerName"
import { getCommandHeaders } from "./getCommandHeaders"
import { getRotatedRectPoints } from "./getRotatedRectPoints"

/**
 * Stiffener geometry is resolved relative to its owning flat board center.
 * Translate it into the world coordinates used by the other Gerber layers,
 * then apply the optional Y-axis flip. Group placement is already baked in.
 */
export const renderStiffenerLayers = (
  circuitJson: AnyCircuitElement[],
  { flip_y_axis = false }: { flip_y_axis?: boolean },
): Record<string, AnyGerberCommand[]> => {
  const layers: Record<string, AnyGerberCommand[]> = {}
  const boardCenters = new Map(
    circuitJson
      .filter((element): element is PcbBoard => element.type === "pcb_board")
      .map((board) => [board.pcb_board_id, board.center] as const),
  )
  const stiffeners = circuitJson.filter(
    (element): element is PcbStiffener => element.type === "pcb_stiffener",
  )

  for (const stiffener of stiffeners) {
    if (stiffener.shape === "rect") {
      if (
        !Number.isFinite(stiffener.width) ||
        stiffener.width <= 0 ||
        !Number.isFinite(stiffener.height) ||
        stiffener.height <= 0
      ) {
        continue
      }
    } else if (
      !Array.isArray(stiffener.outline) ||
      stiffener.outline.length < 3
    ) {
      continue
    }

    const localPoints =
      stiffener.shape === "rect"
        ? getRotatedRectPoints({
            center: stiffener.center,
            width: stiffener.width,
            height: stiffener.height,
            ccwRotationDegrees: stiffener.rotation ?? 0,
          })
        : stiffener.outline
    const boardCenter = boardCenters.get(stiffener.pcb_board_id) ?? {
      x: 0,
      y: 0,
    }
    const rawPoints = localPoints.map((point) => ({
      x: point.x + boardCenter.x,
      y: point.y + boardCenter.y,
    }))
    const points: Array<{ x: number; y: number }> = []
    for (const point of rawPoints) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      const prev = points[points.length - 1]
      if (prev && prev.x === point.x && prev.y === point.y) continue
      points.push(point)
    }
    if (
      points.length > 1 &&
      points[points.length - 1]!.x === points[0]!.x &&
      points[points.length - 1]!.y === points[0]!.y
    ) {
      points.pop()
    }
    const first = points[0]
    if (!first || points.length < 3) continue

    const prefix = stiffener.layer === "top" ? "F" : "B"
    const layerName: GerberLayerName = `${prefix}_Stiffener_${stiffener.material}`
    layers[layerName] ??= [
      ...getCommandHeaders({
        layer: stiffener.layer,
        layer_type: "stiffener",
      }),
      ...gerberBuilder()
        .add("comment", {
          comment: `Stiffener material: ${stiffener.material}`,
        })
        .add("define_aperture_template", {
          aperture_number: 10,
          standard_template_code: "C",
          diameter: 0.05,
        })
        .add("select_aperture", { aperture_number: 10 })
        .build(),
    ]

    const mfy = (y: number) => (flip_y_axis ? -y : y)
    const builder = gerberBuilder().add("comment", {
      comment: `Stiffener thickness: ${stiffener.thickness} mm${
        stiffener.adhesive_thickness === undefined
          ? ""
          : `; adhesive thickness: ${stiffener.adhesive_thickness} mm`
      }`,
    })
    builder.add("move_operation", { x: first.x, y: mfy(first.y) })
    for (const point of points.slice(1)) {
      builder.add("plot_operation", { x: point.x, y: mfy(point.y) })
    }
    const last = points[points.length - 1]
    if (last.x !== first.x || last.y !== first.y) {
      builder.add("plot_operation", { x: first.x, y: mfy(first.y) })
    }
    layers[layerName].push(...builder.build())
  }

  return layers
}

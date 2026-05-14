import type { AnyCircuitElement, LayerRef } from "circuit-json"
import type { AnyExcellonDrillCommand } from "./any-excellon-drill-command-map"
import { excellonDrill } from "./excellon-drill-builder"

export type DrillLayerSpan = {
  from_layer: LayerRef
  to_layer: LayerRef
}

const getLayerCount = (circuitJson: Array<AnyCircuitElement>) => {
  const board = circuitJson.find((element) => element.type === "pcb_board") as
    | { num_layers?: number }
    | undefined
  if (!board || typeof board.num_layers !== "number") {
    return 2
  }
  return Math.max(2, board.num_layers)
}

const getLayerNumber = (layer: LayerRef, layerCount: number) => {
  if (layer === "top") return 1
  if (layer === "bottom") return layerCount

  const innerLayerMatch = layer.match(/^inner([1-6])$/)
  if (innerLayerMatch) {
    const innerLayerNumber = Number(innerLayerMatch[1])
    if (innerLayerNumber >= 1 && innerLayerNumber <= layerCount - 2) {
      return innerLayerNumber + 1
    }
  }

  throw new Error(`Invalid layer "${layer}" for ${layerCount}-layer board`)
}

const normalizeLayerSpan = (
  span: DrillLayerSpan,
  layerCount: number,
): DrillLayerSpan => {
  const fromLayerNumber = getLayerNumber(span.from_layer, layerCount)
  const toLayerNumber = getLayerNumber(span.to_layer, layerCount)

  if (fromLayerNumber <= toLayerNumber) {
    return span
  }

  return {
    from_layer: span.to_layer,
    to_layer: span.from_layer,
  }
}

const getPlatedElementLayerSpan = (
  element: AnyCircuitElement,
  layerCount: number,
): DrillLayerSpan | undefined => {
  if (element.type !== "pcb_plated_hole" && element.type !== "pcb_via") {
    return undefined
  }

  if (
    "from_layer" in element &&
    typeof element.from_layer === "string" &&
    "to_layer" in element &&
    typeof element.to_layer === "string"
  ) {
    return normalizeLayerSpan(
      {
        from_layer: element.from_layer as LayerRef,
        to_layer: element.to_layer as LayerRef,
      },
      layerCount,
    )
  }

  let layers: LayerRef[] = []
  if ("layers" in element && Array.isArray(element.layers)) {
    layers = element.layers as LayerRef[]
  }
  if (layers.length > 0) {
    const sortedLayers = [...layers].sort(
      (a, b) => getLayerNumber(a, layerCount) - getLayerNumber(b, layerCount),
    )
    return {
      from_layer: sortedLayers[0],
      to_layer: sortedLayers[sortedLayers.length - 1],
    }
  }

  return {
    from_layer: "top",
    to_layer: "bottom",
  }
}

const getDefaultPlatedDrillLayerSpan = (): DrillLayerSpan => ({
  from_layer: "top",
  to_layer: "bottom",
})

const getRequestedLayerSpan = (layer_span?: DrillLayerSpan) => {
  if (layer_span) {
    return layer_span
  }
  return getDefaultPlatedDrillLayerSpan()
}

const isSameLayerSpan = (
  a: DrillLayerSpan,
  b: DrillLayerSpan,
  layerCount: number,
) => {
  const normalizedA = normalizeLayerSpan(a, layerCount)
  const normalizedB = normalizeLayerSpan(b, layerCount)
  return (
    normalizedA.from_layer === normalizedB.from_layer &&
    normalizedA.to_layer === normalizedB.to_layer
  )
}

const shouldIncludeElement = ({
  element,
  is_plated,
  layer_span,
  layerCount,
}: {
  element: AnyCircuitElement
  is_plated: boolean
  layer_span?: DrillLayerSpan
  layerCount: number
}) => {
  if (
    element.type !== "pcb_plated_hole" &&
    element.type !== "pcb_hole" &&
    element.type !== "pcb_via"
  ) {
    return false
  }

  if (!is_plated) return element.type === "pcb_hole"
  if (element.type === "pcb_hole") return false

  const elementLayerSpan = getPlatedElementLayerSpan(element, layerCount)
  if (!elementLayerSpan) return false
  const requestedLayerSpan = getRequestedLayerSpan(layer_span)

  return isSameLayerSpan(elementLayerSpan, requestedLayerSpan, layerCount)
}

const getFileFunctionLayerSpan = ({
  circuitJson,
  is_plated,
  layer_span,
}: {
  circuitJson: Array<AnyCircuitElement>
  is_plated: boolean
  layer_span?: DrillLayerSpan
}) => {
  const layerCount = getLayerCount(circuitJson)
  if (!is_plated) return `NonPlated,1,${layerCount},NPTH`

  const requestedLayerSpan = getRequestedLayerSpan(layer_span)
  const span = normalizeLayerSpan(requestedLayerSpan, layerCount)
  return `Plated,${getLayerNumber(span.from_layer, layerCount)},${getLayerNumber(span.to_layer, layerCount)},PTH`
}

export const convertSoupToExcellonDrillCommands = ({
  circuitJson,
  is_plated,
  flip_y_axis = false,
  layer_span,
}: {
  circuitJson: Array<AnyCircuitElement>
  is_plated: boolean
  flip_y_axis?: boolean
  layer_span?: DrillLayerSpan
}): Array<AnyExcellonDrillCommand> => {
  const builder = excellonDrill()
  const layerCount = getLayerCount(circuitJson)

  // Start sequence commands
  builder.add("M48", {})

  // Add header comments
  const date_str = new Date().toISOString()
  builder
    .add("header_comment", {
      text: `DRILL file {tscircuit} date ${date_str}`,
    })
    .add("header_comment", {
      text: "FORMAT={-:-/ absolute / metric / decimal}",
    })
    .add("header_attribute", {
      attribute_name: "TF.CreationDate",
      attribute_value: date_str,
    })
    .add("header_attribute", {
      attribute_name: "TF.GenerationSoftware",
      attribute_value: "tscircuit",
    })
    .add("header_attribute", {
      attribute_name: "TF.FileFunction",
      attribute_value: getFileFunctionLayerSpan({
        circuitJson,
        is_plated,
        layer_span,
      }),
    })
    .add("FMAT", { format: 2 }) // Assuming format 2 for the example
    .add("unit_format", { unit: "METRIC", lz: null })

  let tool_counter = 10 // Start tool numbering from 10 for example

  const diameterToToolNumber: Record<number, number> = {}

  // Define tools
  for (const element of circuitJson) {
    if (
      !shouldIncludeElement({
        element,
        is_plated,
        layer_span,
        layerCount,
      })
    ) {
      continue
    }

    const holeDiameter =
      "hole_diameter" in element && typeof element.hole_diameter === "number"
        ? element.hole_diameter
        : "hole_width" in element &&
            typeof element.hole_width === "number" &&
            "hole_height" in element &&
            typeof element.hole_height === "number"
          ? Math.min(element.hole_width, element.hole_height)
          : undefined

    if (!holeDiameter) continue

    if (!diameterToToolNumber[holeDiameter]) {
      builder.add("aper_function_header", {
        is_plated,
      })
      builder.add("define_tool", {
        tool_number: tool_counter,
        diameter: holeDiameter,
      })
      diameterToToolNumber[holeDiameter] = tool_counter
      tool_counter++
    }
  }

  builder.add("percent_sign", {})
  builder.add("G90", {})
  builder.add("G05", {})

  // --------------------
  // Execute drills/slots
  // --------------------
  for (let i = 10; i < tool_counter; i++) {
    builder.add("use_tool", { tool_number: i })
    for (const element of circuitJson) {
      if (
        element.type === "pcb_plated_hole" ||
        element.type === "pcb_hole" ||
        element.type === "pcb_via"
      ) {
        if (
          !shouldIncludeElement({
            element,
            is_plated,
            layer_span,
            layerCount,
          })
        ) {
          continue
        }

        const holeDiameter =
          "hole_diameter" in element &&
          typeof element.hole_diameter === "number"
            ? element.hole_diameter
            : "hole_width" in element &&
                typeof element.hole_width === "number" &&
                "hole_height" in element &&
                typeof element.hole_height === "number"
              ? Math.min(element.hole_width, element.hole_height)
              : undefined

        if (!holeDiameter || diameterToToolNumber[holeDiameter] !== i) {
          continue
        }

        const elementX =
          "x" in element && typeof element.x === "number" ? element.x : 0
        const elementY =
          "y" in element && typeof element.y === "number" ? element.y : 0
        const offsetX =
          "hole_offset_x" in element &&
          typeof element.hole_offset_x === "number"
            ? element.hole_offset_x
            : 0
        const offsetY =
          "hole_offset_y" in element &&
          typeof element.hole_offset_y === "number"
            ? element.hole_offset_y
            : 0
        const centerX = elementX + offsetX
        const centerY = elementY + offsetY
        const yMultiplier = flip_y_axis ? -1 : 1

        if (
          "hole_width" in element &&
          typeof element.hole_width === "number" &&
          "hole_height" in element &&
          typeof element.hole_height === "number"
        ) {
          const holeWidth = element.hole_width
          const holeHeight = element.hole_height
          const maxDim = Math.max(holeWidth, holeHeight)
          const minDim = Math.min(holeWidth, holeHeight)

          if (Math.abs(maxDim - minDim) <= 1e-6) {
            builder.add("drill_at", {
              x: centerX,
              y: centerY * yMultiplier,
            })
            continue
          }

          const rotationDegrees =
            "hole_ccw_rotation" in element &&
            typeof element.hole_ccw_rotation === "number"
              ? element.hole_ccw_rotation
              : "ccw_rotation" in element &&
                  typeof element.ccw_rotation === "number"
                ? element.ccw_rotation
                : 0
          const rotationRadians = (rotationDegrees * Math.PI) / 180
          const cosTheta = Math.cos(rotationRadians)
          const sinTheta = Math.sin(rotationRadians)

          const isWidthMajor = holeWidth >= holeHeight
          const slotHalfLength = (maxDim - minDim) / 2
          const startRelative = isWidthMajor
            ? { x: -slotHalfLength, y: 0 }
            : { x: 0, y: -slotHalfLength }
          const endRelative = isWidthMajor
            ? { x: slotHalfLength, y: 0 }
            : { x: 0, y: slotHalfLength }

          const rotatePoint = ({ x, y }: { x: number; y: number }) => ({
            x: x * cosTheta - y * sinTheta,
            y: x * sinTheta + y * cosTheta,
          })

          const startPoint = rotatePoint(startRelative)
          const endPoint = rotatePoint(endRelative)

          const startX = centerX + startPoint.x
          const startY = (centerY + startPoint.y) * yMultiplier
          const endX = centerX + endPoint.x
          const endY = (centerY + endPoint.y) * yMultiplier

          builder
            .add("drill_at", {
              x: startX,
              y: startY,
            })
            .add("G85", {
              x: endX,
              y: endY,
              width: minDim,
            })
          continue
        }

        builder.add("drill_at", {
          x: centerX,
          y: centerY * yMultiplier,
        })
      }
    }
  }

  builder.add("M30", {})

  return builder.build()
}

const getDrillLayerSpanKey = (span: DrillLayerSpan, layerCount: number) => {
  const normalizedSpan = normalizeLayerSpan(span, layerCount)
  return `L${getLayerNumber(normalizedSpan.from_layer, layerCount)}-L${getLayerNumber(normalizedSpan.to_layer, layerCount)}`
}

const hasDrillGeometry = (element: AnyCircuitElement) => {
  if ("hole_diameter" in element && typeof element.hole_diameter === "number") {
    return true
  }

  return (
    "hole_width" in element &&
    typeof element.hole_width === "number" &&
    "hole_height" in element &&
    typeof element.hole_height === "number"
  )
}

export const convertSoupToExcellonDrillCommandLayers = ({
  circuitJson,
  flip_y_axis = false,
}: {
  circuitJson: Array<AnyCircuitElement>
  flip_y_axis?: boolean
}): Record<string, Array<AnyExcellonDrillCommand>> => {
  const layerCount = getLayerCount(circuitJson)
  const platedSpans = new Map(
    circuitJson.flatMap((element): Array<[string, DrillLayerSpan]> => {
      const span = getPlatedElementLayerSpan(element, layerCount)
      if (!span) {
        return []
      }
      return [[getDrillLayerSpanKey(span, layerCount), span]]
    }),
  )
  const platedDrillLayers = Object.fromEntries(
    [...platedSpans.entries()].sort().map(([spanKey, span]) => [
      `drill-${spanKey}.drl`,
      convertSoupToExcellonDrillCommands({
        circuitJson,
        is_plated: true,
        flip_y_axis,
        layer_span: span,
      }),
    ]),
  )
  const hasNonPlatedDrill = circuitJson.some((element) => {
    if (element.type !== "pcb_hole") {
      return false
    }

    return hasDrillGeometry(element)
  })

  if (!hasNonPlatedDrill) {
    return platedDrillLayers
  }

  return {
    ...platedDrillLayers,
    "drill_npth.drl": convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: false,
      flip_y_axis,
    }),
  }
}

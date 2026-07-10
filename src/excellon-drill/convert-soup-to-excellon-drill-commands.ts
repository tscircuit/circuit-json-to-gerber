import type { AnyCircuitElement, LayerRef } from "circuit-json"
import type { AnyExcellonDrillCommand } from "./any-excellon-drill-command-map"
import { excellonDrill } from "./excellon-drill-builder"
import polygonClipping, { type Polygon, type Ring } from "polygon-clipping"
import { getBoundFromCenteredRect } from "@tscircuit/math-utils"

export type DrillLayerSpan = {
  from_layer: LayerRef
  to_layer: LayerRef
}

type InternalCircularCutoutDrillElement = Extract<
  AnyCircuitElement,
  { type: "pcb_cutout"; shape: "circle" }
>

type DrillElement =
  | Exclude<AnyCircuitElement, { type: "pcb_cutout" }>
  | InternalCircularCutoutDrillElement

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

const getTraceRouteViaElements = (
  circuitJson: Array<AnyCircuitElement>,
): Array<AnyCircuitElement> => {
  const routeVias: Array<AnyCircuitElement> = []

  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") {
      continue
    }

    for (const [index, point] of element.route.entries()) {
      if (
        point.route_type !== "via" ||
        typeof point.hole_diameter !== "number" ||
        typeof point.outer_diameter !== "number" ||
        typeof point.from_layer !== "string" ||
        typeof point.to_layer !== "string"
      ) {
        continue
      }

      const fromLayer = point.from_layer as LayerRef
      const toLayer = point.to_layer as LayerRef

      routeVias.push({
        type: "pcb_via",
        pcb_via_id: `${element.pcb_trace_id}_route_via_${index}`,
        x: point.x,
        y: point.y,
        hole_diameter: point.hole_diameter,
        outer_diameter: point.outer_diameter,
        from_layer: fromLayer,
        to_layer: toLayer,
        layers: [fromLayer, toLayer],
      })
    }
  }

  return routeVias
}

const getDrillableElements = (circuitJson: Array<AnyCircuitElement>) => [
  ...circuitJson,
  ...getTraceRouteViaElements(circuitJson),
]

const circleCutoutPolygonSegmentCount = 64

const getBoardOutlinePolygons = (
  circuitJson: Array<AnyCircuitElement>,
): Array<Polygon> => {
  return circuitJson.flatMap((element) => {
    if (element.type !== "pcb_board") {
      return []
    }

    if (element.outline && element.outline.length > 2) {
      return [[element.outline.map((point) => [point.x, point.y])]]
    }

    const bounds = getBoundFromCenteredRect({
      center: element.center!,
      width: element.width!,
      height: element.height!,
    })

    return [
      [
        [
          [bounds.minX, bounds.minY],
          [bounds.maxX, bounds.minY],
          [bounds.maxX, bounds.maxY],
          [bounds.minX, bounds.maxY],
        ],
      ],
    ]
  })
}

const getCircleCutoutPolygon = (
  cutout: InternalCircularCutoutDrillElement,
): Polygon => {
  const points: Ring = []

  for (let i = 0; i < circleCutoutPolygonSegmentCount; i++) {
    const angle = (i / circleCutoutPolygonSegmentCount) * Math.PI * 2
    points.push([
      cutout.center.x + cutout.radius * Math.cos(angle),
      cutout.center.y + cutout.radius * Math.sin(angle),
    ])
  }

  return [points]
}

const isInternalCircularCutout = ({
  cutout,
  boardOutlinePolygons,
}: {
  cutout: InternalCircularCutoutDrillElement
  boardOutlinePolygons: Array<Polygon>
}) => {
  const cutoutPolygon = getCircleCutoutPolygon(cutout)

  return boardOutlinePolygons.some((boardOutlinePolygon) => {
    const overlapsBoard =
      polygonClipping.intersection(boardOutlinePolygon, cutoutPolygon).length >
      0
    const extendsOutsideBoard =
      polygonClipping.difference(cutoutPolygon, boardOutlinePolygon).length > 0

    return overlapsBoard && !extendsOutsideBoard
  })
}

const getInternalCircularCutoutDrills = (
  circuitJson: Array<AnyCircuitElement>,
): Array<InternalCircularCutoutDrillElement> => {
  const boardOutlinePolygons = getBoardOutlinePolygons(circuitJson)

  return circuitJson.filter(
    (element): element is InternalCircularCutoutDrillElement => {
      if (element.type !== "pcb_cutout") {
        return false
      }

      if (element.shape !== "circle") {
        return false
      }

      return isInternalCircularCutout({
        cutout: element,
        boardOutlinePolygons,
      })
    },
  )
}

const getDrillElements = ({
  circuitJson,
  is_plated,
}: {
  circuitJson: Array<AnyCircuitElement>
  is_plated: boolean
}): Array<DrillElement> => {
  const drillableElements = getDrillableElements(circuitJson).filter(
    (element) => element.type !== "pcb_cutout",
  )

  if (is_plated) {
    return drillableElements
  }

  const internalCircularCutoutDrills =
    getInternalCircularCutoutDrills(circuitJson)

  return [...drillableElements, ...internalCircularCutoutDrills]
}

const getHoleDiameter = (element: DrillElement) => {
  if ("hole_diameter" in element && typeof element.hole_diameter === "number") {
    return element.hole_diameter
  }

  if (element.type === "pcb_cutout") {
    return element.radius * 2
  }

  if (
    "hole_width" in element &&
    typeof element.hole_width === "number" &&
    "hole_height" in element &&
    typeof element.hole_height === "number"
  ) {
    return Math.min(element.hole_width, element.hole_height)
  }

  return undefined
}

const getDrillCenter = (element: DrillElement) => {
  if (element.type === "pcb_cutout") {
    return element.center
  }

  let x = 0
  let y = 0
  let holeOffsetX = 0
  let holeOffsetY = 0

  if ("x" in element && typeof element.x === "number") {
    x = element.x
  }

  if ("y" in element && typeof element.y === "number") {
    y = element.y
  }

  if ("hole_offset_x" in element && typeof element.hole_offset_x === "number") {
    holeOffsetX = element.hole_offset_x
  }

  if ("hole_offset_y" in element && typeof element.hole_offset_y === "number") {
    holeOffsetY = element.hole_offset_y
  }

  return {
    x: x + holeOffsetX,
    y: y + holeOffsetY,
  }
}

const getYMultiplier = (flip_y_axis: boolean) => {
  if (flip_y_axis) {
    return -1
  }

  return 1
}

const getSlotEndpoints = ({
  holeWidth,
  holeHeight,
  slotHalfLength,
}: {
  holeWidth: number
  holeHeight: number
  slotHalfLength: number
}) => {
  let startRelative = { x: 0, y: -slotHalfLength }
  let endRelative = { x: 0, y: slotHalfLength }

  if (holeWidth >= holeHeight) {
    startRelative = { x: -slotHalfLength, y: 0 }
    endRelative = { x: slotHalfLength, y: 0 }
  }

  return { startRelative, endRelative }
}

const getHoleRotationDegrees = (element: DrillElement) => {
  if (
    "hole_ccw_rotation" in element &&
    typeof element.hole_ccw_rotation === "number"
  ) {
    return element.hole_ccw_rotation
  }

  if ("ccw_rotation" in element && typeof element.ccw_rotation === "number") {
    return element.ccw_rotation
  }

  return 0
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
  const drillElements = getDrillElements({
    circuitJson,
    is_plated,
  })

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
  for (const element of drillElements) {
    if (
      element.type !== "pcb_cutout" &&
      !shouldIncludeElement({
        element,
        is_plated,
        layer_span,
        layerCount,
      })
    ) {
      continue
    }
    if (is_plated && element.type === "pcb_hole") {
      continue
    }

    const holeDiameter = getHoleDiameter(element)

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
    for (const element of drillElements) {
      if (
        element.type === "pcb_plated_hole" ||
        element.type === "pcb_hole" ||
        element.type === "pcb_via" ||
        element.type === "pcb_cutout"
      ) {
        if (
          element.type !== "pcb_cutout" &&
          !shouldIncludeElement({
            element,
            is_plated,
            layer_span,
            layerCount,
          })
        ) {
          continue
        }
        if (is_plated && element.type === "pcb_hole") {
          continue
        }

        const holeDiameter = getHoleDiameter(element)

        if (!holeDiameter || diameterToToolNumber[holeDiameter] !== i) {
          continue
        }

        const drillCenter = getDrillCenter(element)
        const centerX = drillCenter.x
        const centerY = drillCenter.y
        const yMultiplier = getYMultiplier(flip_y_axis)

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

          const rotationDegrees = getHoleRotationDegrees(element)
          const rotationRadians = (rotationDegrees * Math.PI) / 180
          const cosTheta = Math.cos(rotationRadians)
          const sinTheta = Math.sin(rotationRadians)

          const slotHalfLength = (maxDim - minDim) / 2
          const { startRelative, endRelative } = getSlotEndpoints({
            holeWidth,
            holeHeight,
            slotHalfLength,
          })

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
    getDrillableElements(circuitJson).flatMap(
      (element): Array<[string, DrillLayerSpan]> => {
        const span = getPlatedElementLayerSpan(element, layerCount)
        if (!span) {
          return []
        }
        return [[getDrillLayerSpanKey(span, layerCount), span]]
      },
    ),
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
    return element.type === "pcb_hole" && hasDrillGeometry(element)
  })

  const hasInternalCircularCutoutDrill =
    getInternalCircularCutoutDrills(circuitJson).length > 0

  if (!hasNonPlatedDrill && !hasInternalCircularCutoutDrill) {
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

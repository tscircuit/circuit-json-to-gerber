import type { AnyCircuitElement } from "circuit-json"

const getInnerLayerIndex = (layer: unknown): number => {
  if (typeof layer !== "string") return 0
  const match = layer.match(/^inner(\d+)$/)
  if (!match) return 0
  const index = Number(match[1])
  return Number.isInteger(index) && index > 0 ? index : 0
}

/**
 * Determine the total copper layer count (2..10) from explicit board metadata
 * and any inner-layer copper/via elements present in Circuit JSON.
 */
export const getBoardLayerCount = (
  circuitJson: Array<AnyCircuitElement>,
): number => {
  let maxBoardLayers = 0
  let maxInnerLayerIndex = 0

  const recordLayer = (layer: unknown) => {
    maxInnerLayerIndex = Math.max(maxInnerLayerIndex, getInnerLayerIndex(layer))
  }

  for (const element of circuitJson) {
    if (element.type === "pcb_board") {
      const board = element as { num_layers?: number; layers?: number }
      const boardLayers =
        typeof board.num_layers === "number"
          ? board.num_layers
          : typeof board.layers === "number"
            ? board.layers
            : 0
      maxBoardLayers = Math.max(maxBoardLayers, boardLayers)
      continue
    }

    if ("layer" in element) {
      recordLayer(element.layer)
    }
    if ("layers" in element && Array.isArray(element.layers)) {
      for (const layer of element.layers) {
        recordLayer(layer)
      }
    }
    if ("from_layer" in element) {
      recordLayer(element.from_layer)
    }
    if ("to_layer" in element) {
      recordLayer(element.to_layer)
    }
    if (element.type === "pcb_trace" && Array.isArray(element.route)) {
      for (const point of element.route) {
        if ("layer" in point) recordLayer(point.layer)
        if ("from_layer" in point) recordLayer(point.from_layer)
        if ("to_layer" in point) recordLayer(point.to_layer)
        if ("start_layer" in point) recordLayer(point.start_layer)
        if ("end_layer" in point) recordLayer(point.end_layer)
      }
    }
  }

  const minLayersForInner =
    maxInnerLayerIndex > 0
      ? maxInnerLayerIndex + 2 + (maxInnerLayerIndex % 2)
      : 2
  const numLayers =
    maxBoardLayers >= maxInnerLayerIndex + 2
      ? maxBoardLayers
      : Math.max(maxBoardLayers, minLayersForInner)

  return Math.max(2, Math.min(10, numLayers))
}

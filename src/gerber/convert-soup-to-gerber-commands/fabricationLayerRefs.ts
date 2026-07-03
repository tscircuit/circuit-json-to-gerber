import type { AnyCircuitElement, LayerRef } from "circuit-json"

export const outerLayerRefs = ["top", "bottom"] as const

export type OuterLayerRef = (typeof outerLayerRefs)[number]

export const isOuterLayerRef = (
  layerRef: LayerRef | "edgecut",
): layerRef is OuterLayerRef => layerRef === "top" || layerRef === "bottom"

const isFabricationElementOnLayer = (
  element: AnyCircuitElement,
  layerRef: OuterLayerRef,
) =>
  (element.type === "pcb_fabrication_note_text" ||
    element.type === "pcb_fabrication_note_path" ||
    element.type === "pcb_fabrication_note_rect" ||
    element.type === "pcb_fabrication_note_dimension") &&
  element.layer === layerRef

export const getFabricationLayerRefs = (
  circuitJson: AnyCircuitElement[],
): OuterLayerRef[] =>
  outerLayerRefs.filter((layerRef) =>
    circuitJson.some((element) =>
      isFabricationElementOnLayer(element, layerRef),
    ),
  )

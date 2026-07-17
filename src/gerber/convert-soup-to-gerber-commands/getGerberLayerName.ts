import type { LayerRef } from "circuit-json"
import type { GerberLayerName } from "./GerberLayerName"

const outerLayerRefToGerberPrefix = {
  top: "F_",
  bottom: "B_",
} as const
const layerTypeToGerberSuffix = {
  copper: "Cu",
  silkscreen: "SilkScreen",
  fabrication: "Fab",
  soldermask: "Mask",
  mask: "Mask",
  paste: "Paste",
} as const

export const getGerberLayerName = (
  layer_ref: LayerRef | "edgecut",
  layer_type: "copper" | "silkscreen" | "fabrication" | "soldermask" | "paste",
): GerberLayerName => {
  if (layer_ref === "edgecut") return "Edge_Cuts"
  if (layer_ref.startsWith("inner") && layer_type !== "copper") {
    throw new Error(`Inner layer ${layer_ref} only supports copper gerbers`)
  }
  const prefix = layer_ref.startsWith("inner")
    ? `In${layer_ref.slice("inner".length)}_`
    : outerLayerRefToGerberPrefix[
        layer_ref as keyof typeof outerLayerRefToGerberPrefix
      ]
  return `${prefix}${layerTypeToGerberSuffix[layer_type]}` as GerberLayerName
}

import type { LayerRef } from "circuit-json"
import type { GerberLayerName } from "./GerberLayerName"

const layerRefToGerberPrefix: Record<string, string> = {
  top: "F_",
  bottom: "B_",
  inner1: "In1_",
  inner2: "In2_",
  inner3: "In3_",
  inner4: "In4_",
}
const layerTypeToGerberSuffix = {
  copper: "Cu",
  silkscreen: "SilkScreen",
  soldermask: "Mask",
  mask: "Mask",
  paste: "Paste",
} as const

export const getGerberLayerName = (
  layer_ref: LayerRef | "edgecut",
  layer_type: "copper" | "silkscreen" | "soldermask" | "paste",
): GerberLayerName => {
  if (layer_ref === "edgecut") return "Edge_Cuts"
  const prefix = layerRefToGerberPrefix[layer_ref as string]
  if (!prefix) {
    throw new Error(`Unknown layer ref: ${layer_ref}`)
  }
  return `${prefix}${layerTypeToGerberSuffix[layer_type]}` as GerberLayerName
}

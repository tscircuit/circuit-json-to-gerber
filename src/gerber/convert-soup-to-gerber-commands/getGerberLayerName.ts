import type { LayerRef } from "circuit-json"
import type { GerberLayerName } from "./GerberLayerName"

const layerRefToGerberPrefix = {
  top: "F_",
  bottom: "B_",
  inner1: "In1_",
  inner2: "In2_",
  inner3: "In3_",
  inner4: "In4_",
  inner5: "In5_",
  inner6: "In6_",
} as const
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
  if (layer_ref.startsWith("inner") && layer_type !== "copper") {
    throw new Error(`Inner layer ${layer_ref} only supports copper gerbers`)
  }
  return `${layerRefToGerberPrefix[layer_ref as keyof typeof layerRefToGerberPrefix]}${layerTypeToGerberSuffix[layer_type]}`
}

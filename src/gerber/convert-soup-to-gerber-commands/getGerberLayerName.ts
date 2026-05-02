import type { LayerRef } from "circuit-json"
import type {
  GerberLayerName,
  LayerToGerberCommandsMap,
} from "./GerberLayerName"

const layerRefToGerberPrefix = {
  top: "F_",
  bottom: "B_",
  inner1: "In1_",
  inner2: "In2_",
  inner3: "In3_",
  inner4: "In4_",
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
): keyof LayerToGerberCommandsMap => {
  if (layer_ref === "edgecut") return "Edge_Cuts"
  const name = `${layerRefToGerberPrefix[layer_ref as keyof typeof layerRefToGerberPrefix]}${layerTypeToGerberSuffix[layer_type]}`
  return name as keyof LayerToGerberCommandsMap
}

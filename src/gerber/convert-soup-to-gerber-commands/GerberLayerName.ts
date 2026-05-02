import type { AnyGerberCommand } from "../any_gerber_command"
import type { GerberJobJson } from "./gerber-job-json"

export type LayerToGerberCommandsMap = {
  F_Cu: AnyGerberCommand[]
  F_SilkScreen: AnyGerberCommand[]
  F_Mask: AnyGerberCommand[]
  F_Paste: AnyGerberCommand[]
  B_Cu: AnyGerberCommand[]
  B_SilkScreen: AnyGerberCommand[]
  B_Mask: AnyGerberCommand[]
  B_Paste: AnyGerberCommand[]
  In1_Cu: AnyGerberCommand[]
  In2_Cu: AnyGerberCommand[]
  Edge_Cuts: AnyGerberCommand[]
}

export const ALL_GERBER_LAYER_NAMES = [
  "F_Cu",
  "F_SilkScreen",
  "F_Mask",
  "F_Paste",
  "B_Cu",
  "B_SilkScreen",
  "B_Mask",
  "B_Paste",
  "In1_Cu",
  "In2_Cu",
  "Edge_Cuts",
] as const

export type GerberLayerName = keyof LayerToGerberCommandsMap

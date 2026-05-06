import type { AnyGerberCommand } from "../any_gerber_command"

export type LayerToGerberCommandsMap = {
  [key: string]: AnyGerberCommand[]
  F_Cu: AnyGerberCommand[]
  F_SilkScreen: AnyGerberCommand[]
  F_Mask: AnyGerberCommand[]
  F_Paste: AnyGerberCommand[]
  B_Cu: AnyGerberCommand[]
  B_SilkScreen: AnyGerberCommand[]
  B_Mask: AnyGerberCommand[]
  B_Paste: AnyGerberCommand[]
  Edge_Cuts: AnyGerberCommand[]
}

export type GerberLayerName = keyof LayerToGerberCommandsMap

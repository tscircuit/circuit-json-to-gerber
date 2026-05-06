import type { AnyGerberCommand } from "../any_gerber_command"

export type GerberLayerName =
  | "F_Cu"
  | "F_SilkScreen"
  | "F_Mask"
  | "F_Paste"
  | "B_Cu"
  | "B_SilkScreen"
  | "B_Mask"
  | "B_Paste"
  | "In1_Cu"
  | "In2_Cu"
  | "In3_Cu"
  | "In4_Cu"
  | "In5_Cu"
  | "In6_Cu"
  | "Edge_Cuts"

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

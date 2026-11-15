import { getCommandHeaders } from "../src/gerber/convert-soup-to-gerber-commands/getCommandHeaders"
import { stringifyGerberCommands } from "../src/gerber/stringify-gerber"

const gerberExtensionMap: Record<string, string> = {
  F_Cu: "GTL",
  B_Cu: "GBL",
  F_Mask: "GTS",
  B_Mask: "GBS",
  F_SilkScreen: "GTO",
  B_SilkScreen: "GBO",
  F_Fab: "GTF",
  B_Fab: "GBF",
  F_Paste: "GTP",
  B_Paste: "GBP",
  Edge_Cuts: "GKO",
}

export const getGerberDownloadFilename = (layerName: string) => {
  if (layerName.endsWith(".drl")) return layerName
  const extension = gerberExtensionMap[layerName] ?? "gbr"
  return `${layerName}.${extension}`
}

export const getGerberPreviewLayerNames = (
  gerberOutput: Record<string, string>,
) =>
  Object.keys(gerberOutput).filter((layerName) => !layerName.endsWith(".drl"))

const getEmptyFabricationGerber = (layer: "top" | "bottom") =>
  stringifyGerberCommands(
    getCommandHeaders({
      layer,
      layer_type: "fabrication",
    }),
  )

export const ensureFabricationGerberLayers = (
  gerberOutput: Record<string, string>,
): Record<string, string> => ({
  ...gerberOutput,
  F_Fab: gerberOutput.F_Fab ?? getEmptyFabricationGerber("top"),
  B_Fab: gerberOutput.B_Fab ?? getEmptyFabricationGerber("bottom"),
})

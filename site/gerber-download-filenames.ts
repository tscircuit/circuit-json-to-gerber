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

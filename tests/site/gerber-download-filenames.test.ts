import { expect, test } from "bun:test"
import {
  ensureFabricationGerberLayers,
  getGerberDownloadFilename,
  getGerberPreviewLayerNames,
} from "../../site/gerber-download-filenames"

test("maps fabrication layers to zip filenames", () => {
  expect(getGerberDownloadFilename("F_Fab")).toBe("F_Fab.GTF")
  expect(getGerberDownloadFilename("B_Fab")).toBe("B_Fab.GBF")
})

test("keeps drill filenames unchanged", () => {
  expect(getGerberDownloadFilename("drill.drl")).toBe("drill.drl")
  expect(getGerberDownloadFilename("drill_npth.drl")).toBe("drill_npth.drl")
})

test("includes fabrication layers in preview layer names", () => {
  expect(
    getGerberPreviewLayerNames({
      F_Cu: "",
      F_Fab: "",
      B_Fab: "",
      "drill.drl": "",
      "drill_npth.drl": "",
    }),
  ).toEqual(["F_Cu", "F_Fab", "B_Fab"])
})

test("adds empty fabrication gerbers when missing from site output", () => {
  const gerberOutput = ensureFabricationGerberLayers({
    F_Cu: "top copper",
  })

  expect(gerberOutput.F_Cu).toBe("top copper")
  expect(gerberOutput.F_Fab).toContain("%TF.FileFunction,Other,Fab,Top*%")
  expect(gerberOutput.B_Fab).toContain("%TF.FileFunction,Other,Fab,Bot*%")
})

test("preserves generated fabrication gerbers", () => {
  const gerberOutput = ensureFabricationGerberLayers({
    F_Fab: "generated top fab",
    B_Fab: "generated bottom fab",
  })

  expect(gerberOutput.F_Fab).toBe("generated top fab")
  expect(gerberOutput.B_Fab).toBe("generated bottom fab")
})

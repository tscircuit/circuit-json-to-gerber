import { expect, test } from "bun:test"
import { getGerberDownloadFilename } from "../../site/gerber-download-filenames"

test("maps fabrication layers to zip filenames", () => {
  expect(getGerberDownloadFilename("F_Fab")).toBe("F_Fab.GTF")
  expect(getGerberDownloadFilename("B_Fab")).toBe("B_Fab.GBF")
})

test("keeps drill filenames unchanged", () => {
  expect(getGerberDownloadFilename("drill.drl")).toBe("drill.drl")
  expect(getGerberDownloadFilename("drill_npth.drl")).toBe("drill_npth.drl")
})

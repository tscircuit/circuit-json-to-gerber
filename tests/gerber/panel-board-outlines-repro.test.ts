import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { panelBoardOutlines } from "tests/fixtures/panel-board-outlines"
import { renderPanelOutlineComparison } from "tests/fixtures/render-panel-outline-comparison"

test("repro: adding a panel replaces both board profiles with one rectangle", async () => {
  const boardsOnly = panelBoardOutlines.filter((e) => e.type !== "pcb_panel")
  const standalone =
    convertCircuitJsonToGerberFiles(boardsOnly)["Edge_Cuts.gbr"]!
  const panel =
    convertCircuitJsonToGerberFiles(panelBoardOutlines)["Edge_Cuts.gbr"]!

  // These assertions document the current behavior, not the desired output
  // when exporting the boards as separate pieces.
  expect(standalone.match(/D02\*/g)).toHaveLength(2)
  expect(standalone.match(/D01\*/g)).toHaveLength(12)
  expect(panel.match(/D02\*/g)).toHaveLength(1)
  expect(panel.match(/D01\*/g)).toHaveLength(4)

  // The connector notch is present without the panel and missing with it.
  expect(standalone).toContain("X-12000000Y006000000D01*")
  expect(panel).not.toContain("X-12000000Y006000000D01*")

  const comparison = await renderPanelOutlineComparison([
    {
      gerber: standalone,
      title: "Without pcb_panel",
      caption: "Two board profiles; connector notch present",
    },
    {
      gerber: panel,
      title: "With pcb_panel — current behavior",
      caption: "Only the panel rectangle; board profiles missing",
    },
  ])
  await expect(comparison).toMatchSvgSnapshot(
    import.meta.path,
    "panel-board-outlines-repro",
  )
})

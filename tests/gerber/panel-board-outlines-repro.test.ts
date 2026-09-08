import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { panelBoardOutlines } from "tests/fixtures/panel-board-outlines"

test("repro: adding a panel replaces both board profiles with one rectangle", async () => {
  const boardsOnly = panelBoardOutlines.filter((e) => e.type !== "pcb_panel")
  const standaloneFiles = convertCircuitJsonToGerberFiles(boardsOnly)
  const panelFiles = convertCircuitJsonToGerberFiles(panelBoardOutlines)
  const standalone = standaloneFiles["Edge_Cuts.gbr"]!
  const panel = panelFiles["Edge_Cuts.gbr"]!

  // These assertions document the current behavior, not the desired output
  // when exporting the boards as separate pieces.
  expect(standalone.match(/D02\*/g)).toHaveLength(2)
  expect(standalone.match(/D01\*/g)).toHaveLength(12)
  expect(panel.match(/D02\*/g)).toHaveLength(1)
  expect(panel.match(/D01\*/g)).toHaveLength(4)

  // The connector notch is present without the panel and missing with it.
  expect(standalone).toContain("X-12000000Y006000000D01*")
  expect(panel).not.toContain("X-12000000Y006000000D01*")

  await expect(standaloneFiles).toMatchGerberSnapshot(
    import.meta.path,
    "panel-board-outlines-standalone",
  )
  await expect(panelFiles).toMatchGerberSnapshot(
    import.meta.path,
    "panel-board-outlines-panel",
  )
})

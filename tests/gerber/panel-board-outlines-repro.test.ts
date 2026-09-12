import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { panelBoardOutlines } from "tests/fixtures/panel-board-outlines"

test("individual board mode preserves both profiles from the panel reproduction", async () => {
  const boardsOnly = panelBoardOutlines.filter((e) => e.type !== "pcb_panel")
  const standaloneFiles = convertCircuitJsonToGerberFiles(boardsOnly)
  const panelFiles = convertCircuitJsonToGerberFiles(panelBoardOutlines, {
    panel_mode: "individual_boards",
  })
  const standalone = standaloneFiles["Edge_Cuts.gbr"]!
  const panel = panelFiles["Edge_Cuts.gbr"]!

  // The fixed export has the same two profiles as the standalone boards.
  expect(standalone.match(/D02\*/g)).toHaveLength(2)
  expect(standalone.match(/D01\*/g)).toHaveLength(12)
  expect(panel.match(/D02\*/g)).toHaveLength(2)
  expect(panel.match(/D01\*/g)).toHaveLength(12)

  // The connector notch survives when exporting boards from the panel.
  expect(standalone).toContain("X-12000000Y006000000D01*")
  expect(panel).toContain("X-12000000Y006000000D01*")

  await expect(standaloneFiles).toMatchGerberSnapshot(
    import.meta.path,
    "panel-board-outlines-standalone",
  )
  await expect(panelFiles).toMatchGerberSnapshot(
    import.meta.path,
    // Keep the merged reproduction's filenames so the fix has an image diff.
    "panel-board-outlines-panel",
  )
})

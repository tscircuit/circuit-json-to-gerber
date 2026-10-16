import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "../../src/convert-circuit-json-to-gerber-files"
import { createLedBreakoutBoard } from "../fixtures/c41413180-led-board"

test("C41413180 LED breakout: supplier polarity artwork is lost during fabrication export", async () => {
  const board = createLedBreakoutBoard()
  const componentPads = board.filter(
    (e) => e.type === "pcb_smtpad" && e.pcb_component_id === "pcb_component_1",
  )
  const notes = board.filter((e) => e.type === "pcb_fabrication_note_path")
  expect(componentPads).toHaveLength(4)
  expect(board.filter((e) => e.type === "pcb_trace")).toHaveLength(4)
  expect(notes).toHaveLength(4)
  expect(
    notes.every(
      (e) => e.is_filled && e.has_stroke === false && e.stroke_width === 0,
    ),
  ).toBeTrue()
  const files = convertCircuitJsonToGerberFiles(board)
  // Reproduction: all four input regions disappear. The fix must make this 4.
  expect(files["F_Fab.gbr"]!.match(/G36\*/g) ?? []).toHaveLength(0)
  const layers = Object.fromEntries(
    Object.entries(files).map(([name, contents]) => [
      name.replace(/\.gbr$/, ""),
      contents,
    ]),
  )
  await expect(layers).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "real-led-fabrication-board",
    board,
    ["F_Cu", "F_SilkScreen", "F_Fab", "Edge_Cuts"],
    {
      forceLayerOverlay: true,
      showFilledFabricationNotes: true,
      circuitJsonPcbSvgOptions: { showPcbNotes: true },
      backgroundColor: "#111111",
      colors: {
        F_Cu: "#c83434",
        F_Mask: "#111111",
        F_SilkScreen: "#f2eda1",
        F_Fab: "#ffffff",
        Edge_Cuts: "#8ca89c",
      },
      circuitJsonLabel: "C41413180 LED1 — input board + fab",
      gerberLabel: "Export — polarity regions missing",
      panelWidth: 720,
      panelHeight: 600,
    },
  )
})

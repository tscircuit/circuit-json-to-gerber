import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber"
import { panelBoardOutlines } from "tests/fixtures/panel-board-outlines"
import { renderPanelOutlineComparison } from "tests/fixtures/render-panel-outline-comparison"

// Gerber headers include creation timestamps; keep comparisons deterministic.
beforeEach(() => setSystemTime(new Date("2026-01-01T00:00:00Z")))
afterEach(() => setSystemTime())

// Read the actual serialized Gerber coordinates, rather than renderer bounds.
const readEdgePaths = (gerber: string) => {
  const paths: number[][][] = []
  for (const match of gerber.matchAll(/X(-?\d+)Y(-?\d+)D0([12])\*/g)) {
    if (match[3] === "2") paths.push([])
    paths.at(-1)!.push([Number(match[1]) / 1e6, Number(match[2]) / 1e6])
  }
  return paths
}

const expectedBoardPaths = [
  [
    [-25, -10],
    [-5, -10],
    [-5, 10],
    [-12, 10],
    [-12, 6],
    [-18, 6],
    [-18, 10],
    [-25, 10],
    [-25, -10],
  ],
  [
    [5, -6],
    [25, -6],
    [25, 10],
    [5, 10],
    [5, -6],
  ],
]

for (const flip_y_axis of [false, true]) {
  test(`individual board export preserves profiles with flip_y_axis=${flip_y_axis}`, async () => {
    const inputBefore = JSON.stringify(panelBoardOutlines)
    const files = convertCircuitJsonToGerberFiles(panelBoardOutlines, {
      panel_mode: "individual_boards",
      flip_y_axis,
    })
    expect(readEdgePaths(files["Edge_Cuts.gbr"]!)).toEqual(
      expectedBoardPaths.map((path) =>
        path.map(([x, y]) => [x, flip_y_axis ? -y! : y]),
      ),
    )
    expect(JSON.stringify(panelBoardOutlines)).toBe(inputBefore)

    const boardsOnly = panelBoardOutlines.filter((e) => e.type !== "pcb_panel")
    expect(
      convertCircuitJsonToGerberCommands(panelBoardOutlines, {
        panel_mode: "individual_boards",
        flip_y_axis,
      }),
    ).toEqual(convertCircuitJsonToGerberCommands(boardsOnly, { flip_y_axis }))

    if (!flip_y_axis) {
      const comparison = await renderPanelOutlineComparison([
        {
          gerber:
            convertCircuitJsonToGerberFiles(panelBoardOutlines)[
              "Edge_Cuts.gbr"
            ]!,
          title: "Default panel mode",
          caption: "Panel boundary; individual profiles omitted",
        },
        {
          gerber: files["Edge_Cuts.gbr"]!,
          title: "Individual boards mode — fixed",
          caption: "Both board profiles and connector notch preserved",
        },
      ])
      await expect(comparison).toMatchSvgSnapshot(
        import.meta.path,
        "individual-board-profiles",
      )
    }
  })
}

test("individual board export merges edge cutouts and emits internal holes once", () => {
  const input: AnyCircuitElement[] = [
    ...panelBoardOutlines,
    {
      type: "pcb_cutout",
      pcb_cutout_id: "right_connector",
      shape: "rect",
      center: { x: 25, y: 2 },
      width: 4,
      height: 4,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "left_internal",
      shape: "rect",
      center: { x: -22, y: -5 },
      width: 2,
      height: 2,
    },
  ]
  const files = convertCircuitJsonToGerberFiles(input, {
    panel_mode: "individual_boards",
  })
  const paths = readEdgePaths(files["Edge_Cuts.gbr"]!)
  expect(paths).toHaveLength(3)
  expect(paths[0]).toEqual(expectedBoardPaths[0])
  expect(paths[1]).toEqual([
    [5, -6],
    [25, -6],
    [25, 0],
    [23, 0],
    [23, 4],
    [25, 4],
    [25, 10],
    [5, 10],
    [5, -6],
  ])
  // Negative signed area verifies clockwise winding for the internal hole.
  const hole = paths[2]!
  const area =
    hole.slice(1).reduce((sum, [x, y], i) => {
      const [px, py] = hole[i]!
      return sum + px! * y! - x! * py!
    }, 0) / 2
  expect(area).toBe(-4)
  expect(hole[0]).toEqual(hole.at(-1)!)
})

test("mode changes only Edge_Cuts and is independent of panel element order", () => {
  const input: AnyCircuitElement[] = [
    ...panelBoardOutlines,
    {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 15,
      y: 3,
      outer_diameter: 1,
      hole_diameter: 0.5,
      layers: ["top", "bottom"],
    },
  ]
  const panel = convertCircuitJsonToGerberFiles(input)
  expect(
    convertCircuitJsonToGerberFiles(input, { panel_mode: "panel" }),
  ).toEqual(panel)
  const boards = convertCircuitJsonToGerberFiles(input, {
    panel_mode: "individual_boards",
  })
  expect(boards["Edge_Cuts.gbr"]).not.toBe(panel["Edge_Cuts.gbr"])
  for (const [name, contents] of Object.entries(panel)) {
    if (name !== "Edge_Cuts.gbr") expect(boards[name]).toBe(contents)
  }
  expect(
    convertCircuitJsonToGerberFiles([...input.slice(1), input[0]!], {
      panel_mode: "individual_boards",
    }),
  ).toEqual(boards)
})

test("inputs without panels are unchanged in individual board mode", () => {
  const boardsOnly = panelBoardOutlines.filter((e) => e.type !== "pcb_panel")
  expect(
    convertCircuitJsonToGerberFiles(boardsOnly, {
      panel_mode: "individual_boards",
    }),
  ).toEqual(convertCircuitJsonToGerberFiles(boardsOnly))
})

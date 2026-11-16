import { expect, test } from "bun:test"
import { pcb_board, pcb_hole, pcb_plated_hole } from "circuit-json"
import gerberParser from "gerber-parser"
import { convertCircuitJsonToGerberFiles } from "src/index"
import { excellonDrill, stringifyExcellonDrill } from "src/excellon-drill"

type DrillOperation = {
  op: string
  coord: { x: number; y: number }
}

const readDrillOperations = (drill: string) =>
  new Promise<DrillOperation[]>((resolve, reject) => {
    const operations: DrillOperation[] = []
    const parser = gerberParser({ filetype: "drill" })
    parser.on("data", (node) => {
      if (node.type === "op")
        operations.push({ op: node.op, coord: node.coord })
    })
    parser.on("error", reject)
    parser.on("end", () => resolve(operations))
    parser.end(drill)
  })

const board = pcb_board.parse({
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 12,
  height: 8,
  num_layers: 2,
})
const nonplated = { type: "pcb_hole", x: 0, y: -1 }
const plated = {
  type: "pcb_plated_hole",
  x: 0,
  y: -1,
  layers: ["top", "bottom"],
}

const cases = [
  {
    name: "horizontal nonplated oval",
    slot: pcb_hole.parse({
      ...nonplated,
      pcb_hole_id: "slot",
      hole_shape: "oval",
      hole_width: 2,
      hole_height: 0.6,
    }),
    start: { x: -0.7, y: -1 },
    end: { x: 0.7, y: -1 },
  },
  {
    name: "vertical nonplated pill",
    slot: pcb_hole.parse({
      ...nonplated,
      pcb_hole_id: "slot",
      hole_shape: "pill",
      hole_width: 0.6,
      hole_height: 2,
    }),
    start: { x: 0, y: -1.7 },
    end: { x: 0, y: -0.3 },
  },
  {
    name: "rotated plated pill",
    slot: pcb_plated_hole.parse({
      ...plated,
      pcb_plated_hole_id: "slot",
      shape: "pill",
      hole_width: 2,
      hole_height: 0.6,
      outer_width: 2.8,
      outer_height: 1.4,
      ccw_rotation: 35,
    }),
    start: { x: -0.5734, y: -1.4015 },
    end: { x: 0.573, y: -0.598 },
  },
  {
    name: "rotated plated pill with rectangular pad",
    slot: pcb_plated_hole.parse({
      ...plated,
      pcb_plated_hole_id: "slot",
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 0.6,
      hole_height: 2,
      hole_ccw_rotation: 270,
      rect_ccw_rotation: 270,
      rect_pad_width: 1.4,
      rect_pad_height: 2.8,
    }),
    start: { x: -0.7, y: -1 },
    end: { x: 0.7, y: -1 },
  },
]

for (const { name, slot, start, end } of cases) {
  test(`${name} exports one slot between two round drill hits`, async () => {
    const isPlated = slot.type === "pcb_plated_hole"
    const roundHole = (id: string, x: number) =>
      isPlated
        ? pcb_plated_hole.parse({
            ...plated,
            x,
            pcb_plated_hole_id: id,
            shape: "circle",
            hole_diameter: 0.6,
            outer_diameter: 1.4,
          })
        : pcb_hole.parse({
            ...nonplated,
            x,
            pcb_hole_id: id,
            hole_shape: "circle",
            hole_diameter: 0.6,
          })

    const files = await convertCircuitJsonToGerberFiles([
      board,
      roundHole("before", -3),
      slot,
      roundHole("after", 3),
    ])
    const drill = files[isPlated ? "drill-L1-L2.drl" : "drill_npth.drl"]
    expect(await readDrillOperations(drill)).toEqual([
      { op: "flash", coord: { x: -3, y: -1 } },
      { op: "move", coord: start },
      { op: "int", coord: end },
      { op: "flash", coord: { x: 3, y: -1 } },
    ])
  })
}

test("standalone G85 commands retain their own blocks", () => {
  const commands = excellonDrill()
    .add("G85", { x: 1, y: 0, width: 0.6 })
    .add("drill_at", { x: 2, y: 0 })
    .add("use_tool", { tool_number: 1 })
    .add("G85", { x: 3, y: 0, width: 0.6 })
    .add("drill_at", { x: 4, y: 0 })
    .add("header_comment", { text: "separator" })
    .add("G85", { x: 5, y: 0, width: 0.6 })
    .build()

  expect(stringifyExcellonDrill(commands)).toBe(
    [
      "G85X1.000Y0.000",
      "X2.0000Y0.0000",
      "T1",
      "G85X3.000Y0.000",
      "X4.0000Y0.0000",
      "; separator",
      "G85X5.000Y0.000",
    ].join("\n"),
  )
})

const readDrillToolDiameters = (drill: string) =>
  [...drill.matchAll(/^T(\d+)C([\d.]+)$/gm)].map(([, tool, diameter]) => ({
    tool: Number(tool),
    diameter: Number(diameter),
  }))

const roundHoleAt = (id: string, x: number, diameter = 0.6) =>
  pcb_hole.parse({
    ...nonplated,
    pcb_hole_id: id,
    x,
    hole_shape: "circle",
    hole_diameter: diameter,
  })

const ovalSlotAt = (id: string, x: number, width = 2, height = 0.6) =>
  pcb_hole.parse({
    ...nonplated,
    pcb_hole_id: id,
    x,
    hole_shape: "oval",
    hole_width: width,
    hole_height: height,
  })

test("a tool change between a round hole and a slot keeps both operations", async () => {
  const files = await convertCircuitJsonToGerberFiles([
    board,
    roundHoleAt("round", -3),
    ovalSlotAt("slot", 0, 2, 1),
  ])
  const drill = files["drill_npth.drl"]
  const tools = readDrillToolDiameters(drill)
  expect(tools.map(({ diameter }) => diameter)).toEqual([0.6, 1])
  const lines = drill.split(/\r?\n/)
  const slotLine = lines.findIndex((line) => line.includes("G85"))
  expect(lines[slotLine - 1]).toBe(`T${tools[1].tool}`)
  expect(await readDrillOperations(drill)).toEqual([
    { op: "flash", coord: { x: -3, y: -1 } },
    { op: "move", coord: { x: -0.5, y: -1 } },
    { op: "int", coord: { x: 0.5, y: -1 } },
  ])
})

test("two consecutive slots stay in separate blocks", async () => {
  const files = await convertCircuitJsonToGerberFiles([
    board,
    ovalSlotAt("slot-a", -2),
    ovalSlotAt("slot-b", 2),
  ])
  expect(await readDrillOperations(files["drill_npth.drl"])).toEqual([
    { op: "move", coord: { x: -2.7, y: -1 } },
    { op: "int", coord: { x: -1.3, y: -1 } },
    { op: "move", coord: { x: 1.3, y: -1 } },
    { op: "int", coord: { x: 2.7, y: -1 } },
  ])
})

test("a round hole at the slot start keeps its own drill operation", async () => {
  const files = await convertCircuitJsonToGerberFiles([
    board,
    roundHoleAt("round", -0.7),
    ovalSlotAt("slot", 0),
  ])
  expect(await readDrillOperations(files["drill_npth.drl"])).toEqual([
    { op: "flash", coord: { x: -0.7, y: -1 } },
    { op: "move", coord: { x: -0.7, y: -1 } },
    { op: "int", coord: { x: 0.7, y: -1 } },
  ])
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard, PcbStiffener } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "../../src"
import { convertCircuitJsonToGerberCommands } from "../../src/gerber"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 40,
  height: 20,
  num_layers: 2,
  material: "flex",
  thickness: 0.12,
}

const rectangle: PcbStiffener = {
  type: "pcb_stiffener",
  pcb_stiffener_id: "pcb_stiffener_0",
  pcb_board_id: board.pcb_board_id,
  shape: "rect",
  center: { x: 0, y: -7 },
  width: 2,
  height: 2,
  layer: "bottom",
  material: "polyimide",
  thickness: 0.2,
}

const polygon: PcbStiffener = {
  type: "pcb_stiffener",
  pcb_stiffener_id: "pcb_stiffener_1",
  pcb_board_id: board.pcb_board_id,
  shape: "polygon",
  outline: [
    { x: 5, y: 4 },
    { x: 8, y: 4 },
    { x: 8, y: 6 },
    { x: 6, y: 7 },
    { x: 5, y: 6 },
  ],
  layer: "top",
  material: "fr4",
  thickness: 0.4,
  adhesive_thickness: 0.05,
}

test("exports the issue's bottom polyimide stiffener as a closed outline file", () => {
  const files = convertCircuitJsonToGerberFiles([board, rectangle])
  const stiffenerFile = files["B_Stiffener_polyimide.gbr"]

  expect(stiffenerFile).toContain("%TF.FileFunction,Other,Stiffener,Bot*%")
  expect(stiffenerFile).toContain("%TF.FilePolarity,Positive*%")
  expect(stiffenerFile).toContain("G04 Stiffener material: polyimide*")
  expect(stiffenerFile).toContain("G04 Stiffener thickness: 0.2 mm*")
  expect(stiffenerFile).toContain("%ADD10C,0.050000*%")
  expect(stiffenerFile).toContain(
    [
      "X-01000000Y-06000000D02*",
      "X001000000Y-06000000D01*",
      "X001000000Y-08000000D01*",
      "X-01000000Y-08000000D01*",
      "X-01000000Y-06000000D01*",
    ].join("\n"),
  )
  expect(stiffenerFile.endsWith("M02*")).toBe(true)
})

test("groups multiple stiffeners by attachment face and material", () => {
  const stiffeners: PcbStiffener[] = [
    rectangle,
    { ...rectangle, pcb_stiffener_id: "second", center: { x: 10, y: -7 } },
    polygon,
    { ...rectangle, pcb_stiffener_id: "top-pi", layer: "top" },
    { ...rectangle, pcb_stiffener_id: "bottom-fr4", material: "fr4" },
    { ...polygon, pcb_stiffener_id: "steel", material: "stainless_steel" },
    { ...polygon, pcb_stiffener_id: "aluminum", material: "aluminum" },
  ]
  const files = convertCircuitJsonToGerberFiles([board, ...stiffeners])

  expect(
    Object.keys(files).filter((name) => name.includes("Stiffener")),
  ).toEqual([
    "B_Stiffener_polyimide.gbr",
    "F_Stiffener_fr4.gbr",
    "F_Stiffener_polyimide.gbr",
    "B_Stiffener_fr4.gbr",
    "F_Stiffener_stainless_steel.gbr",
    "F_Stiffener_aluminum.gbr",
  ])
  expect(files["B_Stiffener_polyimide.gbr"].match(/D02\*/g)).toHaveLength(2)
  expect(files["B_Stiffener_polyimide.gbr"].match(/D01\*/g)).toHaveLength(8)
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    "%TF.FileFunction,Other,Stiffener,Top*%",
  )
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    "G04 Stiffener thickness: 0.4 mm; adhesive thickness: 0.05 mm*",
  )
})

test.each(["top", "bottom"] as const)(
  "rotates rectangles on %s in the flat board's top view before flipping Y",
  (layer) => {
    const circuitJson: AnyCircuitElement[] = [
      board,
      {
        ...rectangle,
        layer,
        center: { x: 3, y: 7 },
        width: 4,
        height: 2,
        rotation: 90,
      },
    ]
    const layerName = `${layer === "top" ? "F" : "B"}_Stiffener_polyimide`

    for (const flipY of [false, true]) {
      const commands = convertCircuitJsonToGerberCommands(circuitJson, {
        flip_y_axis: flipY,
      })[layerName]
      const outline = commands.filter(
        (command) =>
          command.command_code === "D02" || command.command_code === "D01",
      )
      const vertices = [
        [2, 5],
        [2, 9],
        [4, 9],
        [4, 5],
        [2, 5],
      ]
      expect(outline).toHaveLength(vertices.length)
      outline.forEach((command, index) => {
        if (command.command_code !== "D02" && command.command_code !== "D01") {
          throw new Error("Expected an outline coordinate")
        }
        expect(command.x).toBeCloseTo(vertices[index][0], 6)
        expect(command.y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
      })
    }
  },
)

test("closes polygon outlines and flips their resolved board coordinates", () => {
  const files = convertCircuitJsonToGerberFiles([board, polygon], {
    flip_y_axis: true,
  })
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    [
      "X005000000Y-04000000D02*",
      "X008000000Y-04000000D01*",
      "X008000000Y-06000000D01*",
      "X006000000Y-07000000D01*",
      "X005000000Y-06000000D01*",
      "X005000000Y-04000000D01*",
    ].join("\n"),
  )
})

test("does not add a duplicate closing segment for explicitly closed polygons", () => {
  const commands = convertCircuitJsonToGerberCommands([
    board,
    { ...polygon, outline: [...polygon.outline, polygon.outline[0]] },
  ])
  expect(
    commands.F_Stiffener_fr4.filter(
      (command) => command.command_code === "D01",
    ),
  ).toHaveLength(5)
})

test("leaves electrical layers and board cuts unchanged and emits no empty stiffener files", () => {
  const baseline = convertCircuitJsonToGerberCommands([board])
  const withStiffeners = convertCircuitJsonToGerberCommands([
    board,
    rectangle,
    polygon,
  ])
  expect(Object.keys(baseline).some((key) => key.includes("Stiffener"))).toBe(
    false,
  )
  // Generated timestamps vary between calls, so compare all geometric commands.
  const withoutTimestamps = (commands: typeof baseline.F_Cu) =>
    commands.filter(
      (command) =>
        command.command_code !== "G04" &&
        !(
          command.command_code === "TF" &&
          command.attribute_name === "CreationDate"
        ),
    )
  for (const layerName of Object.keys(baseline)) {
    expect(withoutTimestamps(withStiffeners[layerName])).toEqual(
      withoutTimestamps(baseline[layerName]),
    )
  }
})

test.each([false, true])(
  "translates rotated rectangles and polygons from an off-origin board before flip_y_axis=%s",
  (flipY) => {
    const offsetBoard: PcbBoard = { ...board, center: { x: 30, y: -10 } }
    const commands = convertCircuitJsonToGerberCommands(
      [
        offsetBoard,
        {
          ...rectangle,
          center: { x: 3, y: 7 },
          width: 4,
          height: 2,
          rotation: 90,
        },
        polygon,
      ],
      { flip_y_axis: flipY },
    )
    const expectedOutlines = {
      B_Stiffener_polyimide: [
        [32, -5],
        [32, -1],
        [34, -1],
        [34, -5],
        [32, -5],
      ],
      F_Stiffener_fr4: [
        [35, -6],
        [38, -6],
        [38, -4],
        [36, -3],
        [35, -4],
        [35, -6],
      ],
    }
    for (const [layerName, vertices] of Object.entries(expectedOutlines)) {
      const outline = commands[layerName].flatMap((command) =>
        command.command_code === "D02" || command.command_code === "D01"
          ? [[command.x, command.y]]
          : [],
      )
      expect(outline).toHaveLength(vertices.length)
      outline.forEach(([x, y], index) => {
        expect(x).toBeCloseTo(vertices[index][0], 6)
        expect(y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
      })
    }
  },
)

test.each([false, true])(
  "uses each stiffener's pcb_board_id when exporting two boards with flip_y_axis=%s",
  (flipY) => {
    const firstBoard: PcbBoard = { ...board, center: { x: 30, y: -10 } }
    const secondBoard: PcbBoard = {
      ...board,
      pcb_board_id: "pcb_board_1",
      center: { x: -40, y: 20 },
    }
    const commands = convertCircuitJsonToGerberCommands(
      [
        // List the second owner first to catch accidental first-board lookup.
        secondBoard,
        firstBoard,
        rectangle,
        {
          ...polygon,
          pcb_board_id: secondBoard.pcb_board_id,
          layer: "bottom",
          material: "polyimide",
        },
      ],
      { flip_y_axis: flipY },
    ).B_Stiffener_polyimide
    const outline = commands.flatMap((command) =>
      command.command_code === "D02" || command.command_code === "D01"
        ? [[command.x, command.y]]
        : [],
    )
    const vertices = [
      [29, -16],
      [31, -16],
      [31, -18],
      [29, -18],
      [29, -16],
      [-35, 24],
      [-32, 24],
      [-32, 26],
      [-34, 27],
      [-35, 26],
      [-35, 24],
    ]
    expect(outline).toHaveLength(vertices.length)
    outline.forEach(([x, y], index) => {
      expect(x).toBeCloseTo(vertices[index][0], 6)
      expect(y).toBeCloseTo(vertices[index][1] * (flipY ? -1 : 1), 6)
    })
  },
)

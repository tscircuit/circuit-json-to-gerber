import { expect } from "bun:test"
import {
  pcb_plated_hole,
  pcb_solder_paste,
  type AnyCircuitElement,
} from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { renderGerberFileSvg } from "tests/fixtures/render-gerber-file-svg"
import { regionPoints } from "tests/fixtures/soldermask-opening"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 16,
  height: 10,
  num_layers: 2,
  thickness: 1.6,
  material: "fr4",
}

const createFixture = (
  layer: "top" | "bottom",
  rotation: number,
  width: number,
  height: number,
  x = 1.25,
  y = -0.75,
) => {
  const hole = pcb_plated_hole.parse({
    type: "pcb_plated_hole",
    shape: "pill",
    x,
    y,
    outer_width: width / 0.7,
    outer_height: height / 0.7,
    hole_width: width / 2,
    hole_height: height / 2,
    ccw_rotation: rotation,
    layers: ["top", "bottom"],
  })
  const paste = pcb_solder_paste.parse({
    type: "pcb_solder_paste",
    shape: "rect",
    layer,
    x,
    y,
    width,
    height,
  })
  if (paste.shape !== "rect")
    throw new Error("Expected rectangular paste fixture")
  return { hole, paste }
}

type LegacyRectPasteSide = {
  layer: "top" | "bottom"
  flip_y_axis: boolean
}

type LegacyRectPasteCase = LegacyRectPasteSide & {
  rotation: number
  width: number
  height: number
}

export const expectLegacyRectPasteRotation = async ({
  layer,
  flip_y_axis,
  rotation,
  width,
  height,
}: LegacyRectPasteCase) => {
  const { hole, paste } = createFixture(layer, rotation, width, height)
  const circuitJson = [board, hole, paste]
  const original = structuredClone(circuitJson)
  const layerName = layer === "top" ? "F_Paste" : "B_Paste"
  const files = convertCircuitJsonToGerberFiles(circuitJson, { flip_y_axis })
  expect(files[`${layerName}.gbr`]).not.toContain("%LR")

  const angle = (rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const corners = [
    [-width / 2, height / 2],
    [width / 2, height / 2],
    [width / 2, -height / 2],
    [-width / 2, -height / 2],
    [-width / 2, height / 2],
  ]
  const commands = convertCircuitJsonToGerberCommands(circuitJson, {
    flip_y_axis,
  })
  const points = regionPoints(commands[layerName])
  expect(points).toHaveLength(corners.length)
  for (const [index, [x, y]] of corners.entries()) {
    expect(points[index].x).toBeCloseTo(paste.x + x * cos - y * sin, 8)
    expect(points[index].y).toBeCloseTo(
      (paste.y + x * sin + y * cos) * (flip_y_axis ? -1 : 1),
      8,
    )
  }

  // Read the serialized Gerber without the stackup helper's LR compensation.
  const { viewBox } = await renderGerberFileSvg(
    files[`${layerName}.gbr`],
    "legacy-rect-paste",
    "#b8b8b8",
  )
  expect(viewBox[2]).toBeCloseTo(
    (width * Math.abs(cos) + height * Math.abs(sin)) * 1000,
    2,
  )
  expect(viewBox[3]).toBeCloseTo(
    (width * Math.abs(sin) + height * Math.abs(cos)) * 1000,
    2,
  )
  expect(viewBox[0] + viewBox[2] / 2).toBeCloseTo(paste.x * 1000, 2)
  expect(viewBox[1] + viewBox[3] / 2).toBeCloseTo(
    paste.y * 1000 * (flip_y_axis ? -1 : 1),
    2,
  )
  expect(circuitJson).toEqual(original)
}

export const expectExplicitRectPasteRotation = ({
  layer,
  flip_y_axis,
}: LegacyRectPasteSide) => {
  const { hole, paste } = createFixture(layer, 30, 2.4, 1.1)
  const layerName = layer === "top" ? "F_Paste" : "B_Paste"
  const explicitZero = { ...paste, ccw_rotation: 0 }
  const commands = convertCircuitJsonToGerberCommands(
    [board, hole, explicitZero],
    { flip_y_axis },
  )[layerName]
  expect(regionPoints(commands)).toEqual([])
  expect(commands.filter((command) => command.command_code === "D03")).toEqual([
    { command_code: "D03", x: paste.x, y: paste.y * (flip_y_axis ? -1 : 1) },
  ])
  expect(commands.some((command) => command.command_code === "LR")).toBe(false)

  const explicitRotation = {
    ...paste,
    shape: "rotated_rect" as const,
    ccw_rotation: -45,
  }
  const exportPaste = (elements: AnyCircuitElement[]) =>
    convertCircuitJsonToGerberCommands(elements, { flip_y_axis })[layerName]
  expect(regionPoints(exportPaste([board, hole, explicitRotation]))).toEqual(
    regionPoints(exportPaste([board, explicitRotation])),
  )
  const withoutHole = exportPaste([board, paste])
  expect(regionPoints(withoutHole)).toEqual([])
  expect(
    withoutHole.filter((command) => command.command_code === "D03"),
  ).toEqual(commands.filter((command) => command.command_code === "D03"))
  expect(withoutHole.some((command) => command.command_code === "LR")).toBe(
    false,
  )
}

export const expectLegacyRectPasteSnapshot = async (
  testPath: string,
  { layer, flip_y_axis }: LegacyRectPasteSide,
) => {
  const circuitJson: AnyCircuitElement[] = [board]
  for (const [row, tall] of [false, true].entries()) {
    for (const [column, rotation] of [0, 30, 90, -45].entries()) {
      const { hole, paste } = createFixture(
        layer,
        rotation,
        tall ? 0.77 : 1.68,
        tall ? 1.68 : 0.77,
        -5.25 + column * 3.5,
        2 - row * 4,
      )
      circuitJson.push(hole, paste)
    }
  }
  const files = convertCircuitJsonToGerberFiles(circuitJson, { flip_y_axis })
  const prefix = layer === "top" ? "F" : "B"
  await expect({
    [`${prefix}_Cu`]: files[`${prefix}_Cu.gbr`],
    [`${prefix}_Paste`]: files[`${prefix}_Paste.gbr`],
  }).toMatchGerberLayerOverlaySnapshot(
    testPath,
    `legacy-rect-paste-${layer}-${flip_y_axis ? "reflected" : "normal"}`,
    [`${prefix}_Cu`, `${prefix}_Paste`],
    {
      colors: { [`${prefix}_Cu`]: "#c99b35", [`${prefix}_Paste`]: "#b8b8b8" },
      backgroundColor: "#111111",
    },
  )
}

import { expect, test } from "bun:test"
import { pcb_solder_paste, type PcbBoard } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { regionPoints } from "tests/fixtures/soldermask-opening"

test("polygon paste emits closed regions with holes on its own layer", async () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 12, y: -3 },
    width: 6,
    height: 6,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  }
  const points = [
    { x: 10, y: -5 },
    { x: 14, y: -5 },
    { x: 14, y: -3 },
    { x: 13, y: -3 },
    { x: 13, y: -1 },
    { x: 10, y: -1 },
  ]
  const hole = [
    { x: 11, y: -4 },
    { x: 12, y: -4 },
    { x: 12, y: -2 },
    { x: 11, y: -2 },
  ]
  for (const layer of ["top", "bottom"] as const) {
    const paste = pcb_solder_paste.parse({
      type: "pcb_solder_paste",
      shape: "polygon",
      points,
      holes: [hole],
      layer,
    })
    const circuitJson = [board, paste]
    const commands = convertCircuitJsonToGerberCommands(circuitJson)
    const layerName = layer === "top" ? "F_Paste" : "B_Paste"
    const oppositeLayer = layer === "top" ? "B_Paste" : "F_Paste"
    expect(regionPoints(commands[layerName])).toEqual([
      ...points,
      points[0],
      ...hole,
      hole[0],
    ])
    expect(regionPoints(commands[oppositeLayer])).toEqual([])
    const flippedCommands = convertCircuitJsonToGerberCommands(circuitJson, {
      flip_y_axis: true,
    })
    expect(regionPoints(flippedCommands[layerName])).toEqual(
      [...points, points[0]!, ...hole, hole[0]!].map(({ x, y }) => ({
        x,
        y: -y,
      })),
    )
    expect(regionPoints(flippedCommands[oppositeLayer])).toEqual([])
    const files = convertCircuitJsonToGerberFiles(circuitJson)
    expect(files[`${layerName}.gbr`].match(/G36\*/g)).toHaveLength(1)
    expect(files[`${layerName}.gbr`]).not.toContain("D03*")
    await expect({
      [layerName]: files[`${layerName}.gbr`],
    }).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `polygon-paste-${layer}`,
      [layerName],
      { colors: { [layerName]: "#34c8c8" }, backgroundColor: "#111111" },
    )
  }
})

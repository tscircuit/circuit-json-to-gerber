import { expect, test } from "bun:test"
import { pcb_solder_paste, type PcbBoard } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  expectOtherFilesUnchanged,
  regionPoints,
} from "tests/fixtures/soldermask-opening"
import { renderGerberFileSvg } from "tests/fixtures/render-gerber-file-svg"

test("polygon paste preserves concavity, openings, layer and Y reflection", async () => {
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
    const followingPaste = pcb_solder_paste.parse({
      type: "pcb_solder_paste",
      shape: "circle",
      layer,
      x: 14,
      y: -1,
      radius: 0.3,
    })
    const circuitJson = [board, paste, followingPaste]
    const original = structuredClone(circuitJson)
    const layerName = layer === "top" ? "F_Paste" : "B_Paste"
    const oppositeLayer = layer === "top" ? "B_Paste" : "F_Paste"
    for (const flip_y_axis of [false, true]) {
      const commands = convertCircuitJsonToGerberCommands(circuitJson, {
        flip_y_axis,
      })
      const expectedPoints = [...points, points[0], ...hole, hole[0]].map(
        ({ x, y }) => ({ x, y: flip_y_axis ? -y : y }),
      )
      expect(regionPoints(commands[layerName])).toEqual(expectedPoints)
      expect(regionPoints(commands[oppositeLayer])).toEqual([])
      expect(
        commands[layerName].filter((command) => command.command_code === "LP"),
      ).toEqual([
        { command_code: "LP", polarity: "D" },
        { command_code: "LP", polarity: "C" },
        { command_code: "LP", polarity: "D" },
      ])
      const files = convertCircuitJsonToGerberFiles(circuitJson, {
        flip_y_axis,
      })
      const gerber = files[`${layerName}.gbr`]
      expect(gerber.match(/G36\*/g)).toHaveLength(2)
      expect(gerber.match(/G37\*/g)).toHaveLength(2)
      expect(gerber.match(/D03\*/g)).toHaveLength(1)
      expect(gerber.indexOf("%LPC*%")).toBeLessThan(
        gerber.lastIndexOf("%LPD*%"),
      )
      expect(gerber.lastIndexOf("%LPD*%")).toBeLessThan(gerber.indexOf("D03*"))
      expectOtherFilesUnchanged(
        files,
        convertCircuitJsonToGerberFiles([board, followingPaste], {
          flip_y_axis,
        }),
        `${layerName}.gbr`,
      )
      // Independent Gerber parsing rejects geometry warnings and invalid bounds.
      await renderGerberFileSvg(gerber, `polygon-paste-${layer}`, "#34c8c8")
      if (!flip_y_axis) {
        await expect({ [layerName]: gerber }).toMatchGerberLayerOverlaySnapshot(
          import.meta.path,
          `polygon-paste-${layer}`,
          [layerName],
          { colors: { [layerName]: "#34c8c8" }, backgroundColor: "#111111" },
        )
      }
    }
    expect(circuitJson).toEqual(original)
  }
})

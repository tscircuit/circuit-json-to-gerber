import { expect, test } from "bun:test"
import { pcb_soldermask_opening } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  expectOtherFilesUnchanged,
  flexBoard,
  goldFingers,
  regionPoints,
} from "tests/fixtures/soldermask-opening"

test("a bottom polygon coverlay opening closes its absolute boundary", async () => {
  const baseline = [flexBoard, ...goldFingers("bottom")]
  const points = [
    { x: 96.5, y: -68.5 },
    { x: 103.5, y: -68.5 },
    { x: 103.5, y: -64.5 },
    { x: 102.5, y: -64 },
    { x: 96.5, y: -64 },
  ]
  const opening = pcb_soldermask_opening.parse({
    type: "pcb_soldermask_opening",
    shape: "polygon",
    layer: "bottom",
    points,
  })
  const circuitJson = [...baseline, opening]
  const commands = convertCircuitJsonToGerberCommands(circuitJson)
  expect(regionPoints(commands.B_Mask)).toEqual([...points, points[0]])
  expect(regionPoints(commands.F_Mask)).toEqual([])
  const files = convertCircuitJsonToGerberFiles(circuitJson)
  expect(files["B_Mask.gbr"].match(/G36\*/g)).toHaveLength(1)
  expectOtherFilesUnchanged(
    files,
    convertCircuitJsonToGerberFiles(baseline),
    "B_Mask.gbr",
  )
  await expect({
    B_Mask: files["B_Mask.gbr"],
    B_Cu: files["B_Cu.gbr"],
    Edge_Cuts: files["Edge_Cuts.gbr"],
  }).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "bottom-polygon-coverlay-window",
    ["B_Mask", "B_Cu"],
    {
      backgroundColor: "#684f22",
      colors: { B_Mask: "#192c3e", B_Cu: "#e5b65c" },
    },
  )
})

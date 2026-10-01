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

test("a continuous top coverlay window extends beyond a gold-finger row", async () => {
  const baseline = [flexBoard, ...goldFingers("top")]
  const opening = pcb_soldermask_opening.parse({
    type: "pcb_soldermask_opening",
    shape: "rect",
    layer: "top",
    x: 100,
    y: -66.25,
    width: 6.5,
    height: 4.5,
  })
  const circuitJson = [...baseline, opening]
  const commands = convertCircuitJsonToGerberCommands(circuitJson)
  expect(regionPoints(commands.F_Mask)).toEqual([
    { x: 96.75, y: -64 },
    { x: 103.25, y: -64 },
    { x: 103.25, y: -68.5 },
    { x: 96.75, y: -68.5 },
    { x: 96.75, y: -64 },
  ])
  const files = convertCircuitJsonToGerberFiles(circuitJson)
  expect(files["F_Mask.gbr"]).toContain("%TF.FilePolarity,Negative*%")
  expect(files["F_Mask.gbr"].match(/G36\*/g)).toHaveLength(1)
  expectOtherFilesUnchanged(
    files,
    convertCircuitJsonToGerberFiles(baseline),
    "F_Mask.gbr",
  )
  await expect({
    F_Mask: files["F_Mask.gbr"],
    F_Cu: files["F_Cu.gbr"],
    Edge_Cuts: files["Edge_Cuts.gbr"],
  }).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "gold-finger-coverlay-window",
    ["F_Mask", "F_Cu"],
    {
      backgroundColor: "#684f22",
      colors: { F_Mask: "#192c3e", F_Cu: "#e5b65c" },
    },
  )
})

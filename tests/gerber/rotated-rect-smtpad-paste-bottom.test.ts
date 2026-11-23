import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { regionPoints } from "tests/fixtures/soldermask-opening"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    layer: "bottom",
    shape: "rotated_rect",
    width: 0.6,
    height: 1.7,
    x: -1.785,
    y: 0.901,
    ccw_rotation: 45,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "pcb_solder_paste_0",
    pcb_smtpad_id: "pcb_smtpad_0",
    layer: "bottom",
    shape: "rotated_rect",
    width: 0.6,
    height: 1.7,
    x: -1.785,
    y: 0.901,
    ccw_rotation: 45,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    layer: "bottom",
    shape: "rotated_rect",
    width: 1.3,
    height: 2.9,
    x: 2.669,
    y: 0.831,
    ccw_rotation: 45,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "pcb_solder_paste_1",
    pcb_smtpad_id: "pcb_smtpad_1",
    layer: "bottom",
    shape: "rotated_rect",
    width: 1.3,
    height: 2.9,
    x: 2.669,
    y: 0.831,
    ccw_rotation: 45,
  },
] as AnyCircuitElement[]

test("bottom rotated_rect solder paste is written as rotated geometry without LR", async () => {
  const commands = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(commands)

  expect(gerberOutput.B_Paste).not.toContain("%LR")
  expect(gerberOutput.B_Paste).toContain("G36*")
  expect(regionPoints(commands.B_Paste)).toEqual(regionPoints(commands.B_Cu))

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-rect-smtpad-paste-bottom",
    circuitJson,
    ["B_Cu", "B_Paste"],
    {
      colors: {
        B_Cu: "#c83434",
        B_Paste: "#34c8c8",
      },
      backgroundColor: "#111111",
    },
  )
})

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
    layer: "top",
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
    layer: "top",
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
    layer: "top",
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
    layer: "top",
    shape: "rotated_rect",
    width: 1.3,
    height: 2.9,
    x: 2.669,
    y: 0.831,
    ccw_rotation: 45,
  },
] as AnyCircuitElement[]

test("rotated_rect solder paste is written as rotated geometry without LR", async () => {
  const commands = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(commands)

  expect(gerberOutput.F_Paste).not.toContain("%LR")
  expect(gerberOutput.F_Paste).toContain("G36*")
  expect(gerberOutput.F_Paste).toContain("X-02598173Y001289909D02*")
  expect(regionPoints(commands.F_Paste)).toEqual(regionPoints(commands.F_Cu))

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-rect-smtpad-paste-repro",
    circuitJson,
    ["F_Cu", "F_Paste"],
    {
      colors: {
        F_Cu: "#c83434",
        F_Paste: "#34c8c8",
      },
      backgroundColor: "#111111",
    },
  )
})

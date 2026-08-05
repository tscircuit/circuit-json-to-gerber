import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

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
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    layer: "top",
    shape: "rotated_rect",
    width: 0.6,
    height: 1.7,
    x: -0.901,
    y: 1.785,
    ccw_rotation: 45,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
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
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_3",
    layer: "top",
    shape: "rotated_rect",
    width: 1.3,
    height: 2.9,
    x: -0.831,
    y: -2.669,
    ccw_rotation: 45,
    is_covered_with_solder_mask: false,
  },
] as AnyCircuitElement[]

test("repro: 45 degree rotated rectangular SMT pads", async () => {
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(gerberOutput.F_Cu).not.toContain("%LR45*%")
  expect(gerberOutput.F_Cu).toContain("G36*")
  expect(gerberOutput.F_Cu).toContain("X-02598173Y001289909D02*")

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-rect-smtpad-45deg-repro",
    circuitJson,
    ["F_Cu"],
    {
      colors: {
        F_Cu: "#c83434",
      },
      backgroundColor: "#111111",
    },
  )
})

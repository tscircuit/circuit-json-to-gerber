import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rotated_pill_pad",
    layer: "top",
    shape: "pill",
    width: 2.4,
    height: 1.1,
    radius: 0.55,
    x: 0,
    y: 0,
    ccw_rotation: 90,
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "rotated_pill_paste",
    pcb_smtpad_id: "rotated_pill_pad",
    layer: "top",
    shape: "pill",
    width: 2,
    height: 0.7,
    radius: 0.35,
    x: 0,
    y: 0,
    ccw_rotation: 90,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test.failing("repro: rotated pill smtpads render without throwing", () => {
  const getGerberOutput = () =>
    stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))

  expect(getGerberOutput).not.toThrow()

  const gerberOutput = getGerberOutput()

  expect(gerberOutput.F_Cu.length).toBeGreaterThan(0)
  expect(gerberOutput.F_Mask.length).toBeGreaterThan(0)
  expect(gerberOutput.F_Paste.length).toBeGreaterThan(0)
})

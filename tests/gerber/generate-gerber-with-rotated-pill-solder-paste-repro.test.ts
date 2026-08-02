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
    height: 8,
    num_layers: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rotated_pill_pad_30",
    layer: "top",
    shape: "rotated_pill",
    width: 2.4,
    height: 1.1,
    radius: 0.55,
    x: -2,
    y: 0,
    ccw_rotation: 30,
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "rotated_pill_paste_30",
    layer: "top",
    shape: "rotated_pill",
    width: 2.4 * 0.7,
    height: 1.1 * 0.7,
    radius: 0.55 * 0.7,
    x: -2,
    y: 0,
    ccw_rotation: 30,
    pcb_component_id: "pcb_component_0",
    pcb_smtpad_id: "rotated_pill_pad_30",
  } as AnyCircuitElement,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rotated_pill_pad_90",
    layer: "top",
    shape: "rotated_pill",
    width: 2.4,
    height: 1.1,
    radius: 0.55,
    x: 2,
    y: 0,
    ccw_rotation: 90,
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "rotated_pill_paste_90",
    layer: "top",
    shape: "rotated_pill",
    width: 2.4 * 0.7,
    height: 1.1 * 0.7,
    radius: 0.55 * 0.7,
    x: 2,
    y: 0,
    ccw_rotation: 90,
    pcb_component_id: "pcb_component_1",
    pcb_smtpad_id: "rotated_pill_pad_90",
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test("repro: rotated pill solder paste renders paste apertures without throwing", async () => {
  const getGerberOutput = () =>
    stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))

  expect(getGerberOutput).not.toThrow()

  const gerberOutput = getGerberOutput()

  expect(gerberOutput.F_Paste.length).toBeGreaterThan(0)
  // 30° paste flashes under an LR-rotated pill aperture
  expect(gerberOutput.F_Paste).toContain("%LR30*%")
  expect(gerberOutput.F_Paste).toContain("X-02000000Y000000000D03*")
  // 90° paste flashes the same pill aperture under an LR rotation
  expect(gerberOutput.F_Paste).toContain("%LR90*%")
  expect(gerberOutput.F_Paste).toContain("X002000000Y000000000D03*")

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-pill-solder-paste-repro",
    circuitJson,
    ["F_Paste", "F_Cu"],
    {
      colors: {
        F_Cu: "#c83434",
        F_Paste: "#34c8c8",
      },
      backgroundColor: "#111111",
    },
  )
})

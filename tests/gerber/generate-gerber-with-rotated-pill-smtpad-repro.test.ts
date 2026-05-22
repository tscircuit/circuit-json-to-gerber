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
    pcb_smtpad_id: "pill_pad",
    layer: "top",
    shape: "pill",
    width: 2.4,
    height: 1.1,
    radius: 0.55,
    x: -2,
    y: 0,
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rotated_pill_pad",
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
] as AnyCircuitElement[]

test("repro: pill and rotated pill smtpads render copper without throwing", async () => {
  const getGerberOutput = () =>
    stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))

  expect(getGerberOutput).not.toThrow()

  const gerberOutput = getGerberOutput()

  expect(gerberOutput.F_Cu.length).toBeGreaterThan(0)
  expect(gerberOutput.F_Cu).toMatch(/D03\*|G36\*/)
  expect(gerberOutput.F_Cu).toContain("X002000000Y-00650000D02*")
  expect(gerberOutput.F_Cu).toContain("X002000000Y000650000D01*")

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-pill-smtpad-repro",
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

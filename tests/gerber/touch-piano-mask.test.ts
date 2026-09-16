import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { parseGerberFile } from "gerberts"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("touch piano covered rectangular electrodes", async () => {
  // Saved routed piano board, with the polygon workaround restored to 11 x 27 mm rectangles.
  const circuitJson: AnyCircuitElement[] = await Bun.file(
    new URL("./assets/touch-piano.circuit.json", import.meta.url),
  ).json()
  const electrodes = circuitJson.filter(
    (element) =>
      element.type === "pcb_smtpad" && element.is_covered_with_solder_mask,
  )
  expect(electrodes).toHaveLength(8)
  for (const electrode of electrodes) {
    expect(electrode).toMatchObject({ shape: "rect", width: 11, height: 27 })
  }
  expect(
    circuitJson.filter((element) => element.type === "pcb_trace"),
  ).toHaveLength(30)
  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )
  expect(parseGerberFile(gerberOutput.F_Cu).operations.length).toBeGreaterThan(
    0,
  )
  const exposedOnly = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(
      circuitJson.filter(
        (element) =>
          element.type !== "pcb_smtpad" || !element.is_covered_with_solder_mask,
      ),
    ),
  )
  expect(parseGerberFile(gerberOutput.F_Mask).operations).toEqual(
    parseGerberFile(exposedOnly.F_Mask).operations,
  )
  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "covered-smtpad-full-board",
    circuitJson,
    ["F_Cu", "F_Mask", "F_SilkScreen"],
    {
      circuitJsonLabel: "Touch piano: source copper",
      gerberLabel: "Touch piano: Gerbers (gold = exposed)",
      panelWidth: 1000,
      panelHeight: 600,
    },
  )
})

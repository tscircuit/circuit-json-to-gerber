import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import qfnFixture from "./assets/qfn16-rect-border-radius.circuit.json"

// A QFN-16 with an exposed pad, placed at 0° and 45°, where every pad carries rect_border_radius.
const circuitJson = qfnFixture as AnyCircuitElement[]

// The same board with each radius moved to corner_radius, which the exporter already rounds.
const circuitJsonWithCornerRadius = circuitJson.map((element) => {
  if (element.type !== "pcb_smtpad") {
    return element
  }
  if (element.shape !== "rect" && element.shape !== "rotated_rect") {
    return element
  }
  const { rect_border_radius, ...padWithoutRectBorderRadius } = element
  return { ...padWithoutRectBorderRadius, corner_radius: rect_border_radius }
})

const getGerberOutput = (circuitJsonToExport: AnyCircuitElement[]) =>
  stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuitJsonToExport),
  )

// The header lines above the aperture list carry timestamps, so compare from the aperture list on.
const getLayerBody = (gerberLayer: string) =>
  gerberLayer.slice(gerberLayer.indexOf("G04 aperture START LIST*"))

test("smtpad corner_radius exports rounded copper and soldermask apertures", () => {
  const gerberOutput = getGerberOutput(circuitJsonWithCornerRadius)
  for (const layer of ["F_Cu", "F_Mask"]) {
    expect(gerberOutput[layer]).toContain("ROUNDRECT,0.075000X")
    expect(gerberOutput[layer]).toContain("ROUNDRECT,0.250000X")
    expect(gerberOutput[layer]).not.toMatch(/%ADD\d+R,/)
  }
})

for (const layer of ["F_Cu", "F_Mask"]) {
  test(`smtpad rect_border_radius exports the same rounded ${layer} as corner_radius`, () => {
    expect(getLayerBody(getGerberOutput(circuitJson)[layer])).toBe(
      getLayerBody(getGerberOutput(circuitJsonWithCornerRadius)[layer]),
    )
  })
}

const exposedPad: PcbSmtPad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pcb_smtpad_exposed",
  layer: "top",
  shape: "rect",
  x: 0,
  y: 0,
  width: 1.7,
  height: 1.7,
  rect_border_radius: 0.25,
  soldermask_margin: 0.05,
}

test("smtpad rect_border_radius grows with the soldermask margin", () => {
  const gerberOutput = getGerberOutput([exposedPad])
  expect(gerberOutput.F_Cu).toContain("ROUNDRECT,0.250000X")
  expect(gerberOutput.F_Mask).toContain("ROUNDRECT,0.300000X")
})

test("smtpad corner_radius takes precedence over rect_border_radius", () => {
  const gerberOutput = getGerberOutput([{ ...exposedPad, corner_radius: 0.1 }])
  expect(gerberOutput.F_Cu).toContain("ROUNDRECT,0.100000X")
  expect(gerberOutput.F_Mask).toContain("ROUNDRECT,0.150000X")
})

test("smtpad rect_border_radius PCB and Gerber snapshot", async () => {
  await expect(
    getGerberOutput(circuitJson),
  ).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "smtpad-rect-border-radius",
    circuitJson,
    ["F_Mask", "F_Cu"],
    {
      circuitJsonLabel: "Circuit JSON: rect_border_radius pads",
      gerberLabel: "Gerber: rounded pad corners",
      circuitJsonPcbSvgOptions: { drawPaddingOutsideBoard: false },
      panelHeight: 360,
    },
  )
})

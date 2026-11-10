import { expect, test } from "bun:test"
import { parseGerberFile } from "gerberts"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import {
  copperViews,
  getCopperPoints,
  getDrillPoints,
  getViaDrillFile,
  renderViaLayerStack,
} from "../fixtures/render-via-layer-stack"
import { circuit, vias } from "../fixtures/via-layer-visibility"

test("generated copper and drill spans match the four-layer via stack", async () => {
  const files = convertCircuitJsonToGerberFiles(circuit)
  for (const { layer, file } of copperViews) {
    const parsed = parseGerberFile(files[file])
    expect(parsed.unitMode?.unit).toBe("MM")
    expect(
      parsed.operations.every((operation) => operation.type === "Flash"),
    ).toBe(true)
    expect(
      parsed.apertureDefinitions.map((aperture) => [
        aperture.template,
        ...aperture.params,
      ]),
    ).toEqual([["C", 1]])
    expect(getCopperPoints(files[file])).toEqual(
      vias
        .filter((via) => via.layers.includes(layer))
        .map((via) => ({ x: via.x, y: via.y })),
    )
  }
  const spans = [...new Set(vias.map(getViaDrillFile))].sort()
  expect(
    Object.keys(files)
      .filter((file) => file.endsWith(".drl"))
      .sort(),
  ).toEqual(spans)
  for (const file of spans) {
    const [, from, to] = file.match(/^drill-L(\d+)-L(\d+)\.drl$/)!
    expect(files[file]).toContain(`TF.FileFunction,Plated,${from},${to},PTH`)
    expect(files[file].match(/^T\d+C.*$/gm)).toEqual(["T10C0.500000"])
    expect(getDrillPoints(files[file])).toEqual(
      vias
        .filter((via) => getViaDrillFile(via) === file)
        .map((via) => ({ x: via.x, y: via.y })),
    )
  }
  // Plot the exported Gerbers and the applicable actual Excellon files, not
  // an SVG rendering of the input fixture or hand-drawn via circles.
  expect(await renderViaLayerStack(files)).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-via-layer-visibility",
  )
})

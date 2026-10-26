import { beforeAll, expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import {
  platedPadShapes,
  roundedPlatedPad,
  roundedPlatedPadBoard,
} from "tests/fixtures/rounded-plated-pad-corners"
import { renderGerberFileSvg } from "tests/fixtures/render-gerber-file-svg"

const cases = platedPadShapes.flatMap((shape) =>
  (["F_Cu", "B_Cu", "F_Mask", "B_Mask"] as const).map((layer) => ({
    shape,
    layer,
    roundedPixels: Buffer.alloc(0),
    squarePixels: Buffer.alloc(0),
  })),
)

beforeAll(async () => {
  // Prepare and parse the files outside test.failing, so an exporter/parser
  // exception cannot accidentally count as reproducing the missing radius.
  for (const shape of platedPadShapes) {
    const rounded = stringifyGerberCommandLayers(
      convertCircuitJsonToGerberCommands([roundedPlatedPad(shape)]),
    )
    const square = stringifyGerberCommandLayers(
      convertCircuitJsonToGerberCommands([roundedPlatedPad(shape, 0)]),
    )
    for (const entry of cases.filter((entry) => entry.shape === shape)) {
      const id = `plated-pad-${shape}-${entry.layer}`
      const [roundedResult, squareResult] = await Promise.all([
        renderGerberFileSvg(rounded[entry.layer], id, "#efb65a"),
        renderGerberFileSvg(square[entry.layer], id, "#efb65a"),
      ])
      const rasterize = (svg: string) =>
        Buffer.from(
          new Resvg(svg, {
            fitTo: { mode: "width", value: 360 },
            font: { loadSystemFonts: false },
          }).render().pixels,
        )
      entry.roundedPixels = rasterize(roundedResult.svg)
      entry.squarePixels = rasterize(squareResult.svg)
      expect(entry.roundedPixels.some((value) => value !== 0)).toBe(true)
      expect(entry.squarePixels.some((value) => value !== 0)).toBe(true)
    }
  }
})

test("repro inputs preserve the requested plated-pad corner radius", () => {
  for (const shape of platedPadShapes) {
    const pad = roundedPlatedPad(shape)
    expect(pad).toMatchObject({
      shape,
      rect_border_radius: 0.6,
      rect_pad_width: 3.6,
      rect_pad_height: 2.4,
      soldermask_margin: 0.2,
    })
  }
})

for (const entry of cases) {
  // The intended behavior fails on main: changing only rect_border_radius
  // currently produces identical rasterized Gerber geometry. Remove .failing when
  // implementing the fix; these assertions should then pass normally.
  test.failing(
    `${entry.shape}: ${entry.layer} preserves rounded corners`,
    () => {
      expect(entry.roundedPixels.equals(entry.squarePixels)).toBe(false)
    },
  )
}

for (const side of ["top", "bottom"] as const) {
  test(`repro snapshot: rounded plated pads on ${side}`, async () => {
    const circuitJson = roundedPlatedPadBoard()
    const gerberOutput = stringifyGerberCommandLayers(
      convertCircuitJsonToGerberCommands(circuitJson),
    )
    const layers = side === "top" ? ["F_Mask", "F_Cu"] : ["B_Mask", "B_Cu"]

    await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
      import.meta.path,
      `rounded-plated-pad-corners-${side}`,
      circuitJson,
      layers,
      {
        circuitJsonLabel: "Circuit JSON: 0.6 mm pad corner radius",
        gerberLabel: "Current Gerber: sharp pad and mask corners",
        circuitJsonPcbSvgOptions: { layer: side },
      },
    )
  })
}

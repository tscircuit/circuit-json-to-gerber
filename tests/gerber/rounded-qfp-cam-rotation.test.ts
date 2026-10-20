import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { roundedQfp } from "../fixtures/rounded-qfp"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import {
  getApertureConfigFromPcbSmtpad,
  getApertureConfigFromPcbSmtpadSoldermask,
} from "src/gerber/convert-soup-to-gerber-commands/defineAperturesForLayer"

// Assert the geometry independently of a viewer's LR support, including Y flip
// and mask expansion. Corner-circle extents are the rounded pad's exact bounds.
for (const rotation of [0, 30, 45, 90, 180, 270, -90, 450]) {
  for (const flip of [false, true]) {
    test(`rounded rectangle geometry ${rotation} degrees, flip=${flip}`, () => {
      const pad = {
        ...roundedQfp()[1],
        ccw_rotation: rotation,
      } as Extract<AnyCircuitElement, { type: "pcb_smtpad" }>
      for (const mask of [false, true]) {
        const config = mask
          ? getApertureConfigFromPcbSmtpadSoldermask(pad, flip)
          : getApertureConfigFromPcbSmtpad(pad, flip)
        if (!("macro_name" in config) || config.macro_name !== "ROUNDRECT")
          throw new Error("Expected ROUNDRECT")
        const margin = mask ? 0.025 : 0
        const r = 0.06 + margin
        const angle = ((rotation * Math.PI) / 180) * (flip ? -1 : 1)
        const x = -0.15 + 0.06
        const y = 0.6 - 0.06
        expect(config.corner_radius).toBeCloseTo(r, 10)
        expect(config.corner_1_x).toBeCloseTo(
          x * Math.cos(angle) - y * Math.sin(angle),
          10,
        )
        expect(config.corner_1_y).toBeCloseTo(
          x * Math.sin(angle) + y * Math.cos(angle),
          10,
        )
        const xs = [
          config.corner_1_x,
          config.corner_2_x,
          config.corner_3_x,
          config.corner_4_x,
        ]
        const ys = [
          config.corner_1_y,
          config.corner_2_y,
          config.corner_3_y,
          config.corner_4_y,
        ]
        const width = Math.max(...xs) - Math.min(...xs) + 2 * r
        const height = Math.max(...ys) - Math.min(...ys) + 2 * r
        expect(width).toBeCloseTo(
          2 *
            (Math.abs(x * Math.cos(angle)) + Math.abs(y * Math.sin(angle)) + r),
          10,
        )
        expect(height).toBeCloseTo(
          2 *
            (Math.abs(x * Math.sin(angle)) + Math.abs(y * Math.cos(angle)) + r),
          10,
        )
      }
      const result = stringifyGerberCommandLayers(
        convertCircuitJsonToGerberCommands([pad], { flip_y_axis: flip }),
      )
      expect(result.F_Cu).not.toContain("%LR")
      expect(result.F_Mask).not.toContain("%LR")
    })
  }
}

// Count connected copper islands after independently parsing/rasterizing Gerber.
// This catches bridges that file-string and Circuit JSON snapshots can miss.
test("CAM without LR support: 18 merged copper islands before, 32 isolated pads after", async () => {
  const { renderCopper } = await import("../repros/repro12/render-rounded-qfp")
  const { Resvg } = await import("@resvg/resvg-js")
  const { default: looksSame } = await import(
    "@tscircuit/image-utils/looks-same"
  )
  const rasterize = async (gerber: string) =>
    new Resvg(await renderCopper(gerber), {
      fitTo: { mode: "width", value: 720 },
    }).render()
  const countIslands = async (gerber: string) => {
    const image = await rasterize(gerber)
    const data = image.pixels
    const info = { width: image.width, height: image.height, channels: 4 }
    const visited = new Uint8Array(info.width * info.height)
    const copper = (i: number) =>
      data[i * info.channels + info.channels - 1] > 128
    let islands = 0
    for (let i = 0; i < visited.length; i++) {
      if (visited[i] || !copper(i)) continue
      islands++
      const queue = [i]
      visited[i] = 1
      while (queue.length) {
        const p = queue.pop()!
        const x = p % info.width
        const neighbors = [
          ...(x > 0 ? [p - 1] : []),
          ...(x + 1 < info.width ? [p + 1] : []),
          p - info.width,
          p + info.width,
        ]
        for (const n of neighbors) {
          if (n < 0 || n >= visited.length || visited[n] || !copper(n)) continue
          visited[n] = 1
          queue.push(n)
        }
      }
    }
    return islands
  }
  const before = await Bun.file(
    `${import.meta.dir}/../repros/repro12/before.F_Cu.gbr`,
  ).text()
  expect(await countIslands(before)).toBe(18)
  const beforePng = (await rasterize(before)).asPng()
  for (const layer of ["top", "bottom"] as const) {
    for (const flip of [false, true]) {
      const result = stringifyGerberCommandLayers(
        convertCircuitJsonToGerberCommands(roundedQfp(layer), {
          flip_y_axis: flip,
        }),
      )
      const copper = layer === "top" ? result.F_Cu : result.B_Cu
      expect(await countIslands(copper)).toBe(32)
      expect(
        (await looksSame(beforePng, (await rasterize(copper)).asPng())).equal,
      ).toBe(false)
    }
  }
})

test("negative mask margin preserves rotation when rounded corners disappear", () => {
  const circuit = roundedQfp().map((element) =>
    element.type === "pcb_smtpad"
      ? { ...element, soldermask_margin: -0.06 }
      : element,
  )
  const result = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(circuit),
  )
  expect(result.F_Mask).not.toContain("%LR")
  expect(result.F_Mask.match(/G36\*/g)).toHaveLength(32)
  expect(result.F_Cu.match(/D03\*/g)).toHaveLength(32)
})

import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "../../src"
import { positionSvg } from "../fixtures/preload"
import { renderGerberFileSvg } from "../fixtures/render-gerber-file-svg"
import {
  board,
  stiffenerOverlayOptions,
  visualCopper,
  visualStiffeners,
} from "../fixtures/stiffener-visuals"

test("snapshots a flex jumper's exported copper and connector stiffener drawings", async () => {
  const files = convertCircuitJsonToGerberFiles([
    board,
    ...visualCopper,
    ...visualStiffeners,
  ])
  expect(
    Object.keys(files)
      .filter((name) => name.includes("Stiffener"))
      .sort(),
  ).toEqual(["B_Stiffener_fr4.gbr", "B_Stiffener_polyimide.gbr"])

  const panelLayers = [
    ["Edge_Cuts", "F_Cu"],
    ["Edge_Cuts", "F_Cu", "B_Stiffener_polyimide", "B_Stiffener_fr4"],
  ] as const
  const panels = await Promise.all(
    panelLayers.map((layers, panel) =>
      Promise.all(
        layers.map((layer) =>
          renderGerberFileSvg(
            files[`${layer}.gbr`],
            `flex-jumper-${panel}-${layer}`,
            stiffenerOverlayOptions.colors[layer],
          ),
        ),
      ),
    ),
  )
  const frame = panels[0][0].viewBox
  expect(panels[1][0].viewBox).toEqual(frame)
  const scale = 628 / frame[2]
  const drawings = panels.flatMap((layers, panel) =>
    layers.map(({ svg, viewBox: [x, y, width, height] }) =>
      positionSvg({
        svg,
        x: 24 + panel * 712 + (x - frame[0]) * scale,
        y: 154 + (frame[1] + frame[3] - y - height) * scale,
        width: width * scale,
        height: height * scale,
      }),
    ),
  )

  // Keep each complete Tracespace SVG, including its native defs and Y-flip.
  // Only resize and place it using the renderer's own layer/board bounds.
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="450" viewBox="0 0 1400 450">',
    '<rect width="1400" height="450" fill="#1c2430"/>',
    '<g font-family="sans-serif" fill="#e5e7eb">',
    '<text x="24" y="35" font-size="26" font-weight="600">Six-contact flex jumper · 40 × 12 mm</text>',
    '<text x="24" y="62" font-size="17" fill="#94a3b8">Tracespace gerber-to-svg 4.2.8 · actual exported .gbr files</text>',
    '<text x="24" y="88" font-size="17" fill="#94a3b8">Top view; bottom stiffener outlines are overlaid with the top copper.</text>',
    '<text x="24" y="128" font-size="22">Top copper Gerber</text>',
    '<text x="736" y="128" font-size="22">Copper + bottom stiffener Gerbers</text>',
    ...drawings,
    '<text x="24" y="398" font-size="17" fill="#f1bc4b">F_Cu.gbr · six connected copper traces</text>',
    '<text x="736" y="386" font-size="17" fill="#69c7ff">B_Stiffener_polyimide.gbr · 0.2 mm backing</text>',
    '<text x="736" y="414" font-size="17" fill="#ee99d3">B_Stiffener_fr4.gbr · 0.4 mm solder-pad support</text>',
    "</g></svg>",
  ].join("")
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "stiffener-flex-jumper",
  )
})

import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "../../src"
import { positionSvg, renderGerberLayerOverlaySvg } from "../fixtures/preload"
import {
  board,
  getGerberLayers,
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

  const layers = getGerberLayers(files)
  const [copper, supportedCopper] = await Promise.all([
    renderGerberLayerOverlaySvg(
      layers,
      "flex-jumper-copper",
      ["Edge_Cuts", "F_Cu"],
      stiffenerOverlayOptions,
    ),
    renderGerberLayerOverlaySvg(
      layers,
      "flex-jumper-stiffeners",
      ["Edge_Cuts", "F_Cu", "B_Stiffener_polyimide", "B_Stiffener_fr4"],
      stiffenerOverlayOptions,
    ),
  ])

  // Pixel dimensions enlarge the actual Gerber geometry without changing its
  // coordinates or stroke widths. Both panels use the same board bounds.
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="450" viewBox="0 0 1400 450">',
    '<rect width="1400" height="450" fill="#0b1020"/>',
    '<g font-family="sans-serif" fill="#e5e7eb">',
    '<text x="24" y="35" font-size="26" font-weight="600">Six-contact flex jumper · 40 × 12 mm</text>',
    '<text x="24" y="62" font-size="17" fill="#94a3b8">All layers viewed from above; bottom stiffener outlines are shown through the top copper.</text>',
    '<rect x="24" y="82" width="664" height="344" rx="12" fill="#1c2430"/>',
    '<rect x="712" y="82" width="664" height="344" rx="12" fill="#1c2430"/>',
    '<text x="42" y="114" font-size="22" font-weight="600">Top copper Gerber</text>',
    '<text x="730" y="114" font-size="22" font-weight="600">Copper + bottom stiffener Gerbers</text>',
    '<text x="42" y="139" font-size="16" fill="#94a3b8">Contact fingers → flexible neck → solder pads</text>',
    '<text x="730" y="139" font-size="16" fill="#94a3b8">Supports stay under the two ends; the neck stays flexible.</text>',
    positionSvg({ svg: copper, x: 42, y: 156, width: 628, height: 210 }),
    positionSvg({
      svg: supportedCopper,
      x: 730,
      y: 156,
      width: 628,
      height: 210,
    }),
    '<path d="M42 392h28" stroke="#f1bc4b" stroke-width="4"/>',
    '<text x="80" y="398" font-size="17">F_Cu.gbr · six connected copper traces</text>',
    '<path d="M730 380h28" stroke="#69c7ff" stroke-width="4"/>',
    '<text x="768" y="386" font-size="17">B_Stiffener_polyimide.gbr · 0.2 mm backing</text>',
    '<path d="M730 404h28" stroke="#ee99d3" stroke-width="4"/>',
    '<text x="768" y="410" font-size="17">B_Stiffener_fr4.gbr · 0.4 mm solder-pad support</text>',
    "</g></svg>",
  ].join("")
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "stiffener-flex-jumper",
  )
})

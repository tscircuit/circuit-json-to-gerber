import type { LayerRef } from "circuit-json"
import { parseGerberFile } from "gerberts"
import type { GerberFileMap } from "src/convert-circuit-json-to-gerber-files"
import { renderGerberFileSvg } from "./render-gerber-file-svg"
import { vias } from "./via-layer-visibility"

export const copperViews = [
  { layer: "top", file: "F_Cu.gbr", color: "#c83434" },
  { layer: "inner1", file: "In1_Cu.gbr", color: "#7fc97f" },
  { layer: "inner2", file: "In2_Cu.gbr", color: "#ce7d2c" },
  { layer: "bottom", file: "B_Cu.gbr", color: "#4d7fc4" },
] as const
const stack: LayerRef[] = ["top", "inner1", "inner2", "bottom"]

export function getCopperPoints(gerber: string) {
  const parsed = parseGerberFile(gerber)
  const format = parsed.formatSpecification!
  return parsed.operations
    .map((operation) => ({
      x: operation.x! / 10 ** format.xDecimalDigits,
      y: operation.y! / 10 ** format.yDecimalDigits,
    }))
    .sort((a, b) => a.x - b.x)
}

export function getDrillPoints(excellon: string) {
  return [...excellon.matchAll(/^X(-?\d+\.\d+)Y(-?\d+\.\d+)$/gm)]
    .map(([, x, y]) => ({ x: Number(x), y: Number(y) }))
    .sort((a, b) => a.x - b.x)
}

export function getViaDrillFile(via: (typeof vias)[number]) {
  const occupied = via.layers.map((layer) => stack.indexOf(layer))
  return `drill-L${Math.min(...occupied) + 1}-L${Math.max(...occupied) + 1}.drl`
}

// Tracespace plots in micrometers. The centered fixture has every via at y=0;
// use the same board viewport instead of auto-zooming each file independently.
const fixedViewport = (svg: string) =>
  svg.replace(/^<svg[^>]*>/, (opening) =>
    opening
      .replace(/\swidth="[^"]*"/, ' width="800"')
      .replace(/\sheight="[^"]*"/, ' height="300"')
      .replace(/viewBox="[^"]*"/, 'viewBox="-8000 -3000 16000 6000"'),
  )

const label = (x: number, y: number, text: string, size = 17) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" fill="#5994dc">${text}</text>`

export async function renderViaLayerStack(files: GerberFileMap) {
  const drillFiles = Object.keys(files)
    .filter((name) => name.endsWith(".drl"))
    .sort()
  const expectedDrills = [...new Set(vias.map(getViaDrillFile))].sort()
  const drillPassing =
    drillFiles.join() === expectedDrills.join() &&
    expectedDrills.every(
      (file) =>
        JSON.stringify(getDrillPoints(files[file])) ===
        JSON.stringify(
          vias
            .filter((via) => getViaDrillFile(via) === file)
            .map((via) => ({ x: via.x, y: via.y }))
            .sort((a, b) => a.x - b.x),
        ),
    )
  const passing =
    drillPassing &&
    copperViews.every(
      ({ layer, file }) =>
        JSON.stringify(getCopperPoints(files[file])) ===
        JSON.stringify(
          vias
            .filter((via) => via.layers.includes(layer))
            .map((via) => ({ x: via.x, y: via.y })),
        ),
    )

  const panels: string[] = []
  for (const [index, selected] of [...copperViews, undefined].entries()) {
    const selectedCopper = selected ? [selected] : [...copperViews].reverse()
    const occupiedLayer = selected
      ? stack.indexOf(selected.layer) + 1
      : undefined
    const selectedDrills = drillFiles.filter((file) => {
      const [, from, to] = file.match(/^drill-L(\d+)-L(\d+)\.drl$/)!
      return (
        occupiedLayer === undefined ||
        (Number(from) <= occupiedLayer && occupiedLayer <= Number(to))
      )
    })
    const rendered = await Promise.all([
      renderGerberFileSvg(files["Edge_Cuts.gbr"], `view-${index}-edge`, "#888"),
      ...selectedCopper.map(({ file, color }) =>
        renderGerberFileSvg(
          files[file],
          `view-${index}-${file.replaceAll(".", "-")}`,
          color,
        ),
      ),
      // Explicit decimal Excellon coordinates need no zero-suppression guess.
      ...selectedDrills.map((file) =>
        renderGerberFileSvg(
          files[file],
          `view-${index}-${file.replaceAll(".", "-")}`,
          "#ff26e2",
          { filetype: "drill", zero: "T" },
        ),
      ),
    ])
    const annotations = vias
      .map((via) => {
        const x = 400 + via.x * 50
        return (
          label(x, 95, via.pcb_via_id.replaceAll("_", " ")) +
          via.layers
            .map((layer, i) => label(x, 225 + i * 17, layer, 15))
            .join("")
        )
      })
      .join("")
    panels.push(
      `<g transform="translate(0, ${100 + index * 316})">${rendered.map(({ svg }) => fixedViewport(svg)).join("")}${label(400, 30, `Copper view: ${selected?.layer ?? "all layers"}`, 23)}${annotations}</g>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="1664" viewBox="0 0 800 1664">
    <rect width="800" height="1664" fill="#000"/>
    <rect width="800" height="100" fill="#141414"/>
    <text x="400" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${passing ? "#4ade80" : "#fb7185"}">Repro: ${passing ? "PASSING" : "FAILING"}</text>
    <text x="400" y="64" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#f4f4f4">PCB views must show vias only on their physical copper layers.</text>
    <text x="400" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#a3a3a3">Actual generated copper + magenta Excellon drills for each occupied layer span.</text>
    ${panels.join("")}
  </svg>`
}

import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { duplicateViaDrillFixture } from "../fixtures/via-drill-deduplication"

const columns = [
  { x: -6, label: ["Shared", "via records"], span: "drill-L1-L4.drl" },
  {
    x: -3,
    label: ["Via + partial", "route transition"],
    span: "drill-L1-L4.drl",
  },
  { x: 0, label: ["Via + full", "route transition"], span: "drill-L1-L4.drl" },
  { x: 3, label: ["Repeated", "route-only via"], span: "drill-L2-L3.drl" },
  { x: 6, label: ["True blind", "via (control)"], span: "drill-L1-L2.drl" },
]

// Read actual Excellon operations: duplicate hits overlap in a normal PCB
// rendering, so a count diagnostic is needed to make this regression visible.
const parseDrillHits = (file: string) => {
  const tools = new Map<string, number>()
  const hits: Array<{ x: number; y: number; diameter: number }> = []
  let diameter = 0
  for (const line of file.split("\n")) {
    const tool = line.match(/^T(\d+)C([\d.]+)$/)
    if (tool) tools.set(tool[1], Number(tool[2]))
    const selection = line.match(/^T(\d+)$/)
    if (selection) diameter = tools.get(selection[1])!
    const hit = line.match(/^X(-?[\d.]+)Y(-?[\d.]+)$/)
    if (hit) hits.push({ x: Number(hit[1]), y: Number(hit[2]), diameter })
  }
  return hits
}

test("snapshot counts physical via drills once while preserving blind and buried spans", async () => {
  const files = convertCircuitJsonToGerberFiles(duplicateViaDrillFixture)
  const rows = Object.entries(files)
    .filter(([name]) => name.endsWith(".drl"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, file]) => ({ name, hits: parseDrillHits(file) }))
  const total = rows.reduce((sum, row) => sum + row.hits.length, 0)
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="610" viewBox="0 0 1140 610">',
    '<rect width="1140" height="610" rx="16" fill="#0b1020"/>',
    '<g font-family="monospace" fill="#e5e7eb">',
    '<text x="30" y="46" font-size="26" font-weight="bold">Via drill operations</text>',
    '<text x="30" y="78" font-size="15" fill="#94a3b8">Actual Excellon output: five physical locations, 0.60 mm drill, y = 1 mm</text>',
    `<rect x="902" y="24" width="208" height="48" rx="10" fill="${total === 5 ? "#14532d" : "#7f1d1d"}"/>`,
    `<text x="1006" y="55" text-anchor="middle" font-size="22">${total} operations</text>`,
    ...columns.map((column, index) => {
      const x = 390 + index * 155
      return [
        `<text x="${x}" y="131" text-anchor="middle" font-size="15">${column.label[0]}</text>`,
        `<text x="${x}" y="151" text-anchor="middle" font-size="15">${column.label[1]}</text>`,
        `<text x="${x}" y="176" text-anchor="middle" font-size="13" fill="#94a3b8">x = ${column.x} mm</text>`,
      ].join("")
    }),
    ...rows.map((row, rowIndex) => {
      const y = 244 + rowIndex * 112
      return [
        `<rect x="24" y="${y - 40}" width="1092" height="94" rx="10" fill="#111827"/>`,
        `<text x="42" y="${y - 2}" font-size="20">${row.name}</text>`,
        `<text x="42" y="${y + 25}" font-size="15" fill="#94a3b8">${row.hits.length} operations</text>`,
        ...columns.map((column, columnIndex) => {
          const x = 390 + columnIndex * 155
          const count = row.hits.filter((hit) => hit.x === column.x).length
          const expected = column.span === row.name ? 1 : 0
          const color = count > expected ? "#f87171" : "#4ade80"
          return count === 0
            ? `<circle cx="${x}" cy="${y}" r="23" fill="none" stroke="#334155" stroke-dasharray="4 4"/>`
            : [
                `<circle cx="${x}" cy="${y}" r="25" fill="${color}"/>`,
                `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="22" font-weight="bold" fill="#0b1020">${count}</text>`,
                `<text x="${x}" y="${y + 44}" text-anchor="middle" font-size="13" fill="${color}">${count === 1 ? "1 hit" : `${count} hits`}</text>`,
              ].join("")
        }),
      ].join("")
    }),
    '<text x="30" y="582" font-size="14" fill="#94a3b8">Numbers = emitted hits at a location. Red = redundant operation. Dashed circle = no drill.</text>',
    "</g></svg>",
  ].join("")

  // Capture before asserting counts, so the unpatched exporter can generate
  // the historical before image while still failing the regression test.
  await expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "via-drill-deduplication",
  )
  expect(total).toBe(5)
  expect(
    rows.map(({ name, hits }) => [name, hits.map((hit) => hit.x)]),
  ).toEqual([
    ["drill-L1-L2.drl", [6]],
    ["drill-L1-L4.drl", [-6, -3, 0]],
    ["drill-L2-L3.drl", [3]],
  ])
  for (const { hits } of rows) {
    for (const hit of hits) {
      expect(hit.y).toBe(1)
      expect(hit.diameter).toBe(0.6)
    }
  }
})

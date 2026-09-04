import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import { duplicateViaDrillFixture } from "../fixtures/via-drill-deduplication"

test("Gerber file export emits one operation per physical via", () => {
  const files = convertCircuitJsonToGerberFiles(duplicateViaDrillFixture)
  expect(Object.keys(files).filter((name) => name.endsWith(".drl"))).toEqual([
    "drill-L1-L2.drl",
    "drill-L1-L4.drl",
    "drill-L2-L3.drl",
  ])

  expect(files["drill-L1-L2.drl"]).toContain("Plated,1,2,PTH")
  expect(files["drill-L1-L2.drl"]).toContain("\nT10\nX6.0000Y1.0000\nM30")

  expect(files["drill-L1-L4.drl"]).toContain("Plated,1,4,PTH")
  expect(files["drill-L1-L4.drl"]).toContain(
    "\nT10\nX-6.0000Y1.0000\nX-3.0000Y1.0000\nX0.0000Y1.0000\nM30",
  )

  expect(files["drill-L2-L3.drl"]).toContain("Plated,2,3,PTH")
  expect(files["drill-L2-L3.drl"]).toContain("\nT10\nX3.0000Y1.0000\nM30")

  for (const name of ["drill-L1-L2.drl", "drill-L1-L4.drl", "drill-L2-L3.drl"])
    expect(files[name]).toContain("T10C0.600000")
})

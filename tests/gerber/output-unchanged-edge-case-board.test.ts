import { expect, setSystemTime, test } from "bun:test"
import { createHash } from "node:crypto"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src"
import { gerberEdgeCaseBoard } from "tests/fixtures/edge-case-board"

/**
 * Byte-level guard for refactors of the converter: the sha256 of every Gerber
 * and Excellon file of the edge-case board (4 layers, every pad and hole shape
 * at several rotations, cutouts, slots, inner-layer pours). The snapshot was
 * written by v0.0.122, before the aperture index.
 */
test("Gerber and Excellon output of the edge-case board is byte-identical (sha256 per file)", () => {
  setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
  try {
    const files = convertCircuitJsonToGerberFiles(
      gerberEdgeCaseBoard() as unknown as AnyCircuitElement[],
      { flip_y_axis: false },
    )
    const hashes = Object.fromEntries(
      Object.entries(files)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([name, content]) => [
          name,
          createHash("sha256").update(content).digest("hex"),
        ]),
    )
    expect(Object.keys(hashes).length).toBeGreaterThan(12)
    expect(hashes).toMatchSnapshot()
  } finally {
    setSystemTime()
  }
})

import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import JSZip from "jszip"
import { panelBoardOutlines } from "tests/fixtures/panel-board-outlines"

test("CLI exports individual board profiles into the ZIP and validates panel mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gerber-panel-mode-"))
  try {
    const input = join(dir, "panel.circuit.json")
    const output = join(dir, "boards.zip")
    await writeFile(input, JSON.stringify(panelBoardOutlines))
    const result = Bun.spawnSync([
      process.execPath,
      join(import.meta.dir, "../src/cli.ts"),
      input,
      "--panel-mode",
      "individual_boards",
      "--output",
      output,
    ])
    expect(result.exitCode).toBe(0)
    const zip = await JSZip.loadAsync(await readFile(output))
    const edgeCuts = await zip.file("Edge_Cuts.gbr")!.async("string")
    expect(edgeCuts.match(/D02\*/g)).toHaveLength(2)
    expect(edgeCuts).toContain("X-12000000Y006000000D01*")
    expect(edgeCuts.match(/D01\*/g)).toHaveLength(12)
    expect(zip.file("F_Cu.gbr")).not.toBeNull()

    const invalidOutput = join(dir, "invalid.zip")
    const invalid = Bun.spawnSync([
      process.execPath,
      join(import.meta.dir, "../src/cli.ts"),
      input,
      "--panel-mode",
      "typo",
      "--output",
      invalidOutput,
    ])
    expect(invalid.exitCode).not.toBe(0)
    expect(invalid.stderr.toString()).toContain("Allowed choices")
    expect(existsSync(invalidOutput)).toBe(false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

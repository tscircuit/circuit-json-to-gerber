import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import JSZip from "jszip"

const cliPath = resolve(import.meta.dir, "../src/cli.ts")
const source = JSON.stringify([
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 2,
  },
])

for (const [inputName, outputName] of [
  ["board.circuit.json", "board.gerbers.zip"],
  ["board.json", "board.gerbers.zip"],
  ["board", "board.gerbers.zip"],
  ["project.circuit.json/board.json", "project.circuit.json/board.gerbers.zip"],
]) {
  test(`CLI preserves ${inputName} while creating default ${outputName}`, async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gerber-cli-"))
    try {
      const input = join(cwd, inputName)
      await mkdir(dirname(input), { recursive: true })
      await writeFile(input, source)
      const child = Bun.spawn([process.execPath, cliPath, inputName], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: "" })
      expect(await readFile(input, "utf8")).toBe(source)
      expect(stdout).toContain(`Created ${outputName}`)
      const zip = await JSZip.loadAsync(await readFile(join(cwd, outputName)))
      expect(zip.file("Edge_Cuts.gbr")).not.toBeNull()
      expect(zip.file("F_Cu.gbr")).not.toBeNull()
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
}

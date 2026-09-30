import { expect, test } from "bun:test"
import { $ } from "bun"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { getDefaultOutputPath } from "../../../src/get-default-output-path"

const CLI = resolve(import.meta.dir, "..", "..", "..", "src", "cli.ts")

const MINIMAL_BOARD = JSON.stringify([
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    num_layers: 2,
  },
])

test("repro12: default output path derivation never targets the input", () => {
  // existing behavior preserved
  expect(getDefaultOutputPath("board.circuit.json")).toBe("board.gerbers.zip")
  expect(getDefaultOutputPath("some/dir/board.circuit.json")).toBe(
    join("some/dir", "board.gerbers.zip"),
  )
  // previously these returned the input path itself -> source destruction
  expect(getDefaultOutputPath("board.json")).toBe("board.json.gerbers.zip")
  expect(getDefaultOutputPath("board")).toBe("board.gerbers.zip")
  // only the basename is rewritten, never a directory segment
  expect(getDefaultOutputPath("my.circuit.json-files/board.json")).toBe(
    join("my.circuit.json-files", "board.json.gerbers.zip"),
  )
  expect(getDefaultOutputPath("my.circuit.json/board.circuit.json")).toBe(
    join("my.circuit.json", "board.gerbers.zip"),
  )
})

test("repro12: CLI no longer overwrites a board.json input", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gerber-repro12-"))
  const inputPath = join(dir, "board.json")
  await writeFile(inputPath, MINIMAL_BOARD)

  await $`bun ${CLI} board.json`.cwd(dir).quiet()

  // input must be byte-identical afterwards (the old code truncated it)
  expect(await readFile(inputPath, "utf8")).toBe(MINIMAL_BOARD)

  // zip lands next to the input under the derived name and is a real zip
  const zipPath = join(dir, "board.json.gerbers.zip")
  const zipBytes = await readFile(zipPath)
  expect(zipBytes.subarray(0, 2).toString()).toBe("PK")
}, 60000)

test("repro12: CLI refuses when --output points at the input file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gerber-repro12-guard-"))
  const inputPath = join(dir, "board.circuit.json")
  await writeFile(inputPath, MINIMAL_BOARD)

  const proc = await $`bun ${CLI} board.circuit.json -o board.circuit.json`
    .cwd(dir)
    .quiet()
    .nothrow()
  expect(proc.exitCode).not.toBe(0)
  expect(await readFile(inputPath, "utf8")).toBe(MINIMAL_BOARD)
}, 60000)

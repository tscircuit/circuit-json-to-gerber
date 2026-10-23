import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import JSZip from "jszip"

const cliPath = resolve(import.meta.dir, "../src/cli.ts")
// Reuse the USB-C flashlight board, including its components, pads and traces.
const source = await readFile(
  join(import.meta.dir, "gerber/components/UsbCFlashLight.circuit.json"),
)
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function prepareBoard(inputName: string) {
  const cwd = await mkdtemp(join(tmpdir(), "gerber-cli-"))
  temporaryDirectories.push(cwd)
  const inputPath = join(cwd, inputName)
  await mkdir(dirname(inputPath), { recursive: true })
  await writeFile(inputPath, source)
  return { cwd, inputPath }
}

async function runCli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, cliPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exitCode, stdout, stderr }
}

for (const [inputName, outputName, ...options] of [
  ["board.circuit.json", "board.gerbers.zip"],
  ["board.json", "board.gerbers.zip"],
  ["board", "board.gerbers.zip"],
  ["board.CIRCUIT.JSON", "board.gerbers.zip"],
  ["project.circuit.json/board.json", "project.circuit.json/board.gerbers.zip"],
  [
    "project.circuit.json/board.circuit.json",
    "project.circuit.json/board.gerbers.zip",
  ],
  ["board.json", "custom.zip", "-o", "custom.zip"],
  ["board.json", "custom.zip", "--output", "custom.zip"],
]) {
  test(`CLI preserves ${inputName} when exporting to ${outputName} ${options.join(" ")}`, async () => {
    const { cwd, inputPath } = await prepareBoard(inputName)
    const { exitCode, stdout, stderr } = await runCli(
      cwd,
      inputName,
      ...options,
    )

    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: "" })
    expect(await readFile(inputPath)).toEqual(source)
    expect(stdout).toContain(`Created ${outputName}`)

    const zip = await JSZip.loadAsync(await readFile(join(cwd, outputName)), {
      checkCRC32: true,
    })
    for (const name of ["Edge_Cuts.gbr", "F_Cu.gbr"]) {
      const gerber = await zip.file(name)?.async("string")
      expect(gerber).toContain("%MOMM*%")
      expect(gerber?.trimEnd()).toEndWith("M02*")
    }
    expect(await zip.file("drill_npth.drl")?.async("string")).toContain("M30")
  })
}

for (const outputOption of [
  "board.circuit.json",
  "./board.circuit.json",
  "absolute",
]) {
  test(`CLI rejects an output resolving to the input (${outputOption})`, async () => {
    const { cwd, inputPath } = await prepareBoard("board.circuit.json")
    const { exitCode, stdout, stderr } = await runCli(
      cwd,
      "board.circuit.json",
      "--output",
      outputOption === "absolute" ? inputPath : outputOption,
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain("output path would overwrite the input file")
    expect(stdout).not.toContain("Created")
    expect(await readFile(inputPath)).toEqual(source)
  })
}

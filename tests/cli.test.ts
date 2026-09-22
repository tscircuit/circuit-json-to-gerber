import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import JSZip from "jszip"

const temporaryDirectories: string[] = []
const cliPath = join(import.meta.dir, "../src/cli.ts")
const circuitJson = JSON.stringify([
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 2,
  },
])

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

test.each([
  { inputName: "board.circuit.json", outputName: "board.gerbers.zip" },
  { inputName: "board.json", outputName: "board.gerbers.zip" },
  { inputName: "board", outputName: "board.gerbers.zip" },
  { inputName: "board.JSON", outputName: "board.gerbers.zip" },
  {
    inputName: "design.circuit.json/board.json",
    outputName: "design.circuit.json/board.gerbers.zip",
  },
  { inputName: "board.json", outputName: "custom.zip", explicitOutput: true },
])(
  "CLI preserves source for %j",
  async ({ inputName, outputName, explicitOutput }) => {
    const directory = await mkdtemp(join(tmpdir(), "circuit-to-gerber-cli-"))
    temporaryDirectories.push(directory)
    const inputPath = join(directory, inputName)
    const outputPath = join(directory, outputName)
    await mkdir(dirname(inputPath), { recursive: true })
    await writeFile(inputPath, circuitJson)

    const process = Bun.spawn(
      [
        Bun.which("bun")!,
        cliPath,
        inputPath,
        ...(explicitOutput ? ["--output", outputPath] : []),
      ],
      { stdout: "pipe", stderr: "pipe" },
    )
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])

    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    expect((await readFile(inputPath)).equals(Buffer.from(circuitJson))).toBe(
      true,
    )
    expect(stdout).toContain(`Created ${outputPath}`)

    const archive = await JSZip.loadAsync(await readFile(outputPath))
    expect(Object.keys(archive.files)).toEqual(
      expect.arrayContaining(["F_Cu.gbr", "B_Cu.gbr", "Edge_Cuts.gbr"]),
    )
    expect(await archive.file("Edge_Cuts.gbr")!.async("string")).toContain(
      "M02*",
    )
  },
)

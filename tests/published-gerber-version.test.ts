import { expect, test } from "bun:test"
import fs from "node:fs"
import packageJson from "../package.json"
import { convertCircuitJsonToGerberFiles } from "../src"

test("TF.GenerationSoftware matches package.json version and release builds run in prepublishOnly", () => {
  const files = convertCircuitJsonToGerberFiles([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
  ])

  expect(files["F_Cu.gbr"]).toContain(
    `%TF.GenerationSoftware,tscircuit,circuit-json-to-gerber,${packageJson.version}*%`,
  )
  expect(packageJson.scripts.prepublishOnly).toContain("bun run build")

  const releaseWorkflow = fs.readFileSync(
    new URL("../.github/workflows/bun-pver-release.yml", import.meta.url),
    "utf8",
  )
  expect(releaseWorkflow).not.toMatch(/^\s*-\s*run:\s*bun run build\s*$/m)
})

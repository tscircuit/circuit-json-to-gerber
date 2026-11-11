import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import packageJson from "../../package.json"
import { convertSoupToGerberCommands } from "../../src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "../../src/gerber/stringify-gerber"

test("TF.GenerationSoftware matches current package.json version and prepublishOnly rebuilds dist after pver bump", async () => {
  expect(packageJson.scripts.prepublishOnly).toBe("bun run build")

  const releaseWorkflowPath = path.resolve(
    import.meta.dir,
    "../../.github/workflows/bun-pver-release.yml",
  )
  const workflowYaml = fs.readFileSync(releaseWorkflowPath, "utf8")
  expect(workflowYaml).toContain("pver release")
  expect(workflowYaml).not.toMatch(/^\s*-\s*run:\s*bun run build\s*$/m)

  const commands = convertSoupToGerberCommands(
    [
      {
        type: "pcb_board",
        pcb_board_id: "board_0",
        center: { x: 0, y: 0 },
        width: 10,
        height: 10,
        num_layers: 2,
        thickness: 1.6,
        material: "fr4",
      },
    ],
    { flip_y_axis: false },
  )
  const gerberLayers = stringifyGerberCommandLayers(commands)
  expect(gerberLayers.F_Cu).toContain(
    `%TF.GenerationSoftware,tscircuit,circuit-json-to-gerber,${packageJson.version}*%`,
  )
})

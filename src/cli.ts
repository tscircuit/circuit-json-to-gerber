#!/usr/bin/env node

import { program } from "commander"
import { readFile } from "node:fs/promises"
import { createWriteStream } from "node:fs"
import path from "node:path"
import archiver from "archiver"
import { convertCircuitJsonToGerberFiles } from "./"

program
  .name("circuit-to-gerber")
  .description("Convert circuit JSON files to Gerber/Excellon files")
  .argument("<input>", "Input circuit JSON file (*.circuit.json)")
  .option(
    "-o, --output <file>",
    "Output ZIP file (defaults to input.gerbers.zip)",
  )
  .action(async (input, options) => {
    try {
      // Read and parse input JSON
      const circuitJson = JSON.parse(await readFile(input, "utf8"))

      const gerberFiles = convertCircuitJsonToGerberFiles(circuitJson)

      // Create output ZIP file
      const outputPath =
        options.output ||
        (input.endsWith(".circuit.json")
          ? input.replace(/\.circuit\.json$/, ".gerbers.zip")
          : path.join(path.dirname(input), path.basename(input, path.extname(input)) + ".gerbers.zip"))
      const output = createWriteStream(outputPath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      archive.pipe(output)

      for (const [filename, content] of Object.entries(gerberFiles)) {
        archive.append(content, { name: filename })
      }

      await archive.finalize()

      console.log(`Created ${outputPath}`)
    } catch (err) {
      console.error("Error:", (err as Error).message)
      process.exit(1)
    }
  })

program.parse()

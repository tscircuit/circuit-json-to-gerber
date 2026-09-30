#!/usr/bin/env node

import { program } from "commander"
import { readFile } from "node:fs/promises"
import { createWriteStream } from "node:fs"
import { resolve } from "node:path"
import archiver from "archiver"
import { convertCircuitJsonToGerberFiles } from "./"
import { getDefaultOutputPath } from "./get-default-output-path"

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
      const outputPath = options.output || getDefaultOutputPath(input)

      // Never allow the output to overwrite the input file, even when
      // --output explicitly points at it (defense in depth: the default
      // path derivation above already guarantees they differ).
      if (resolve(outputPath) === resolve(input)) {
        console.error(
          "Error: output path would overwrite the input file. Use --output to specify a different file.",
        )
        process.exit(1)
      }

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

#!/usr/bin/env node

import { program } from "commander"
import { readFile, writeFile } from "node:fs/promises"
import { createWriteStream } from "node:fs"
import { resolve, dirname, basename } from "node:path"
import { fileURLToPath } from "node:url"
import archiver from "archiver"
import { convertSoupToGerberCommands, stringifyGerberCommandLayers } from "./"
import { convertSoupToExcellonDrillCommands, stringifyExcellonDrill } from "./"

const __dirname = dirname(fileURLToPath(import.meta.url))

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

      // Convert to gerber commands
      const gerberCmds = convertSoupToGerberCommands(circuitJson)
      const excellonDrillCmds = convertSoupToExcellonDrillCommands({
        circuitJson,
        is_plated: true,
      })
      const excellonDrillUnplatedCmds = convertSoupToExcellonDrillCommands({
        circuitJson,
        is_plated: false,
      })

      // Stringify all outputs
      const gerberOutput = stringifyGerberCommandLayers(gerberCmds)
      const excellonDrillOutput = stringifyExcellonDrill(excellonDrillCmds)
      const excellonDrillUnplatedOutput = stringifyExcellonDrill(
        excellonDrillUnplatedCmds,
      )

      // Create output ZIP file
      const outputPath =
        options.output || input.replace(".circuit.json", ".gerbers.zip")
      const output = createWriteStream(outputPath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      archive.pipe(output)

      // Add all gerber files to ZIP
      for (const [filename, content] of Object.entries(gerberOutput)) {
        archive.append(content, { name: `${filename}.gbr` })
      }

      // Add drill files
      archive.append(excellonDrillOutput, { name: "plated.drl" })
      archive.append(excellonDrillUnplatedOutput, { name: "unplated.drl" })

      await archive.finalize()

      console.log(`Created ${outputPath}`)
    } catch (err) {
      console.error("Error:", (err as Error).message)
      process.exit(1)
    }
  })

program.parse()

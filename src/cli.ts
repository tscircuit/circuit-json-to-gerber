#!/usr/bin/env node

import { createWriteStream } from "node:fs"
import { readFile, realpath, stat } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import archiver from "archiver"
import { program } from "commander"
import { convertCircuitJsonToGerberFiles } from "./"

async function resolveCanonicalPath(filePath: string): Promise<string> {
  const resolved = resolve(filePath)
  try {
    return await realpath(resolved)
  } catch {
    const parent = dirname(resolved)
    if (parent === resolved) {
      return resolved
    }
    return join(await resolveCanonicalPath(parent), basename(resolved))
  }
}

async function isSameFilePath(
  inputPath: string,
  outputPath: string,
): Promise<boolean> {
  if (resolve(outputPath) === resolve(inputPath)) {
    return true
  }

  const [inputStat, outputStat] = await Promise.all([
    stat(inputPath).catch(() => null),
    stat(outputPath).catch(() => null),
  ])
  if (
    inputStat &&
    outputStat &&
    inputStat.dev === outputStat.dev &&
    inputStat.ino === outputStat.ino &&
    inputStat.ino !== 0
  ) {
    return true
  }

  const [canonicalInput, canonicalOutput] = await Promise.all([
    resolveCanonicalPath(inputPath),
    resolveCanonicalPath(outputPath),
  ])
  return canonicalOutput === canonicalInput
}

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
      const outputPath =
        options.output ||
        join(
          dirname(input),
          `${basename(input).replace(/(?:\.circuit)?\.json$/i, "")}.gerbers.zip`,
        )
      if (await isSameFilePath(input, outputPath)) {
        throw new Error(
          "output path would overwrite the input file. Use --output to specify a different file.",
        )
      }

      // Read and parse input JSON
      const circuitJson = JSON.parse(await readFile(input, "utf8"))

      const gerberFiles = convertCircuitJsonToGerberFiles(circuitJson)

      // Create output ZIP file
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

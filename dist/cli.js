#!/usr/bin/env node
import {
  convertSoupToExcellonDrillCommandLayers,
  convertSoupToGerberCommands,
  stringifyExcellonDrill,
  stringifyGerberCommandLayers
} from "./chunk-LSWAU2V4.js";

// src/cli.ts
import { program } from "commander";
import { readFile } from "fs/promises";
import { createWriteStream } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
var __dirname = dirname(fileURLToPath(import.meta.url));
program.name("circuit-to-gerber").description("Convert circuit JSON files to Gerber/Excellon files").argument("<input>", "Input circuit JSON file (*.circuit.json)").option(
  "-o, --output <file>",
  "Output ZIP file (defaults to input.gerbers.zip)"
).action(async (input, options) => {
  try {
    const circuitJson = JSON.parse(await readFile(input, "utf8"));
    const gerberCmds = convertSoupToGerberCommands(circuitJson);
    const excellonDrillCmdLayers = convertSoupToExcellonDrillCommandLayers({
      circuitJson
    });
    const gerberOutput = stringifyGerberCommandLayers(gerberCmds);
    const excellonDrillOutput = Object.fromEntries(
      Object.entries(excellonDrillCmdLayers).map(([filename, commands]) => [
        filename,
        stringifyExcellonDrill(commands)
      ])
    );
    const outputPath = options.output || input.replace(".circuit.json", ".gerbers.zip");
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    for (const [filename, content] of Object.entries(gerberOutput)) {
      archive.append(content, { name: `${filename}.gbr` });
    }
    for (const [filename, content] of Object.entries(excellonDrillOutput)) {
      archive.append(content, { name: filename });
    }
    await archive.finalize();
    console.log(`Created ${outputPath}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
});
program.parse();
//# sourceMappingURL=cli.js.map
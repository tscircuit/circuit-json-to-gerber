# circuit-json-to-gerber

Convert a [Circuit JSON](https://github.com/tscircuit/circuit-json) to Gerber/Excellon files.

## Installation

```bash
# Global installation for CLI usage
npm install -g circuit-json-to-gerber
```

## CLI Usage

Convert a circuit JSON file to Gerber/Excellon files:

```bash
# Basic usage - outputs to input.gerbers.zip
circuit-to-gerber input.circuit.json

# Specify custom output file
circuit-to-gerber input.circuit.json -o output.zip
```

The output ZIP file will contain:

- Gerber files (\*.gbr) for each layer
- Plated drill file (plated.drl)
- Unplated drill file (unplated.drl)

## Library Usage

```typescript
import { convertCircuitJsonToGerberFiles } from "circuit-json-to-gerber"

const files = convertCircuitJsonToGerberFiles(circuitJson)

// The result is filesystem-neutral and includes Gerber and Excellon files.
// Write it to disk, add it to a ZIP, or store it with any file API.
for (const [fileName, contents] of Object.entries(files)) {
  await output.write(fileName, contents)
}
```

Lower-level command conversion and stringification APIs remain available when
custom layer processing is needed.

## References

- [Gerber Format Specification (2022)](https://www.ucamco.com/files/downloads/file_en/456/gerber-layer-format-specification-revision-2022-02_en.pdf?7b3ca7f0753aa2d77f5f9afe31b9f826)
- [Excellon Drill Format Specification](https://gist.github.com/katyo/5692b935abc085b1037e)

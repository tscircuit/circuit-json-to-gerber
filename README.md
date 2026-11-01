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

## Exporting boards from a panel

By default, inputs containing `pcb_panel` export the panel's rectangular boundary
and explicit `pcb_cutout` routing geometry. Individual `pcb_board` outlines are
omitted so they do not cut through holding tabs defined by the panel routing.

To cut the boards as separate pieces using their own profiles, select
`individual_boards` mode:

```bash
circuit-to-gerber input.circuit.json --panel-mode individual_boards -o boards.zip
```

```typescript
const files = convertCircuitJsonToGerberFiles(circuitJson, {
  panel_mode: "individual_boards",
})
```

This mode emits each board's outline (or its rectangle when no outline is supplied)
and omits the panel boundary. Board-edge cutouts are merged into the board profiles;
internal cutouts remain holes. Coordinates and copper/drill layers are preserved,
and the result is one combined file set, not a separate ZIP for each board.
It does not generate panel rails, routing tabs, or mouse bites. Existing cutouts
are still exported, so use the default `panel` mode for a tabbed manufacturing panel.
The same option is accepted by `convertCircuitJsonToGerberCommands` and its
`convertSoupToGerberCommands` alias. Inputs without a panel behave the same in both modes.

## References

- [Gerber Format Specification (2022)](https://www.ucamco.com/files/downloads/file_en/456/gerber-layer-format-specification-revision-2022-02_en.pdf?7b3ca7f0753aa2d77f5f9afe31b9f826)
- [Excellon Drill Format Specification](https://gist.github.com/katyo/5692b935abc085b1037e)

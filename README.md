# circuit-json-to-gerber

Convert a [Circuit JSON](https://github.com/tscircuit/circuit-json) to Gerber/Excellon files.

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

## References

- [Gerber Format Specification (2022)](https://www.ucamco.com/files/downloads/file_en/456/gerber-layer-format-specification-revision-2022-02_en.pdf?7b3ca7f0753aa2d77f5f9afe31b9f826)
- [Excellon Drill Format Specification](https://gist.github.com/katyo/5692b935abc085b1037e)

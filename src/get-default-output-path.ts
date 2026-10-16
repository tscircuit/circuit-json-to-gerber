import { basename, dirname, join } from "node:path"

/**
 * Derive the default ZIP output path for the CLI.
 *
 * The previous implementation used
 * `input.replace(".circuit.json", ".gerbers.zip")`, which destroyed the
 * source file whenever the input did not contain ".circuit.json"
 * (e.g. `board.json` or an extensionless `board`): the output path then
 * equaled the input path and the CLI truncated its own input with ZIP
 * bytes. It also replaced the first occurrence anywhere in the path, so
 * a directory named `*.circuit.json` produced a wrong output location.
 *
 * Rules:
 * - `board.circuit.json` -> `board.gerbers.zip` (unchanged behavior)
 * - `board.json`         -> `board.json.gerbers.zip` (never the input)
 * - `board`              -> `board.gerbers.zip`
 * - only the basename is rewritten; the directory is preserved
 */
export function getDefaultOutputPath(input: string): string {
  const dir = dirname(input)
  const base = basename(input)
  const outBase = base.endsWith(".circuit.json")
    ? `${base.slice(0, -".circuit.json".length)}.gerbers.zip`
    : `${base}.gerbers.zip`
  return join(dir, outBase)
}

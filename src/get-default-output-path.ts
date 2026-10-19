import { basename, dirname, join } from "node:path"

// Only strip a JSON suffix from the filename, leaving directory names intact.
export function getDefaultOutputPath(input: string): string {
  const stem = basename(input).replace(/(?:\.circuit)?\.json$/i, "")
  return join(dirname(input), `${stem}.gerbers.zip`)
}

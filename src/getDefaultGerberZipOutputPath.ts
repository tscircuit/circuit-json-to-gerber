import path from "node:path"

/**
 * Returns the default output path for the generated Gerber ZIP file.
 * Preserves directory structure while replacing any `(.circuit)?.json` extension
 * with `.gerbers.zip`. For extensionless inputs, appends `.gerbers.zip`.
 */
export function getDefaultGerberZipOutputPath(input: string): string {
  const dir = path.dirname(input)
  const base = path.basename(input)
  const stem = base.replace(/(?:\.circuit)?\.json$/i, "")
  return path.join(dir, `${stem}.gerbers.zip`)
}

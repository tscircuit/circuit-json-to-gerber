// bun-match-svg is optional in CI environments where dependencies may not be installed
let hasSvgMatcher = false
try {
  await import("bun-match-svg")
  hasSvgMatcher = true
} catch {}
import { expect } from "bun:test"
let pcbStackup: any = undefined
try {
  pcbStackup = (await import("pcb-stackup")).default
} catch {}
import { Readable } from "stream"
async function toMatchGerberSnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName?: string,
) {
  // Create layers array from gerberOutput
  const layers = Object.entries(gerberOutput).map(([filename, content]) => ({
    filename,
    gerber: Readable.from(content),
  }))

  try {
    if (!pcbStackup || !hasSvgMatcher) {
      // Skip detailed SVG snapshot checks when optional deps are missing
      return
    }
    const stackup = await pcbStackup(layers)
    const svgArray: string[] = []
    const svgNames: string[] = []

    for (const item of Object.keys(stackup)) {
      const layer = (stackup as any)[item] as { svg: string }
      if (layer.svg) {
        svgArray.push(layer.svg)
        svgNames.push(`${svgName}-${item}`)
      }
    }
    return expect(svgArray).toMatchMultipleSvgSnapshots(
      testPathOriginal,
      svgNames,
    )
  } catch (error) {
    throw new Error(`Failed to generate PCB stackup: ${error}`)
  }
}

expect.extend({
  toMatchGerberSnapshot: toMatchGerberSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchGerberSnapshot(
      testImportMetaPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
  }
}

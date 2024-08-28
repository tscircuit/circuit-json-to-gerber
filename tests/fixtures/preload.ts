import "bun-match-svg"
import { expect } from "bun:test"
import pcbStackup from "pcb-stackup"
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
    const stackup = await pcbStackup(layers)

    // We'll use the top layer SVG for comparison, but you could choose bottom or both
    const svg = stackup.top.svg

    return expect(svg).toMatchSvgSnapshot(testPathOriginal, svgName)
  } catch (error) {
    throw new Error(`Failed to generate PCB stackup: ${error}`)
  }
}

expect.extend({
  // biome-ignore lint/suspicious/noExplicitAny:
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

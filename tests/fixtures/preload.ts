import "bun-match-svg"
import { expect } from "bun:test"
import gerberToSvg from "gerber-to-svg"

async function toMatchGerberSnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName?: string,
) {
  const svg = await new Promise((resolve, reject) => {
    gerberToSvg(gerberOutput.Edge_Cuts, {}, (err, svg) => {
      if (err) return reject(err)
      resolve(svg)
    })
  })

  return expect(svg).toMatchSvgSnapshot(import.meta.path, svgName)
}

expect.extend({
  // biome-ignore lint/suspicious/noExplicitAny:
  toMatchGerberSnapshot: toMatchGerberSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchGerberSnapshot(
      testPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
  }
}

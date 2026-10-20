import { expect, test } from "bun:test"
import gerberToSvg from "gerber-to-svg"
import { roundedQfp } from "../fixtures/rounded-qfp"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

// Capture the current exporter output unchanged. The follow-up fix should update
// these same snapshots, making the merged side pads visible in the PR image diff.
for (const layer of ["top", "bottom"] as const) {
  test(`rounded QFP visual repro: ${layer} copper and soldermask`, async () => {
    const result = stringifyGerberCommandLayers(
      convertCircuitJsonToGerberCommands(roundedQfp(layer)),
    )
    const names = layer === "top" ? ["F_Cu", "F_Mask"] : ["B_Cu", "B_Mask"]
    const svgs = await Promise.all(
      names.map(
        (name) =>
          new Promise<string>((resolve, reject) => {
            // Model an LR-incompatible CAM reader and render actual Gerber geometry.
            const stream = gerberToSvg(
              result[name].replace(/^%LR[^\n]*\n/gm, ""),
              {
                id: `rounded-qfp-${layer}-${name}`,
                attributes: { color: "#edaa52" },
              },
            )
            let svg = ""
            stream.on("data", (chunk) => {
              svg += chunk.toString()
            })
            stream.on("error", reject)
            // Give both GitHub and the pixel matcher an inspectable image size.
            stream.on("end", () =>
              resolve(
                svg
                  .replace(/ width="[^"]+"/, ' width="720"')
                  .replace(/ height="[^"]+"/, ' height="720"'),
              ),
            )
          }),
      ),
    )
    await expect(svgs).toMatchMultipleSvgSnapshots(
      import.meta.path,
      names.map((name) => `rounded-qfp-${layer}-${name}`),
    )
  })
}

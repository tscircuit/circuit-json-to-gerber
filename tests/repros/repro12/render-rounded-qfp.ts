import { roundedQfp } from "../../fixtures/rounded-qfp"
import { convertCircuitJsonToGerberCommands } from "../../../src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "../../../src/gerber/stringify-gerber"
import gerberToSvg from "gerber-to-svg"

export const renderCopper = async (gerber: string): Promise<string> => {
  // Explicitly simulate a CAM reader without aperture rotation support.
  // No custom geometry correction: render the emitted macro coordinates.
  const stream = gerberToSvg(gerber.replace(/^%LR[^\n]*\n/gm, ""), {
    id: "rounded-qfp",
    attributes: { color: "#edaa52" },
  })
  const result = new Promise<string>((resolve, reject) => {
    let svg = ""
    stream.on("data", (chunk) => {
      svg += chunk.toString()
    })
    stream.on("end", () => resolve(svg))
    stream.on("error", reject)
  })
  return result
}

if (import.meta.main) {
  const output = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands(roundedQfp()),
  )
  if (process.argv.includes("--capture-before")) {
    await Bun.write(`${import.meta.dir}/before.F_Cu.gbr`, output.F_Cu)
  } else {
    await Bun.write(`${import.meta.dir}/after.F_Cu.gbr`, output.F_Cu)
    const before = await renderCopper(
      await Bun.file(`${import.meta.dir}/before.F_Cu.gbr`).text(),
    )
    const after = await renderCopper(output.F_Cu)
    const panel = (svg: string, x: number) =>
      svg
        .replace(/<svg\b/, `<svg x="${x}" y="100"`)
        .replace(/ width="[^"]+"/, ' width="450"')
        .replace(/ height="[^"]+"/, ' height="450"')
    const comparison = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620">
<rect width="1000" height="620" fill="#121820"/>
<g font-family="sans-serif" fill="#f3f4f6">
<text x="30" y="36" font-size="23">Rounded QFP pads · CAM reader ignores aperture rotation</text>
<text x="30" y="76" font-size="18" fill="#ff9292">Before: side pads merge</text>
<text x="530" y="76" font-size="18" fill="#8de0af">Fixed: all 32 pads isolated</text>
${panel(before.replaceAll("rounded-qfp", "before-qfp"), 25)}${panel(after, 525)}
<text x="30" y="584" font-size="15">0.5 mm pitch · 0.3 × 1.2 mm pads · 0.06 mm corner radius</text>
<text x="30" y="608" font-size="13" fill="#aab6c4">Synthetic repro rendered from actual Gerber output; not a capture of JLC's CAM system.</text>
</g></svg>`
    await Bun.write(`${import.meta.dir}/comparison.svg`, comparison)
  }
}

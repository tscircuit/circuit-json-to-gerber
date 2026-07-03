import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { parseKicadModToCircuitJson } from "kicad-component-converter"
import gerberToSvg from "gerber-to-svg"
import sharp from "sharp"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const SOD_123_KICAD_MOD = `(module D_SOD-123 (layer F.Cu) (tedit 58645DC7)
  (descr SOD-123)
  (tags SOD-123)
  (attr smd)
  (fp_text reference REF** (at 0 -2) (layer F.SilkS)
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_text user %R (at 0 -2) (layer F.Fab)
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_text value D_SOD-123 (at 0 2.1) (layer F.Fab)
    (effects (font (size 1 1) (thickness 0.15)))
  )
  (fp_line (start -2.25 -1) (end -2.25 1) (layer F.SilkS) (width 0.12))
  (fp_line (start 0.25 0) (end 0.75 0) (layer F.Fab) (width 0.1))
  (fp_line (start 0.25 0.4) (end -0.35 0) (layer F.Fab) (width 0.1))
  (fp_line (start 0.25 -0.4) (end 0.25 0.4) (layer F.Fab) (width 0.1))
  (fp_line (start -0.35 0) (end 0.25 -0.4) (layer F.Fab) (width 0.1))
  (fp_line (start -0.35 0) (end -0.35 0.55) (layer F.Fab) (width 0.1))
  (fp_line (start -0.35 0) (end -0.35 -0.55) (layer F.Fab) (width 0.1))
  (fp_line (start -0.75 0) (end -0.35 0) (layer F.Fab) (width 0.1))
  (fp_line (start -1.4 0.9) (end -1.4 -0.9) (layer F.Fab) (width 0.1))
  (fp_line (start 1.4 0.9) (end -1.4 0.9) (layer F.Fab) (width 0.1))
  (fp_line (start 1.4 -0.9) (end 1.4 0.9) (layer F.Fab) (width 0.1))
  (fp_line (start -1.4 -0.9) (end 1.4 -0.9) (layer F.Fab) (width 0.1))
  (fp_line (start -2.35 -1.15) (end 2.35 -1.15) (layer F.CrtYd) (width 0.05))
  (fp_line (start 2.35 -1.15) (end 2.35 1.15) (layer F.CrtYd) (width 0.05))
  (fp_line (start 2.35 1.15) (end -2.35 1.15) (layer F.CrtYd) (width 0.05))
  (fp_line (start -2.35 -1.15) (end -2.35 1.15) (layer F.CrtYd) (width 0.05))
  (fp_line (start -2.25 1) (end 1.65 1) (layer F.SilkS) (width 0.12))
  (fp_line (start -2.25 -1) (end 1.65 -1) (layer F.SilkS) (width 0.12))
  (pad 1 smd rect (at -1.65 0) (size 0.9 1.2) (layers F.Cu F.Paste F.Mask))
  (pad 2 smd rect (at 1.65 0) (size 0.9 1.2) (layers F.Cu F.Paste F.Mask))
  (model \${KISYS3DMOD}/Diode_SMD.3dshapes/D_SOD-123.wrl
    (at (xyz 0 0 0))
    (scale (xyz 1 1 1))
    (rotate (xyz 0 0 0))
  )
)`

const renderGerberToPng = (gerber: string, id: string) =>
  new Promise<Buffer>((resolve, reject) => {
    gerberToSvg(
      gerber,
      {
        id,
        attributes: {
          color: "#cccccc",
        },
      },
      async (error, svg) => {
        if (error) {
          reject(error)
          return
        }

        try {
          resolve(
            await sharp(Buffer.from(svg), { density: 1200 }).png().toBuffer(),
          )
        } catch (renderError) {
          reject(renderError)
        }
      },
    )
  })

const expectPngSnapshot = async (png: Buffer, snapshotName: string) => {
  const snapshotPath = join(
    dirname(import.meta.path),
    "__snapshots__",
    snapshotName,
  )

  if (process.env.UPDATE_PNG_SNAPSHOTS === "1") {
    await mkdir(dirname(snapshotPath), { recursive: true })
    await writeFile(snapshotPath, png)
  }

  expect(png).toEqual(await readFile(snapshotPath))
}

test("exports fabrication elements from a KiCad footprint", async () => {
  const sod123FootprintCircuitJson =
    await parseKicadModToCircuitJson(SOD_123_KICAD_MOD)
  const circuit = new Circuit({
    platform: {
      footprintLibraryMap: {
        kicad: async (footprintName: string) => {
          expect(footprintName).toBe("Diode_SMD/D_SOD-123")
          return {
            footprintCircuitJson: sod123FootprintCircuitJson,
          }
        },
      },
    } as any,
  })

  circuit.add(
    <board width="10mm" height="10mm">
      <diode footprint="kicad:Diode_SMD/D_SOD-123" name="D1" />
    </board>,
  )

  await circuit.renderUntilSettled()
  const renderedCircuitJson = circuit.getCircuitJson()
  expect(
    renderedCircuitJson.filter((element) => element.type === "pcb_smtpad"),
  ).toHaveLength(2)

  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    ...sod123FootprintCircuitJson,
  ] as AnyCircuitElement[]
  const fabricationPaths = circuitJson.filter(
    (element) => element.type === "pcb_fabrication_note_path",
  )
  const fabricationTexts = circuitJson.filter(
    (element) => element.type === "pcb_fabrication_note_text",
  )

  expect(
    circuitJson.filter((element) => element.type === "pcb_smtpad"),
  ).toHaveLength(2)
  expect(fabricationPaths.length).toBeGreaterThanOrEqual(11)
  expect(fabricationTexts.map((element: any) => element.text)).toContain(
    "D_SOD-123",
  )
  expect(
    fabricationPaths.some((element: any) => {
      const [start, end] = element.route
      return (
        start?.x === 0.25 &&
        Object.is(Math.abs(start?.y), 0) &&
        end?.x === 0.75 &&
        Object.is(Math.abs(end?.y), 0)
      )
    }),
  ).toBe(true)

  const gerberCommands = convertSoupToGerberCommands(circuitJson as any)
  const gerberOutput = stringifyGerberCommandLayers(gerberCommands)

  expect(gerberOutput.F_Fab).toContain("%TF.FileFunction,Other,Fab,Top*%")
  expect(gerberOutput.F_Fab).toContain("D02*")
  expect(gerberOutput.F_Fab).toContain("D01*")
  expect(gerberOutput.F_Fab).toContain("X000250000Y000000000D02*")
  expect(gerberOutput.F_Fab).toContain("X000750000Y000000000D01*")

  await expectPngSnapshot(
    await renderGerberToPng(
      gerberOutput.F_Fab,
      "fabrication-text-from-kicad-footprint-F_Fab",
    ),
    "fabrication-text-from-kicad-footprint-F_Fab.snap.png",
  )
})

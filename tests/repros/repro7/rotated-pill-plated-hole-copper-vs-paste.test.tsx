import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import gerberToSvg from "gerber-to-svg"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const renderGerberLayer = (gerber: string, id: string) =>
  new Promise<string>((resolve, reject) => {
    gerberToSvg(gerber, { id }, (error, svg) => {
      if (error) {
        reject(error)
      } else {
        resolve(svg)
      }
    })
  })

test("repro8: rotated pill plated hole copper vs paste mismatch", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="11mm" height="11mm">
      <chip
        pcbRotation={-90}
        name="U1"
        footprint={
          <footprint>
            <platedhole
              portHints={["pin13"]}
              pcbX="-4.324985mm"
              pcbY="1.57511755mm"
              holeWidth="0.5999988mm"
              holeHeight="1.499997mm"
              outerWidth="1.0999978mm"
              outerHeight="1.999996mm"
              shape="pill"
            />
          </footprint>
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson as any),
  )

  const pasteSvg = await renderGerberLayer(
    gerberOutput.F_Paste,
    "rotated-pill-plated-hole-copper-vs-paste-F_Paste",
  )

  expect(pasteSvg).toContain(
    '<rect x="-449.999" y="-549.999" width="899.998" height="1099.998"/>',
  )
  expect(pasteSvg).not.toContain(
    '<rect x="-999.998" y="-549.999" width="1999.996" height="1099.998"/>',
  )

  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "",
    ["F_Cu", "F_Paste"],
    {
      colors: {
        F_Cu: "#c83434",
        F_Paste: "#ffffff",
      },
      backgroundColor: "#111111",
    },
  )
})

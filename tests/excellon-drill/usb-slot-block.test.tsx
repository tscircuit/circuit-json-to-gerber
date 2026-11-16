import { expect, test } from "bun:test"
import gerberToSvg from "gerber-to-svg"
import { Circuit } from "tscircuit"
import { convertCircuitJsonToGerberFiles } from "src/index"

test("USB mounting slot exports as two round drill hits", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={10} height={10} routingDisabled>
      <platedhole
        shape="pill"
        outerWidth={1}
        outerHeight={1.8}
        holeWidth={0.6}
        holeHeight={1.4}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const { "drill-L1-L2.drl": drill } = convertCircuitJsonToGerberFiles(
    circuit.getCircuitJson(),
  )
  expect(drill).toContain("\nX0.0000Y-0.4000\nG85X0.000Y0.400\nM30")

  const svg = await new Promise<string>((resolve, reject) => {
    gerberToSvg(
      drill,
      {
        id: "usb-slot-block",
        attributes: { width: 150, height: 350, color: "#253930" },
      },
      (error, svg) => {
        if (error) reject(error)
        else resolve(svg)
      },
    )
  })
  await expect([svg]).toMatchMultipleSvgSnapshots(import.meta.path, [
    "usb-slot-block",
  ])
})

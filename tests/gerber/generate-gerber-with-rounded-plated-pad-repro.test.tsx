import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

test("rounded plated pad preserves its corner radius in Gerber export", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={3.2} height={3.2} routingDisabled>
      <platedhole
        shape="circular_hole_with_rect_pad"
        holeDiameter={1.1}
        rectPadWidth={2.5}
        rectPadHeight={2.5}
        rectBorderRadius={0.15}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expect(
    circuitJson.find((element) => element.type === "pcb_plated_hole"),
  ).toMatchObject({ rect_border_radius: 0.15 })

  const files = convertCircuitJsonToGerberFiles(circuitJson)
  for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
    expect(files[`${layer}.gbr`]).toMatch(
      /%ADD\d+ROUNDRECT,0\.150000X-1\.100000X1\.100000X1\.100000X1\.100000X1\.100000X-1\.100000X-1\.100000X-1\.100000\*%/,
    )
  }
})

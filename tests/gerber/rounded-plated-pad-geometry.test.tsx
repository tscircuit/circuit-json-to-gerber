import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { ReactElement } from "react"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

async function renderPad(platedHole: ReactElement) {
  const circuit = new Circuit()
  circuit.add(
    <board width={8} height={8} routingDisabled>
      {platedHole}
    </board>,
  )
  await circuit.renderUntilSettled()
  return convertCircuitJsonToGerberFiles(circuit.getCircuitJson())
}

for (const flipYAxis of [false, true]) {
  test(`rounded plated pads preserve rotation with flip=${flipYAxis}`, async () => {
    const circuit = new Circuit()
    circuit.add(
      <board width={18} height={6} routingDisabled>
        {[0, 30, 90, 270].map((pcbRotation, index) => (
          <platedhole
            shape="circular_hole_with_rect_pad"
            holeDiameter={0.6}
            rectPadWidth={2.5}
            rectPadHeight={1.8}
            rectBorderRadius={0.15}
            solderMaskMargin={0.1}
            pcbRotation={pcbRotation}
            pcbX={index * 4 - 6}
          />
        ))}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const files = convertCircuitJsonToGerberFiles(circuitJson, {
      flip_y_axis: flipYAxis,
    })
    for (const layer of ["F_Cu", "B_Cu"]) {
      expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
      expect(files[`${layer}.gbr`].match(/D03\*/g)).toHaveLength(4)
    }
    for (const layer of ["F_Mask", "B_Mask"]) {
      expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.250000X/)
      expect(files[`${layer}.gbr`].match(/D03\*/g)).toHaveLength(4)
    }
    await expect({
      F_Cu: files["F_Cu.gbr"],
      F_Mask: files["F_Mask.gbr"],
    }).toMatchGerberLayerSnapshots(
      import.meta.path,
      `rounded-plated-pad-rotations-flip-${flipYAxis}`,
      ["F_Cu", "F_Mask"],
    )
  })
}

test.each([undefined, 0, -0.1])(
  "radius %s exports a rectangular plated pad",
  async (rectBorderRadius) => {
    const files = await renderPad(
      <platedhole
        shape="circular_hole_with_rect_pad"
        holeDiameter={0.6}
        rectPadWidth={2.5}
        rectPadHeight={1.8}
        rectBorderRadius={rectBorderRadius}
      />,
    )
    for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
      expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+R,2\.500000X1\.800000\*%/)
      expect(files[`${layer}.gbr`]).not.toMatch(/%ADD\d+ROUNDRECT,/)
    }
  },
)

test("oversized radius is clamped to half the shorter pad dimension", async () => {
  const files = await renderPad(
    <platedhole
      shape="circular_hole_with_rect_pad"
      holeDiameter={0.6}
      rectPadWidth={2.5}
      rectPadHeight={1.8}
      rectBorderRadius={10}
    />,
  )
  for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
    expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.900000X/)
  }
})

test.each([
  { margin: -0.05, maskAperture: /%ADD\d+ROUNDRECT,0\.100000X/ },
  { margin: -0.2, maskAperture: /%ADD\d+R,2\.100000X1\.400000\*%/ },
])(
  "mask margin $margin contracts the opening",
  async ({ margin, maskAperture }) => {
    const files = await renderPad(
      <platedhole
        shape="circular_hole_with_rect_pad"
        holeDiameter={0.6}
        rectPadWidth={2.5}
        rectPadHeight={1.8}
        rectBorderRadius={0.15}
        pcbRotation={30}
        solderMaskMargin={margin}
      />,
    )
    for (const layer of ["F_Cu", "B_Cu"]) {
      expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
    }
    for (const layer of ["F_Mask", "B_Mask"]) {
      expect(files[`${layer}.gbr`]).toMatch(maskAperture)
      if (margin === -0.2) expect(files[`${layer}.gbr`]).toContain("G36*")
    }
  },
)

test.each([0, 30])("rounded slotted pad at %s degrees", async (pcbRotation) => {
  const files = await renderPad(
    <platedhole
      shape="pill_hole_with_rect_pad"
      holeWidth={1}
      holeHeight={0.6}
      rectPadWidth={2.5}
      rectPadHeight={1.8}
      rectBorderRadius={0.15}
      pcbRotation={pcbRotation}
    />,
  )
  for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
    expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
  }
})

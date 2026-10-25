import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

// IP2312 board corner pad: https://tscircuit.com/krishnax12/ip2312-fast-charging-module
// Preserve the 0.15 mm corner radius through copper and soldermask export.
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
    expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
    expect(files[`${layer}.gbr`]).not.toMatch(/%ADD\d+R,2\.500000X2\.500000\*%/)
  }
  await expect({
    F_Cu: files["F_Cu.gbr"],
    "drill-L1-L2.drl": files["drill-L1-L2.drl"],
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rounded-plated-pad-minimal-repro",
    circuitJson,
    ["F_Cu", "drill-L1-L2.drl"],
    {
      circuitJsonLabel: "TSX board: 0.15 mm corner radius",
      gerberLabel: "Fixed Gerber: rounded corners",
    },
  )
})

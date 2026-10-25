import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

const minimalCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 3.2,
    height: 3.2,
    thickness: 1.4,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "rounded_pad",
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    x: 0,
    y: 0,
    hole_diameter: 1.1,
    rect_pad_width: 2.5,
    rect_pad_height: 2.5,
    rect_border_radius: 0.15,
    rect_ccw_rotation: 0,
    hole_offset_x: 0,
    hole_offset_y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  },
]

const fullBoard: AnyCircuitElement[] = await Bun.file(
  new URL("../fixtures/ip2312/board.circuit.json", import.meta.url),
).json()

for (const { name, circuitJson, label } of [
  {
    name: "rounded-plated-pad-minimal-repro",
    circuitJson: minimalCircuit,
    label: "Single pad: 0.15 mm corner radius",
  },
  {
    name: "ip2312-rounded-plated-pad-board-repro",
    circuitJson: fullBoard,
    label: "IP2312 board: four rounded plated pads",
  },
]) {
  test(`repro: ${name} exports square corners`, async () => {
    const files = convertCircuitJsonToGerberFiles(circuitJson)
    // Capture the current failure: an R aperture has square corners.
    for (const layer of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
      expect(files[`${layer}.gbr`]).toMatch(/%ADD\d+R,2\.500000X2\.500000\*%/)
    }
    await expect({
      F_Cu: files["F_Cu.gbr"],
      "drill-L1-L2.drl": files["drill-L1-L2.drl"],
    }).toMatchCircuitJsonPcbAndGerberSnapshot(
      import.meta.path,
      name,
      circuitJson,
      ["F_Cu", "drill-L1-L2.drl"],
      {
        circuitJsonLabel: label,
        gerberLabel: "Actual export: square plated-pad corners",
      },
    )
  })
}

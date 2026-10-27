import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const padOutline = [
  { x: -2, y: -1 },
  { x: 2, y: -1 },
  { x: 2, y: 1 },
  { x: -2, y: 1 },
]

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 14,
    height: 8,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  ...[0, 90].map(
    (rotation, index) =>
      ({
        type: "pcb_plated_hole",
        pcb_plated_hole_id: `polygon_plated_hole_${rotation}`,
        shape: "hole_with_polygon_pad",
        hole_shape: "circle",
        hole_diameter: 0.8,
        pad_outline: padOutline,
        ccw_rotation: rotation,
        hole_offset_x: 0,
        hole_offset_y: 0,
        x: index === 0 ? -3 : 3,
        y: 0,
        layers: ["top", "bottom"],
        is_covered_with_solder_mask: false,
        soldermask_margin: 0.2,
      }) as AnyCircuitElement,
  ),
]

const getGerberOutput = () =>
  stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))

// The PCB SVG renderer ignores polygon-pad ccw_rotation. Bake the expected 90°
// outline into the reference view only; Gerber generation uses circuitJson above.
const expectedPcbView: AnyCircuitElement[] = circuitJson.map((element) =>
  element.type === "pcb_plated_hole" &&
  element.shape === "hole_with_polygon_pad" &&
  element.ccw_rotation === 90
    ? {
        ...element,
        ccw_rotation: 0,
        pad_outline: [
          { x: 1, y: -2 },
          { x: 1, y: 2 },
          { x: -1, y: 2 },
          { x: -1, y: -2 },
        ],
      }
    : element,
)

test("unrotated polygon plated hole keeps its pad outline", () => {
  const gerberOutput = getGerberOutput()
  for (const layer of ["F_Cu", "B_Cu"]) {
    expect(gerberOutput[layer]).toContain("X-05000000Y-01000000D02*")
    expect(gerberOutput[layer]).toContain("X-01000000Y001000000D01*")
  }
})

for (const layer of ["F_Cu", "B_Cu"]) {
  test.failing(`polygon plated hole rotates pad_outline on ${layer}`, () => {
    const gerberOutput = getGerberOutput()
    // Rotate (-2, -1) by 90 degrees CCW, then translate by (3, 0): (4, -2).
    expect(gerberOutput[layer]).toContain("X004000000Y-02000000D02*")
    expect(gerberOutput[layer]).toContain("X004000000Y002000000D01*")
    expect(gerberOutput[layer]).toContain("X002000000Y002000000D01*")
    expect(gerberOutput[layer]).toContain("X002000000Y-02000000D01*")
  })
}

for (const layer of ["F_Mask", "B_Mask"]) {
  test.failing(
    `polygon plated hole rotates expanded soldermask on ${layer}`,
    () => {
      const gerberOutput = getGerberOutput()
      // The 0.2mm margin expands (-2, -1) to (-2.2, -1.2), which maps to (4.2, -2.2).
      expect(gerberOutput[layer]).toContain("X004200000Y-02200000D02*")
      expect(gerberOutput[layer]).toContain("X004200000Y002200000D01*")
      expect(gerberOutput[layer]).toContain("X001800000Y002200000D01*")
      expect(gerberOutput[layer]).toContain("X001800000Y-02200000D01*")
    },
  )
}

test("polygon plated hole PCB and Gerber snapshot", async () => {
  const drillLayers = Object.fromEntries(
    Object.entries(
      convertSoupToExcellonDrillCommandLayers({ circuitJson }),
    ).map(([layerName, commands]) => [
      layerName,
      stringifyExcellonDrill(commands),
    ]),
  )

  await expect({
    ...getGerberOutput(),
    ...drillLayers,
  }).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rotated-polygon-plated-hole",
    expectedPcbView,
    ["F_Cu", "F_Mask"],
    { circuitJsonLabel: "Expected PCB: 0° left, 90° right" },
  )
})

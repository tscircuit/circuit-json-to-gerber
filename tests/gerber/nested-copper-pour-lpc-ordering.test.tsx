import { expect, test } from "bun:test"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import pcbStackup from "pcb-stackup"
import { convertCircuitJsonToGerberFiles } from "src"
import {
  convertCircuitJsonToGerberCommands,
  stringifyGerberCommandLayers,
} from "src/gerber"
import { Circuit } from "tscircuit"

function samplePngRgb(
  rendered: { width: number; height: number; pixels: Uint8Array },
  point: { normX: number; normY: number },
): number[] {
  const px = Math.round(point.normX * (rendered.width - 1))
  const py = Math.round(point.normY * (rendered.height - 1))
  const offset = (py * rendered.width + px) * 4
  return [
    rendered.pixels[offset],
    rendered.pixels[offset + 1],
    rendered.pixels[offset + 2],
  ]
}

async function createNestedCopperPourBoard(
  layer: "top" | "bottom",
): Promise<AnyCircuitElement[]> {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={14} routingDisabled schematicDisabled>
      <net name="V3_3" />
      <net name="GND" />
      <resistor
        name="R1"
        resistance="1k"
        footprint="0805"
        pcbX={-1.6}
        pcbY={0}
        layer={layer}
      />
      <resistor
        name="R2"
        resistance="1k"
        footprint="0805"
        pcbX={1.6}
        pcbY={0}
        layer={layer}
      />
      <trace from=".R1 > .pin1" to="net.V3_3" />
      <trace from=".R2 > .pin2" to="net.V3_3" />
      <resistor
        name="R3"
        resistance="1k"
        footprint="0805"
        pcbX={-7}
        pcbY={0}
        layer={layer}
      />
      <trace from=".R3 > .pin1" to="net.GND" />
      <copperpour
        connectsTo="net.V3_3"
        layer={layer}
        clearance={0.35}
        outline={[
          { x: -3.2, y: -2.8 },
          { x: 3.2, y: -2.8 },
          { x: 3.2, y: 2.8 },
          { x: -3.2, y: 2.8 },
        ]}
      />
      <copperpour connectsTo="net.GND" layer={layer} clearance={0.4} />
    </board>,
  )
  await circuit.renderUntilSettled()

  // The pinned tscircuit build predates multi-pour mutual moat subtraction:
  // carve the isolation moat around the V3_3 island out of the outer GND BRep
  // pour so the Circuit JSON matches modern multi-pour boards.
  const elements = circuit.getCircuitJson()
  const islandMoatRing = {
    vertices: [
      { x: -4.0, y: -3.6 },
      { x: 4.0, y: -3.6 },
      { x: 4.0, y: 3.6 },
      { x: -4.0, y: 3.6 },
    ],
  }
  const pours = elements.filter(
    (el): el is PcbCopperPour => el.type === "pcb_copper_pour",
  )
  const outerPour = pours[1]
  if (outerPour?.shape === "brep" && outerPour.brep_shape) {
    outerPour.brep_shape.inner_rings = [
      ...(outerPour.brep_shape.inner_rings ?? []).filter((ring) =>
        ring.vertices.some((v) => Math.abs(v.x) > 4.2),
      ),
      islandMoatRing,
    ]
  }
  return elements
}

for (const layer of ["top", "bottom"] as const) {
  const copperLayer = layer === "top" ? "F_Cu" : "B_Cu"

  test(`preserves nested island copper pour declared before enclosing pour on ${layer} layer`, async () => {
    const circuitJson = await createNestedCopperPourBoard(layer)
    const files = convertCircuitJsonToGerberFiles(circuitJson)
    const gerberLayers = stringifyGerberCommandLayers(
      convertCircuitJsonToGerberCommands(circuitJson),
    )

    const stackup = await pcbStackup(
      Object.entries(files).map(([filename, gerber]) => ({ filename, gerber })),
      {
        id: `nested-pour-${layer}`,
        attributes: { width: 800, height: 560 },
      },
    )

    const png = new Resvg(stackup[layer].svg, {
      fitTo: { mode: "width", value: 800 },
    }).render()

    const islandPourRgb = samplePngRgb(png, { normX: 0.5, normY: 0.36 })
    const moatGapRgb = samplePngRgb(png, { normX: 0.5, normY: 0.271 })
    const outerPourRgb = samplePngRgb(png, { normX: 0.5, normY: 0.12 })

    expect(islandPourRgb).toEqual(outerPourRgb)
    expect(islandPourRgb).not.toEqual(moatGapRgb)

    await expect(gerberLayers).toMatchCircuitJsonPcbAndGerberSnapshot(
      import.meta.path,
      `nested-copper-pour-${layer}`,
      circuitJson,
      [copperLayer],
    )
  })
}

test("orders three-level nested pours outer-to-inner while keeping disjoint pour order", () => {
  const board: AnyCircuitElement = {
    type: "pcb_board",
    pcb_board_id: "board_nested",
    center: { x: 0, y: 0 },
    width: 24,
    height: 24,
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  }
  const innerIsland: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "inner_rect_island",
    layer: "top",
    shape: "rect",
    source_net_id: "net_1v8",
    covered_with_solder_mask: true,
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
    rotation: 0,
  }
  const middleRing: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "middle_brep_ring",
    layer: "top",
    shape: "brep",
    source_net_id: "net_3v3",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -5, y: 0, bulge: 1 },
          { x: 5, y: 0, bulge: 1 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -2, y: -2 },
            { x: 2, y: -2 },
            { x: 2, y: 2 },
            { x: -2, y: 2 },
          ],
        },
      ],
    },
  }
  const outerPlane: PcbCopperPour = {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "outer_brep_plane",
    layer: "top",
    shape: "brep",
    source_net_id: "net_gnd",
    covered_with_solder_mask: true,
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -10, y: 10 },
          { x: 10, y: 10 },
          { x: 10, y: -10 },
          { x: -10, y: -10 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -6, y: 0, bulge: -1 },
            { x: 6, y: 0, bulge: -1 },
          ],
        },
      ],
    },
  }

  const gerber = stringifyGerberCommandLayers(
    convertCircuitJsonToGerberCommands([
      board,
      innerIsland,
      middleRing,
      outerPlane,
    ]),
  ).F_Cu

  const outerIndex = gerber.indexOf("X-10000000Y-10000000D02*")
  const middleIndex = gerber.indexOf("X005000000Y000000000D02*")
  const innerIndex = gerber.indexOf("X-01000000Y001000000D02*")
  const lastClearEndIndex = gerber.lastIndexOf("%LPD*%")

  expect(outerIndex).toBeGreaterThan(0)
  expect(middleIndex).toBeGreaterThan(outerIndex)
  expect(innerIndex).toBeGreaterThan(middleIndex)
  expect(innerIndex).toBeGreaterThan(lastClearEndIndex)
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement, LayerRef } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const copperLayers = [
  "top",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
  "bottom",
] as const satisfies readonly LayerRef[]

const copperGerberLayers = [
  "F_Cu",
  "In1_Cu",
  "In2_Cu",
  "In3_Cu",
  "In4_Cu",
  "In5_Cu",
  "In6_Cu",
  "In7_Cu",
  "In8_Cu",
  "B_Cu",
] as const

const traceStartX = -32
const traceEndX = 32
const firstTraceY = -27
const traceSpacingY = 6

test("generates copper gerbers for 10 layer pcbs", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 80,
      height: 60,
      num_layers: 10,
    },
    ...copperLayers.map((layer, index) => ({
      type: "pcb_trace",
      pcb_trace_id: `pcb_trace_${layer}`,
      route: [
        {
          route_type: "wire",
          x: traceStartX,
          y: firstTraceY + index * traceSpacingY,
          width: 1 + index * 0.1,
          layer,
        },
        {
          route_type: "wire",
          x: traceEndX,
          y: firstTraceY + index * traceSpacingY,
          width: 1 + index * 0.1,
          layer,
        },
      ],
    })),
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_0",
      x: 0,
      y: 0,
      hole_diameter: 1.2,
      outer_diameter: 3,
      layers: [...copperLayers],
    },
  ] as AnyCircuitElement[]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  expect(Object.keys(gerberOutput)).toEqual([
    "F_Cu",
    "F_SilkScreen",
    "F_Mask",
    "F_Paste",
    "B_Cu",
    "B_SilkScreen",
    "B_Mask",
    "B_Paste",
    "Edge_Cuts",
    "In1_Cu",
    "In2_Cu",
    "In3_Cu",
    "In4_Cu",
    "In5_Cu",
    "In6_Cu",
    "In7_Cu",
    "In8_Cu",
  ])
  expect(gerberOutput.In7_Cu).toContain("%TF.FileFunction,Copper,L8,Inr*%")
  expect(gerberOutput.In8_Cu).toContain("%TF.FileFunction,Copper,L9,Inr*%")
  expect(gerberOutput.B_Cu).toContain("%TF.FileFunction,Copper,L10,Bot*%")
  expect(gerberOutput.In7_Cu).toContain("%ADD10C,1.700000*%")
  expect(gerberOutput.In8_Cu).toContain("%ADD10C,1.800000*%")
  expect(gerberOutput.In7_Cu).toContain("X032000000Y015000000D01*")
  expect(gerberOutput.In8_Cu).toContain("X032000000Y021000000D01*")
  expect(gerberOutput.In8_Cu).toContain("X000000000Y000000000D03*")
  expect(gerberOutput).toMatchGerberSnapshot(import.meta.path, "ten-layer")
  expect(gerberOutput).toMatchGerberLayerSnapshots(
    import.meta.path,
    "ten-layer",
    [...copperGerberLayers],
  )
  expect(gerberOutput).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "ten-layer-all-copper",
    [...copperGerberLayers],
  )
})

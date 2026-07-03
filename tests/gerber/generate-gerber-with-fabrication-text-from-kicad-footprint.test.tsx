import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const sod123FootprintCircuitJson = [
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rect",
    x: -1.65,
    y: 0,
    width: 0.9,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_0",
    port_hints: ["pin1"],
    pcb_port_id: "pcb_port_0",
    pin_number: 1,
    pin_label: "pin1",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "rect",
    x: 1.65,
    y: 0,
    width: 0.9,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_0",
    port_hints: ["pin2"],
    pcb_port_id: "pcb_port_1",
    pin_number: 2,
    pin_label: "pin2",
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_0",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_1",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: 0.25, y: -0.4 },
      { x: -0.35, y: 0 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_2",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: 0.25, y: 0.4 },
      { x: 0.25, y: -0.4 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_3",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -0.35, y: 0 },
      { x: 0.25, y: 0.4 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_4",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -0.35, y: 0 },
      { x: -0.35, y: -0.55 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_5",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -0.35, y: 0 },
      { x: -0.35, y: 0.55 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_6",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -0.75, y: 0 },
      { x: -0.35, y: 0 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_7",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -1.4, y: -0.9 },
      { x: -1.4, y: 0.9 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_8",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: 1.4, y: -0.9 },
      { x: -1.4, y: -0.9 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_9",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: 1.4, y: 0.9 },
      { x: 1.4, y: -0.9 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "pcb_fabrication_note_path_10",
    pcb_component_id: "pcb_component_0",
    layer: "top",
    route: [
      { x: -1.4, y: 0.9 },
      { x: 1.4, y: 0.9 },
    ],
    stroke_width: 0.1,
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "pcb_fabrication_note_text_0",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_component_0",
    anchor_position: { x: 0, y: 2 },
    anchor_alignment: "center",
    text: "%R",
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "pcb_fabrication_note_text_1",
    layer: "top",
    font: "tscircuit2024",
    font_size: 1,
    pcb_component_id: "pcb_component_0",
    anchor_position: { x: 0, y: -2.1 },
    anchor_alignment: "center",
    text: "D_SOD-123",
  },
] as AnyCircuitElement[]

test("exports fabrication elements from a KiCad footprint", async () => {
  const circuit = new Circuit({
    platform: {
      footprintLibraryMap: {
        kicad: async (footprintName: string) => {
          expect(footprintName).toBe("Diode_SMD/D_SOD-123")
          return { footprintCircuitJson: sod123FootprintCircuitJson }
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

  await expect(gerberOutput).toMatchGerberLayerSnapshots(
    import.meta.path,
    "fabrication-text-from-kicad-footprint",
    ["F_Fab"],
    { backgroundColor: "#000000", compareMode: "text" },
  )
})

import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { renderFabricationDimension } from "src/gerber/convert-soup-to-gerber-commands/renderFabricationDimension"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("fabrication note elements default omitted layer to top and omitted font_size to 1", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "fab_path_0",
      pcb_component_id: "comp_0",
      route: [
        { x: -2, y: 0 },
        { x: 2, y: 0 },
      ],
      stroke_width: 0.15,
    },
    {
      type: "pcb_fabrication_note_rect",
      pcb_fabrication_note_rect_id: "fab_rect_0",
      pcb_component_id: "comp_0",
      center: { x: 0, y: 0 },
      width: 4,
      height: 2,
      stroke_width: 0.12,
      is_filled: false,
      has_stroke: true,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "fab_text_0",
      pcb_component_id: "comp_0",
      font: "tscircuit2024",
      anchor_position: { x: 0, y: 3 },
      anchor_alignment: "center",
      text: "FAB1",
    },
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "fab_dim_0",
      pcb_component_id: "comp_0",
      from: { x: 5, y: -4 },
      to: { x: -5, y: -4 },
      text: "10.0mm",
      arrow_size: 0.8,
      font: "tscircuit2024",
    },
  ] as unknown as AnyCircuitElement[]

  const gerberCommands = convertCircuitJsonToGerberCommands(circuitJson)
  expect(gerberCommands.F_Fab).toBeDefined()

  const gerberOutput = stringifyGerberCommandLayers(gerberCommands)
  expect(gerberOutput.F_Fab).toContain("%TF.FileFunction,Other,Fab,Top*%")
  expect(gerberOutput.F_Fab).not.toMatch(/NaN|Infinity/)
  expect(gerberOutput.F_Fab).toContain("D01*")
})

test("renderFabricationDimension normalizes upside-down text rotation and omits zero-length extension lines when offset is 0", () => {
  const glayer: any[] = [
    {
      command_code: "ADD",
      aperture_number: 10,
      standard_template_code: "C",
      diameter: 0.1,
    },
  ]
  const renderedTexts: Array<{ ccw_rotation: number; font_size: number }> = []

  renderFabricationDimension({
    element: {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "dim_rtl",
      pcb_component_id: "comp_0",
      from: { x: 6, y: 0 },
      to: { x: -6, y: 0 },
      text: "12.00 mm",
      arrow_size: 1,
      offset_distance: 0,
      font: "tscircuit2024",
    } as any,
    glayer,
    mapY: (y) => y,
    renderText: (textEl) => {
      renderedTexts.push({
        ccw_rotation: textEl.ccw_rotation,
        font_size: textEl.font_size,
      })
    },
  })

  expect(renderedTexts).toHaveLength(1)
  expect(Math.abs(renderedTexts[0]!.ccw_rotation)).toBe(0)
  expect(renderedTexts[0]!.font_size).toBe(1)

  // With offset_distance = 0, the main dimension line has 1 move + 1 plot, plus 2 arrows (each 1 move + 2 plots) = 5 plots total
  const plotOps = glayer.filter((cmd) => cmd.command_code === "D01")
  expect(plotOps).toHaveLength(5)
})

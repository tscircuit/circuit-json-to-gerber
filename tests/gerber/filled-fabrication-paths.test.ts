import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbFabricationNotePath } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "../../src/convert-circuit-json-to-gerber-files"
import { renderGerberFileSvg } from "../fixtures/render-gerber-file-svg"
import importedPart from "./assets/c41413180-fabrication-notes.circuit.json"

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const supplierPaths = importedPart.filter(
  (element) => element.type === "pcb_fabrication_note_path",
) as PcbFabricationNotePath[]

test.each(["top", "bottom"] as const)(
  "C41413180 filled polarity symbols survive %s fabrication Gerber export",
  async (layer) => {
    const paths = supplierPaths.map((path) => ({ ...path, layer }))
    expect(paths).toHaveLength(4)
    for (const path of paths) {
      expect(path.is_filled).toBe(true)
      expect(path.has_stroke).toBe(false)
      expect(path.stroke_width).toBe(0)
    }
    const file = layer === "top" ? "F_Fab.gbr" : "B_Fab.gbr"
    for (const flip_y_axis of [false, true]) {
      const gerber = convertCircuitJsonToGerberFiles([board, ...paths], {
        flip_y_axis,
      })[file]!
      expect(gerber.match(/G36\*/g)).toHaveLength(4)
      expect(gerber.match(/G37\*/g)).toHaveLength(4)
      expect(gerber).not.toContain("C,0.000000")
      const first = paths[0]!.route[0]!
      const move = gerber.match(/X(-?\d+)Y(-?\d+)D02\*/)!
      expect(Number(move[1])).toBe(Math.round(first.x * 1e6))
      expect(Number(move[2])).toBe(
        Math.round(first.y * (flip_y_axis ? -1 : 1) * 1e6),
      )
      if (!flip_y_axis) {
        const { svg } = await renderGerberFileSvg(
          gerber,
          `${layer}_filled_polarity`,
          "#f5e2a1",
        )
        await expect(svg).toMatchSvgSnapshot(
          import.meta.path,
          `${layer}-filled-polarity`,
        )
      }
    }
  },
)

test.each(["top", "bottom"] as const)(
  "%s fabrication paths respect fill and stroke independently",
  (layer) => {
    const file = layer === "top" ? "F_Fab.gbr" : "B_Fab.gbr"
    const path: PcbFabricationNotePath = {
      type: "pcb_fabrication_note_path",
      pcb_fabrication_note_path_id: "triangle",
      pcb_component_id: "component",
      layer,
      route: [
        { x: 1, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 4 },
      ],
      stroke_width: 0.15,
    }
    const render = (extra: Partial<PcbFabricationNotePath>) =>
      convertCircuitJsonToGerberFiles([board, { ...path, ...extra }])[file]!
    const fillOnly = render({ is_filled: true, has_stroke: false })
    const both = render({ is_filled: true })
    const strokeOnly = render({ is_filled: false })
    const hidden = render({ is_filled: false, has_stroke: false })
    expect(fillOnly.match(/G36\*/g)).toHaveLength(1)
    expect(fillOnly.match(/D01\*/g)).toHaveLength(3)
    expect(both.match(/D01\*/g)).toHaveLength(5)
    expect(strokeOnly).not.toContain("G36*")
    expect(strokeOnly.match(/D01\*/g)).toHaveLength(2)
    expect(hidden).not.toMatch(/D0[123]\*/)
  },
)

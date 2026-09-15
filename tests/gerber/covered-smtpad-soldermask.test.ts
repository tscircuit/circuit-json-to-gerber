import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import { parseGerberFile } from "gerberts"
import { convertCircuitJsonToGerberFiles } from "src"

const padBase = {
  type: "pcb_smtpad" as const,
  layer: "top" as const,
  x: 0,
  y: 0,
  soldermask_margin: 0.1,
}

const pads: Exclude<PcbSmtPad, { shape: "polygon" }>[] = [
  { ...padBase, pcb_smtpad_id: "circle", shape: "circle", radius: 0.5 },
  { ...padBase, pcb_smtpad_id: "rect", shape: "rect", width: 2, height: 1 },
  {
    ...padBase,
    pcb_smtpad_id: "rotated-rect",
    shape: "rotated_rect",
    width: 2,
    height: 1,
    ccw_rotation: 45,
  },
  {
    ...padBase,
    pcb_smtpad_id: "rounded-rect",
    shape: "rotated_rect",
    width: 2,
    height: 1,
    ccw_rotation: 90,
    corner_radius: 0.2,
  },
  {
    ...padBase,
    pcb_smtpad_id: "pill",
    shape: "pill",
    width: 2,
    height: 1,
    radius: 0.5,
  },
  {
    ...padBase,
    pcb_smtpad_id: "rotated-pill",
    shape: "rotated_pill",
    width: 2,
    height: 1,
    radius: 0.5,
    ccw_rotation: 45,
  },
]

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 12,
  height: 20,
  num_layers: 2,
  thickness: 1.6,
  material: "fr4",
}

for (const pad of pads) {
  for (const layer of ["top", "bottom"] as const) {
    test(`covered ${pad.pcb_smtpad_id} on ${layer} retains copper without a mask opening`, () => {
      const prefix = layer === "top" ? "F" : "B"
      const exportPad = (covered: boolean | undefined) =>
        convertCircuitJsonToGerberFiles([
          board,
          { ...pad, layer, is_covered_with_solder_mask: covered },
        ])
      const exposed = exportPad(false)
      const covered = exportPad(true)
      const defaultPad = exportPad(undefined)
      const copperFile = `${prefix}_Cu.gbr`
      const maskFile = `${prefix}_Mask.gbr`
      const operations = (gerber: string) =>
        parseGerberFile(gerber).operations.map((op) => op.getString())

      expect(operations(covered[copperFile]).length).toBeGreaterThan(0)
      expect(operations(covered[copperFile])).toEqual(
        operations(exposed[copperFile]),
      )
      expect(operations(defaultPad[maskFile])).toEqual(
        operations(exposed[maskFile]),
      )
      expect(operations(exposed[maskFile]).length).toBeGreaterThan(0)
      expect(operations(covered[maskFile])).toHaveLength(0)

      const roundTripped = parseGerberFile(covered[maskFile]).getString()
      expect(operations(roundTripped)).toHaveLength(0)
    })
  }
}

test("covered and exposed SMT pads render with distinct mask openings", async () => {
  const circuitJson: AnyCircuitElement[] = [board]
  for (const layer of ["top", "bottom"] as const) {
    for (const [row, pad] of pads.entries()) {
      for (const [column, covered] of [true, false, undefined].entries()) {
        circuitJson.push({
          ...pad,
          pcb_smtpad_id: `${pad.pcb_smtpad_id}-${layer}-${column}`,
          layer,
          x: (column - 1) * 3.5,
          y: 7.5 - row * 3,
          is_covered_with_solder_mask: covered,
        })
      }
    }
  }

  const files = convertCircuitJsonToGerberFiles(circuitJson)
  const layers = Object.fromEntries(
    Object.entries(files).map(([name, contents]) => [
      name.replace(/\.gbr$/, ""),
      contents,
    ]),
  )
  for (const prefix of ["F", "B"]) {
    await expect(layers).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `covered-smtpad-${prefix}`,
      [`${prefix}_Cu`, `${prefix}_Mask`],
    )
  }
})

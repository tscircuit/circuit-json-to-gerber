import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSolderPaste } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { getSolderPasteRotation } from "src/gerber/convert-soup-to-gerber-commands/getSolderPasteRotation"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const paste: PcbSolderPaste = {
  type: "pcb_solder_paste",
  pcb_solder_paste_id: "paste",
  layer: "bottom",
  shape: "pill",
  x: 1,
  y: 2,
  width: 0.2,
  height: 0.6,
  radius: 0.1,
}

const hole: AnyCircuitElement = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "hole",
  shape: "pill",
  x: paste.x,
  y: paste.y,
  layers: ["top", "bottom"],
  outer_width: 0.4,
  outer_height: 0.8,
  hole_width: 0.1,
  hole_height: 0.3,
  ccw_rotation: 90,
}

test("Y-flipped pill paste mirrors the aperture and flash without LR", () => {
  const output = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(
      [{ ...paste, shape: "rotated_pill", ccw_rotation: 30 }],
      { flip_y_axis: true },
    ),
  ).B_Paste

  expect(output).toMatch(
    /%ADD\d+ROTATEDPILL,0\.200000X-0\.100000X-0\.173205\*%/,
  )
  expect(output).toContain("X001000000Y-02000000D03*")
  expect(output).not.toContain("%LR")
})

test("paste without rotation falls back to the matching plated hole", () => {
  expect(getSolderPasteRotation(paste, [hole])).toBe(90)
  expect(getSolderPasteRotation(paste, [])).toBe(0)
})

test("explicit zero paste rotation overrides the plated hole", () => {
  expect(
    getSolderPasteRotation(
      { ...paste, shape: "rotated_pill", ccw_rotation: 0 },
      [hole],
    ),
  ).toBe(0)
})

import type { AnyCircuitElement } from "circuit-json"

// Small, deliberately unrouted QFP: all 32 pads must remain isolated.
// A CAM reader ignoring LR makes the 1.2 mm side pads overlap at 0.5 mm pitch.
export const roundedQfp = (layer: "top" | "bottom" = "top") =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 9,
      height: 9,
      num_layers: 2,
    },
    ...Array.from({ length: 32 }, (_, i) => {
      const side = Math.floor(i / 8)
      const offset = ((i % 8) - 3.5) * 0.5
      return {
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad_${i}`,
        pcb_component_id: "qfp",
        layer,
        shape: "rotated_rect",
        width: 0.3,
        height: 1.2,
        corner_radius: 0.06,
        ccw_rotation: side * 90,
        x: side === 0 || side === 2 ? offset : side === 1 ? -3 : 3,
        y: side === 1 || side === 3 ? offset : side === 0 ? 3 : -3,
        soldermask_margin: 0.025,
      }
    }),
  ] as AnyCircuitElement[]

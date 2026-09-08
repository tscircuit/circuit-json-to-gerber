import type { AnyCircuitElement } from "circuit-json"

// Two profiles in a panel, without routed slots or holding tabs. The left
// profile includes a connector notch; the right uses the rectangle fallback.
export const panelBoardOutlines: AnyCircuitElement[] = [
  {
    type: "pcb_panel",
    pcb_panel_id: "panel",
    center: { x: 0, y: 0 },
    width: 60,
    height: 30,
    thickness: 1.6,
    covered_with_solder_mask: true,
  },
  {
    type: "pcb_board",
    pcb_board_id: "left",
    pcb_panel_id: "panel",
    center: { x: -15, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    outline: [
      { x: -25, y: -10 },
      { x: -5, y: -10 },
      { x: -5, y: 10 },
      { x: -12, y: 10 },
      { x: -12, y: 6 },
      { x: -18, y: 6 },
      { x: -18, y: 10 },
      { x: -25, y: 10 },
    ],
  },
  {
    type: "pcb_board",
    pcb_board_id: "right",
    pcb_panel_id: "panel",
    center: { x: 15, y: 2 },
    width: 20,
    height: 16,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
]

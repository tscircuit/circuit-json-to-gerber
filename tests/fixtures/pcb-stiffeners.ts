import type { PcbBoard, PcbStiffener } from "circuit-json"

export const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 40,
  height: 20,
  num_layers: 2,
  material: "flex",
  thickness: 0.12,
}

export const rectangle: Extract<PcbStiffener, { shape: "rect" }> = {
  type: "pcb_stiffener",
  pcb_stiffener_id: "pcb_stiffener_0",
  pcb_board_id: board.pcb_board_id,
  shape: "rect",
  center: { x: 0, y: -7 },
  width: 2,
  height: 2,
  layer: "bottom",
  material: "polyimide",
  thickness: 0.2,
}

export const polygon: Extract<PcbStiffener, { shape: "polygon" }> = {
  type: "pcb_stiffener",
  pcb_stiffener_id: "pcb_stiffener_1",
  pcb_board_id: board.pcb_board_id,
  shape: "polygon",
  outline: [
    { x: 5, y: 4 },
    { x: 8, y: 4 },
    { x: 8, y: 6 },
    { x: 6, y: 7 },
    { x: 5, y: 6 },
  ],
  layer: "top",
  material: "fr4",
  thickness: 0.4,
  adhesive_thickness: 0.05,
}

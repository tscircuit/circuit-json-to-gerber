import type { AnyCircuitElement, PcbBoard, PcbStiffener } from "circuit-json"
import type { GerberFileMap } from "../../src"

const boardCenter = { x: 30, y: -10 }
const toWorld = ({ x, y }: { x: number; y: number }) => ({
  x: x + boardCenter.x,
  y: y + boardCenter.y,
})

// A six-conductor flex jumper with 12 mm-wide ends and a 6 mm-wide neck.
// Board outlines and copper use world coordinates; stiffeners are board-local.
export const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "flex_jumper",
  center: boardCenter,
  width: 40,
  height: 12,
  num_layers: 2,
  material: "flex",
  thickness: 0.12,
  outline: [
    { x: -20, y: -6 },
    { x: -10, y: -6 },
    { x: -10, y: -3 },
    { x: 10, y: -3 },
    { x: 10, y: -6 },
    { x: 20, y: -6 },
    { x: 20, y: 6 },
    { x: 10, y: 6 },
    { x: 10, y: 3 },
    { x: -10, y: 3 },
    { x: -10, y: 6 },
    { x: -20, y: 6 },
  ].map(toWorld),
}

export const visualCopper: AnyCircuitElement[] = Array.from(
  { length: 6 },
  (_, conductor): AnyCircuitElement[] => {
    const y = conductor - 2.5
    const finger = toWorld({ x: -17.25, y })
    const solderPad = toWorld({ x: 17, y })
    return [
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `connector_finger_${conductor + 1}`,
        shape: "rect",
        ...finger,
        width: 4.5,
        height: 0.7,
        layer: "top",
      },
      {
        type: "pcb_smtpad",
        pcb_smtpad_id: `solder_pad_${conductor + 1}`,
        shape: "rect",
        ...solderPad,
        width: 3.5,
        height: 0.8,
        layer: "top",
      },
      {
        type: "pcb_trace",
        pcb_trace_id: `jumper_trace_${conductor + 1}`,
        route: [
          { route_type: "wire", ...finger, width: 0.25, layer: "top" },
          { route_type: "wire", ...solderPad, width: 0.25, layer: "top" },
        ],
      },
    ]
  },
).flat()

export const visualStiffeners: PcbStiffener[] = [
  {
    type: "pcb_stiffener",
    pcb_stiffener_id: "connector_polyimide_support",
    pcb_board_id: board.pcb_board_id,
    shape: "rect",
    center: { x: -15, y: 0 },
    width: 9,
    height: 11,
    layer: "bottom",
    material: "polyimide",
    thickness: 0.2,
    adhesive_thickness: 0.05,
  },
  {
    type: "pcb_stiffener",
    pcb_stiffener_id: "solder_pad_fr4_support",
    pcb_board_id: board.pcb_board_id,
    shape: "polygon",
    outline: [
      { x: 11.3, y: -5.5 },
      { x: 18.7, y: -5.5 },
      { x: 19.5, y: -4.7 },
      { x: 19.5, y: 4.7 },
      { x: 18.7, y: 5.5 },
      { x: 11.3, y: 5.5 },
      { x: 10.5, y: 4.7 },
      { x: 10.5, y: -4.7 },
    ],
    layer: "bottom",
    material: "fr4",
    thickness: 0.4,
    adhesive_thickness: 0.05,
  },
]

export const stiffenerOverlayOptions = {
  colors: {
    B_Stiffener_polyimide: "#69c7ff",
    B_Stiffener_fr4: "#ee99d3",
    Edge_Cuts: "#ffffff",
    F_Cu: "#f1bc4b",
  },
  backgroundColor: "#1c2430",
}

// Snapshot helpers use layer names; the public exporter returns filenames.
export const getGerberLayers = (files: GerberFileMap) =>
  Object.fromEntries(
    Object.entries(files)
      .filter(([name]) => name.endsWith(".gbr"))
      .map(([name, contents]) => [name.slice(0, -4), contents]),
  )

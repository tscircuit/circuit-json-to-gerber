import type { PcbSmtPadCircle, PcbStiffener } from "circuit-json"
import type { GerberFileMap } from "../../src"
import { board, polygon, rectangle } from "./pcb-stiffeners"

export const visualStiffeners: PcbStiffener[] = [
  {
    ...rectangle,
    pcb_stiffener_id: "bottom_polyimide_rotated",
    center: { x: -12, y: -6 },
    width: 5,
    height: 2,
    rotation: -20,
  },
  {
    ...rectangle,
    pcb_stiffener_id: "bottom_polyimide_rect",
    center: { x: -2, y: -6 },
    width: 4,
    height: 2,
  },
  {
    ...polygon,
    pcb_stiffener_id: "top_fr4_polygon",
    outline: polygon.outline.map(({ x, y }) => ({ x: x - 18, y })),
  },
  {
    ...rectangle,
    pcb_stiffener_id: "top_polyimide_rotated",
    center: { x: -4, y: 5 },
    width: 6,
    height: 3,
    rotation: 37,
    layer: "top",
  },
  {
    ...rectangle,
    pcb_stiffener_id: "top_stainless_steel_rotated",
    center: { x: 5, y: 4 },
    width: 5,
    height: 3,
    rotation: -20,
    layer: "top",
    material: "stainless_steel",
  },
  {
    ...polygon,
    pcb_stiffener_id: "top_aluminum_polygon",
    outline: polygon.outline.map(({ x, y }) => ({ x: x + 8, y })),
    material: "aluminum",
  },
  {
    ...polygon,
    pcb_stiffener_id: "bottom_fr4_polygon",
    outline: polygon.outline.map(({ x, y }) => ({ x, y: y - 10 })),
    layer: "bottom",
  },
]

export const createCopperLandmark = (
  id: string,
  x: number,
  y: number,
  layer: "top" | "bottom",
): PcbSmtPadCircle => ({
  type: "pcb_smtpad",
  pcb_smtpad_id: id,
  shape: "circle",
  x,
  y,
  radius: 0.35,
  layer,
})

export const visualCopperLandmarks = [
  createCopperLandmark("top_fr4", -11.5, 5.5, "top"),
  createCopperLandmark("top_polyimide", -4, 5, "top"),
  createCopperLandmark("top_stainless_steel", 5, 4, "top"),
  createCopperLandmark("top_aluminum", 14.5, 5.5, "top"),
  createCopperLandmark("bottom_polyimide_rotated", -12, -6, "bottom"),
  createCopperLandmark("bottom_polyimide_rect", -2, -6, "bottom"),
  createCopperLandmark("bottom_fr4", 6.5, -4.5, "bottom"),
]

export const stiffenerLayerColors = {
  F_Stiffener_polyimide: "#e5b65c",
  B_Stiffener_polyimide: "#e5b65c",
  F_Stiffener_fr4: "#8dd09a",
  B_Stiffener_fr4: "#8dd09a",
  F_Stiffener_stainless_steel: "#c9d0d8",
  F_Stiffener_aluminum: "#9cbbef",
}

export const stiffenerOverlayOptions = {
  colors: {
    ...stiffenerLayerColors,
    Edge_Cuts: "#ffffff",
    F_Cu: "#e76666",
    B_Cu: "#719ef2",
  },
  backgroundColor: "#1c2430",
}

// Snapshot matchers use layer names; the public exporter returns filenames.
export const getGerberLayers = (files: GerberFileMap) =>
  Object.fromEntries(
    Object.entries(files)
      .filter(([name]) => name.endsWith(".gbr"))
      .map(([name, contents]) => [name.slice(0, -4), contents]),
  )

export { board }

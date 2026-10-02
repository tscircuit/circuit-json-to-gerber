import { expect, test } from "bun:test"
import type { PcbStiffener } from "circuit-json"
import { board, rectangle, polygon } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberFiles } from "../../src"

test("groups multiple stiffeners by attachment face and material", () => {
  const stiffeners: PcbStiffener[] = [
    rectangle,
    { ...rectangle, pcb_stiffener_id: "second", center: { x: 10, y: -7 } },
    polygon,
    { ...rectangle, pcb_stiffener_id: "top-pi", layer: "top" },
    { ...rectangle, pcb_stiffener_id: "bottom-fr4", material: "fr4" },
    { ...polygon, pcb_stiffener_id: "steel", material: "stainless_steel" },
    { ...polygon, pcb_stiffener_id: "aluminum", material: "aluminum" },
  ]
  const files = convertCircuitJsonToGerberFiles([board, ...stiffeners])

  expect(
    Object.keys(files).filter((name) => name.includes("Stiffener")),
  ).toEqual([
    "B_Stiffener_polyimide.gbr",
    "F_Stiffener_fr4.gbr",
    "F_Stiffener_polyimide.gbr",
    "B_Stiffener_fr4.gbr",
    "F_Stiffener_stainless_steel.gbr",
    "F_Stiffener_aluminum.gbr",
  ])
  expect(files["B_Stiffener_polyimide.gbr"].match(/D02\*/g)).toHaveLength(2)
  expect(files["B_Stiffener_polyimide.gbr"].match(/D01\*/g)).toHaveLength(8)
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    "%TF.FileFunction,Other,Stiffener,Top*%",
  )
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    "G04 Stiffener thickness: 0.4 mm; adhesive thickness: 0.05 mm*",
  )
})

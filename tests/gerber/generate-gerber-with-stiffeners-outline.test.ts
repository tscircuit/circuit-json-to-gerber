import { expect, test } from "bun:test"
import { board, rectangle } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberFiles } from "../../src"

test("exports the issue's bottom polyimide stiffener as a closed outline file", () => {
  const files = convertCircuitJsonToGerberFiles([board, rectangle])
  const stiffenerFile = files["B_Stiffener_polyimide.gbr"]

  expect(stiffenerFile).toContain("%TF.FileFunction,Other,Stiffener,Bot*%")
  expect(stiffenerFile).toContain("%TF.FilePolarity,Positive*%")
  expect(stiffenerFile).toContain("G04 Stiffener material: polyimide*")
  expect(stiffenerFile).toContain("G04 Stiffener thickness: 0.2 mm*")
  expect(stiffenerFile).toContain("%ADD10C,0.050000*%")
  expect(stiffenerFile).toContain(
    [
      "X-01000000Y-06000000D02*",
      "X001000000Y-06000000D01*",
      "X001000000Y-08000000D01*",
      "X-01000000Y-08000000D01*",
      "X-01000000Y-06000000D01*",
    ].join("\n"),
  )
  expect(stiffenerFile.endsWith("M02*")).toBe(true)
})

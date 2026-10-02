import { expect, test } from "bun:test"
import { board, polygon } from "../fixtures/pcb-stiffeners"
import { convertCircuitJsonToGerberFiles } from "../../src"

test("closes polygon outlines and flips their resolved board coordinates", () => {
  const files = convertCircuitJsonToGerberFiles([board, polygon], {
    flip_y_axis: true,
  })
  expect(files["F_Stiffener_fr4.gbr"]).toContain(
    [
      "X005000000Y-04000000D02*",
      "X008000000Y-04000000D01*",
      "X008000000Y-06000000D01*",
      "X006000000Y-07000000D01*",
      "X005000000Y-06000000D01*",
      "X005000000Y-04000000D01*",
    ].join("\n"),
  )
})

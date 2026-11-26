import { test, expect } from "bun:test"
import { gerberBuilder } from "src/gerber/gerber-builder"
import { stringifyGerberCommands } from "src/gerber/stringify-gerber"

test("define_aperture emits an AD aperture definition statement", () => {
  const commands = gerberBuilder()
    .add("define_aperture", { aperture_code: "D11C,0.150000" })
    .build()

  expect(stringifyGerberCommands(commands)).toBe("%ADD11C,0.150000*%")
})

test("aperture_block emits AB open and close statements", () => {
  const commands = gerberBuilder()
    .add("aperture_block", { block: "D10" })
    .add("aperture_block", { block: "" })
    .build()

  expect(stringifyGerberCommands(commands)).toBe("%ABD10*%\n%AB*%")
})

test("aperture commands do not leave blank lines in the output", () => {
  const commands = gerberBuilder()
    .add("define_aperture", { aperture_code: "D12R,1.0X0.5" })
    .add("aperture_block", { block: "D13" })
    .add("end_of_file", {})
    .build()

  const text = stringifyGerberCommands(commands)
  expect(text.split("\n").every((line) => line.length > 0)).toBe(true)
})

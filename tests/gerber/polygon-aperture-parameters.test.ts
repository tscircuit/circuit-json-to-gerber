import { expect, test } from "bun:test"
import gerberToSvg from "gerber-to-svg"
import { stringifyGerberCommand } from "../../src"

const polygon = (rotation?: number, hole_diameter?: number) =>
  stringifyGerberCommand({
    command_code: "ADD",
    aperture_number: 17,
    standard_template_code: "P",
    outer_diameter: 4,
    number_of_vertices: 6,
    rotation,
    hole_diameter,
  })

test.each([
  [undefined, undefined, "%ADD17P,4X6*%"],
  [0, undefined, "%ADD17P,4X6X0*%"],
  [30, undefined, "%ADD17P,4X6X30*%"],
  [-15.5, undefined, "%ADD17P,4X6X-15.5*%"],
  [undefined, 1, "%ADD17P,4X6X0X1.000000*%"],
  [0, 1, "%ADD17P,4X6X0X1.000000*%"],
  [30, 1, "%ADD17P,4X6X30X1.000000*%"],
] as const)(
  "serializes polygon rotation %s and hole %s",
  (rotation, hole, expected) => {
    expect(polygon(rotation, hole)).toBe(expected)
  },
)

const render = (aperture: string) =>
  new Promise<string>((resolve, reject) => {
    const gerber = `%FSLAX36Y36*%\n%MOMM*%\n${aperture}\nD17*\nX0Y0D03*\nM02*`
    gerberToSvg(gerber, { id: "polygon" }, (error, svg) => {
      if (error) reject(error)
      else resolve(svg)
    })
  })

test("renders a rotated polygon with a round hole like the specified aperture", async () => {
  const expected = await render("%ADD17P,4X6X30X1.000000*%")
  expect(await render(polygon(30, 1))).toBe(expected)
})

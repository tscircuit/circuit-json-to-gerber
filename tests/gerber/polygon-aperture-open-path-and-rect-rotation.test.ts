import { expect, test } from "bun:test"
import type { AnyGerberCommand } from "../../src/gerber/any_gerber_command"
import { define_aperture_template } from "../../src/gerber/commands/define_aperture_template"
import {
  getRotatedRectPoints,
  isGeometryChangingRectRotation,
} from "../../src/gerber/convert-soup-to-gerber-commands/getRotatedRectPoints"
import { renderOpenPath } from "../../src/gerber/convert-soup-to-gerber-commands/renderOpenPath"

test("define_aperture_template formats polygon (P) and macro apertures without double or trailing X delimiters or -0.000000", () => {
  expect(
    define_aperture_template.stringify({
      command_code: "ADD",
      aperture_number: 10,
      standard_template_code: "P",
      outer_diameter: 1.5,
      number_of_vertices: 6,
    }),
  ).toBe("%ADD10P,1.5X6*%")

  expect(
    define_aperture_template.stringify({
      command_code: "ADD",
      aperture_number: 11,
      standard_template_code: "P",
      outer_diameter: 2,
      number_of_vertices: 8,
      rotation: 45,
    }),
  ).toBe("%ADD11P,2X8X45*%")

  expect(
    define_aperture_template.stringify({
      command_code: "ADD",
      aperture_number: 12,
      standard_template_code: "P",
      outer_diameter: 2,
      number_of_vertices: 6,
      hole_diameter: 0.5,
    }),
  ).toBe("%ADD12P,2X6X0X0.500000*%")

  expect(
    define_aperture_template.stringify({
      command_code: "ADD",
      aperture_number: 13,
      macro_name: "ROTATEDPILL",
      diameter: 1.2,
      offset_x: -0,
      offset_y: 0.5,
    }),
  ).toBe("%ADD13ROTATEDPILL,1.200000X0.000000X0.500000*%")
})

test("renderOpenPath skips degenerate routes, deduplicates consecutive points, and guards non-finite dashed stroke_width", () => {
  const apertureConfig = {
    standard_template_code: "C" as const,
    diameter: 0.15,
  }
  const baseLayer: AnyGerberCommand[] = [
    {
      command_code: "ADD",
      aperture_number: 10,
      ...apertureConfig,
    },
  ]

  const degenerateLayer = [...baseLayer]
  renderOpenPath({
    element: { type: "pcb_silkscreen_path", stroke_width: 0.15 },
    glayer: degenerateLayer,
    apertureConfig,
    route: [
      { x: 1, y: 2 },
      { x: 1, y: 2 },
      { x: Number.NaN, y: 3 },
    ],
    mapY: (y) => y,
  })
  expect(degenerateLayer).toHaveLength(1)

  const dashedLayer = [...baseLayer]
  renderOpenPath({
    element: {
      type: "pcb_silkscreen_path",
      is_stroke_dashed: true,
      stroke_width: Number.NaN,
    },
    glayer: dashedLayer,
    apertureConfig,
    route: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    mapY: (y) => y,
  })
  const plots = dashedLayer.filter((cmd) => cmd.command_code === "D01")
  expect(plots.length).toBeGreaterThan(0)
  for (const plot of plots) {
    if ("x" in plot && "y" in plot) {
      expect(Number.isFinite(plot.x)).toBe(true)
      expect(Number.isFinite(plot.y)).toBe(true)
    }
  }
})

test("getRotatedRectPoints and isGeometryChangingRectRotation handle non-finite rotations without NaN or -0", () => {
  expect(
    isGeometryChangingRectRotation({
      width: 2,
      height: 1,
      ccwRotationDegrees: Number.NaN,
    }),
  ).toBe(false)

  const points = getRotatedRectPoints({
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
    ccwRotationDegrees: Number.NaN,
  })
  expect(points).toEqual([
    { x: -1, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ])

  const rotated90 = getRotatedRectPoints({
    center: { x: 0, y: 0 },
    width: 2,
    height: 0,
    ccwRotationDegrees: 90,
  })
  for (const pt of rotated90) {
    expect(Object.is(pt.x, -0)).toBe(false)
    expect(Object.is(pt.y, -0)).toBe(false)
  }
})

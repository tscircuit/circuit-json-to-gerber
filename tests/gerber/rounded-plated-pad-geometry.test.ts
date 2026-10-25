import { expect, test } from "bun:test"
import { applyToPoint, compose, rotateDEG, scale } from "transformation-matrix"
import type { PCBPlatedHole, AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"
import {
  getApertureConfigFromPcbPlatedHole,
  getApertureConfigFromPcbPlatedHoleSoldermask,
} from "src/gerber/convert-soup-to-gerber-commands/defineAperturesForLayer"

const pad: Extract<PCBPlatedHole, { shape: "circular_hole_with_rect_pad" }> = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "pad",
  shape: "circular_hole_with_rect_pad",
  pad_shape: "rect",
  hole_shape: "circle",
  x: 0,
  y: 0,
  hole_diameter: 0.6,
  rect_pad_width: 2.5,
  rect_pad_height: 1.8,
  rect_border_radius: 0.15,
  hole_offset_x: 0,
  hole_offset_y: 0,
  layers: ["top", "bottom"],
}

for (const ccwRotationDegrees of [0, 30, 90, 270]) {
  for (const flipYAxis of [false, true]) {
    test(`rounded plated pad rotation ${ccwRotationDegrees}, flip=${flipYAxis}`, () => {
      const rotatedPad = { ...pad, rect_ccw_rotation: ccwRotationDegrees }
      let yScale = 1
      if (flipYAxis) yScale = -1
      const transform = compose(scale(1, yScale), rotateDEG(ccwRotationDegrees))
      const x = pad.rect_pad_width / 2 - 0.15
      const y = pad.rect_pad_height / 2 - 0.15
      const expectedCorners = [
        { x: -x, y },
        { x, y },
        { x, y: -y },
        { x: -x, y: -y },
      ].map((point) => applyToPoint(transform, point))
      for (const { getConfig, margin, expectedRadius } of [
        {
          getConfig: getApertureConfigFromPcbPlatedHole,
          margin: 0,
          expectedRadius: 0.15,
        },
        {
          getConfig: getApertureConfigFromPcbPlatedHoleSoldermask,
          margin: 0.1,
          expectedRadius: 0.25,
        },
        {
          getConfig: getApertureConfigFromPcbPlatedHoleSoldermask,
          margin: -0.05,
          expectedRadius: 0.1,
        },
      ]) {
        const config = getConfig(
          { ...rotatedPad, soldermask_margin: margin },
          flipYAxis,
        )
        if (!("macro_name" in config) || config.macro_name !== "ROUNDRECT") {
          throw new Error("Expected a rounded rectangle aperture")
        }
        expect(config.corner_radius).toBeCloseTo(expectedRadius, 10)
        const actualCorners = [
          { x: config.corner_1_x, y: config.corner_1_y },
          { x: config.corner_2_x, y: config.corner_2_y },
          { x: config.corner_3_x, y: config.corner_3_y },
          { x: config.corner_4_x, y: config.corner_4_y },
        ]
        for (const expectedCorner of expectedCorners) {
          const nearest = actualCorners.reduce((closest, point) => {
            if (
              Math.hypot(
                point.x - expectedCorner.x,
                point.y - expectedCorner.y,
              ) <
              Math.hypot(
                closest.x - expectedCorner.x,
                closest.y - expectedCorner.y,
              )
            )
              return point
            return closest
          })
          expect(nearest.x).toBeCloseTo(expectedCorner.x, 10)
          expect(nearest.y).toBeCloseTo(expectedCorner.y, 10)
        }
      }
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_board",
          pcb_board_id: "board",
          center: { x: 0, y: 0 },
          width: 8,
          height: 8,
          num_layers: 2,
          thickness: 1.6,
          material: "fr4",
        },
        rotatedPad,
      ]
      const files = convertCircuitJsonToGerberFiles(circuitJson, {
        flip_y_axis: flipYAxis,
      })
      for (const name of ["F_Cu", "B_Cu", "F_Mask", "B_Mask"]) {
        expect(files[`${name}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
        expect(files[`${name}.gbr`]).not.toContain("%LR")
        expect(files[`${name}.gbr`].match(/D03\*/g)).toHaveLength(1)
      }
    })
  }
}

test.each([undefined, 0, -0.1])(
  "radius %s retains a rectangular aperture",
  (radius) => {
    expect(
      getApertureConfigFromPcbPlatedHole({
        ...pad,
        rect_border_radius: radius,
      }),
    ).toEqual({
      standard_template_code: "R",
      x_size: 2.5,
      y_size: 1.8,
    })
  },
)

test("oversized radius is clamped to half the shorter pad dimension", () => {
  expect(
    getApertureConfigFromPcbPlatedHole({ ...pad, rect_border_radius: 10 }),
  ).toMatchObject({ macro_name: "ROUNDRECT", corner_radius: 0.9 })
})

test("negative mask margin can remove rounded corners while copper remains rounded", () => {
  const contractedPad = {
    ...pad,
    rect_ccw_rotation: 30,
    soldermask_margin: -0.2,
  }
  expect(getApertureConfigFromPcbPlatedHoleSoldermask(contractedPad)).toEqual({
    standard_template_code: "R",
    x_size: 2.1,
    y_size: 1.4,
  })
  const files = convertCircuitJsonToGerberFiles([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 8,
      height: 8,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    contractedPad,
  ])
  expect(files["F_Cu.gbr"]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
  expect(files["F_Mask.gbr"]).toContain("G36*")
})

test("rounded plated pads are preserved on all four copper layers", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 8,
      height: 8,
      num_layers: 4,
      thickness: 1.6,
      material: "fr4",
    },
    { ...pad, layers: ["top", "inner1", "inner2", "bottom"] },
  ]
  const files = convertCircuitJsonToGerberFiles(circuitJson)
  for (const name of ["F_Cu", "In1_Cu", "In2_Cu", "B_Cu"]) {
    expect(files[`${name}.gbr`]).toMatch(/%ADD\d+ROUNDRECT,0\.150000X/)
  }
})

for (const slotShape of [
  { shape: "pill_hole_with_rect_pad", hole_shape: "pill" },
  {
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    hole_ccw_rotation: 45,
    rect_ccw_rotation: 30,
  },
] as const) {
  test(`rounded copper is preserved for ${slotShape.shape}`, () => {
    const slotPad: PCBPlatedHole = {
      ...slotShape,
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "slot",
      x: 0,
      y: 0,
      pad_shape: "rect",
      layers: ["top", "bottom"],
      hole_width: 1,
      hole_height: 0.6,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_pad_width: 2.5,
      rect_pad_height: 1.8,
      rect_border_radius: 0.15,
    }
    expect(getApertureConfigFromPcbPlatedHole(slotPad)).toMatchObject({
      macro_name: "ROUNDRECT",
      corner_radius: 0.15,
    })
    expect(getApertureConfigFromPcbPlatedHoleSoldermask(slotPad)).toMatchObject(
      { macro_name: "ROUNDRECT", corner_radius: 0.15 },
    )
  })
}

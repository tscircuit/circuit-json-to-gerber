import { expect, test } from "bun:test"
import type { AnyGerberCommand } from "../../src/gerber/any_gerber_command"
import { renderOpenPath } from "../../src/gerber/convert-soup-to-gerber-commands/renderOpenPath"

type Point = { x: number; y: number }

const getDrawnSegments = (
  route: Point[],
  options: { dashed?: boolean; flipY?: boolean } = {},
) => {
  const commands: AnyGerberCommand[] = [
    {
      command_code: "ADD",
      aperture_number: 10,
      standard_template_code: "C",
      diameter: 0.0625,
    },
  ]
  renderOpenPath({
    element: {
      type: "pcb_fabrication_note_path",
      stroke_width: 0.0625,
      is_stroke_dashed: options.dashed ?? true,
    },
    glayer: commands,
    apertureConfig: { standard_template_code: "C", diameter: 0.0625 },
    route,
    mapY: (y) => (options.flipY ? -y : y),
  })

  const segments: Array<[Point, Point]> = []
  let current = { x: 0, y: 0 }
  for (const command of commands) {
    if (command.command_code === "D01") {
      segments.push([current, { x: command.x, y: command.y }])
    }
    if (command.command_code === "D01" || command.command_code === "D02") {
      current = { x: command.x, y: command.y }
    }
  }
  return segments
}

test("subdividing a dashed line preserves its gaps", () => {
  const route = Array.from({ length: 9 }, (_, index) => ({
    x: index / 8,
    y: 0,
  }))
  expect(getDrawnSegments(route)).toEqual([
    [
      { x: 0, y: 0 },
      { x: 0.125, y: 0 },
    ],
    [
      { x: 0.125, y: 0 },
      { x: 0.25, y: 0 },
    ],
    [
      { x: 0.5, y: 0 },
      { x: 0.625, y: 0 },
    ],
    [
      { x: 0.625, y: 0 },
      { x: 0.75, y: 0 },
    ],
  ])
})

test("a dash continues around a corner before the next gap", () => {
  expect(
    getDrawnSegments([
      { x: 0, y: 0 },
      { x: 0.125, y: 0 },
      { x: 0.125, y: 0.875 },
    ]),
  ).toEqual([
    [
      { x: 0, y: 0 },
      { x: 0.125, y: 0 },
    ],
    [
      { x: 0.125, y: 0 },
      { x: 0.125, y: 0.125 },
    ],
    [
      { x: 0.125, y: 0.375 },
      { x: 0.125, y: 0.625 },
    ],
  ])
})

test("duplicate vertices preserve a gap across a corner when Y is flipped", () => {
  expect(
    getDrawnSegments(
      [
        { x: 0, y: 0 },
        { x: 0.375, y: 0 },
        { x: 0.375, y: 0 },
        { x: 0.375, y: 0.625 },
      ],
      { flipY: true },
    ),
  ).toEqual([
    [
      { x: 0, y: -0 },
      { x: 0.25, y: -0 },
    ],
    [
      { x: 0.375, y: -0.125 },
      { x: 0.375, y: -0.375 },
    ],
  ])
})

test("a single segment keeps its existing dash pattern", () => {
  expect(
    getDrawnSegments([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]),
  ).toEqual([
    [
      { x: 0, y: 0 },
      { x: 0.25, y: 0 },
    ],
    [
      { x: 0.5, y: 0 },
      { x: 0.75, y: 0 },
    ],
  ])
})

test("solid paths still connect every vertex", () => {
  expect(
    getDrawnSegments(
      [
        { x: 0, y: 0 },
        { x: 0.125, y: 0 },
        { x: 0.125, y: 0.25 },
      ],
      { dashed: false },
    ),
  ).toEqual([
    [
      { x: 0, y: 0 },
      { x: 0.125, y: 0 },
    ],
    [
      { x: 0.125, y: 0 },
      { x: 0.125, y: 0.25 },
    ],
  ])
})

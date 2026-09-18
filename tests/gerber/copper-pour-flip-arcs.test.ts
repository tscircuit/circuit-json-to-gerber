import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import gerberToSvg from "gerber-to-svg"
import {
  convertSoupToGerberCommands,
  stringifyGerberCommandLayers,
} from "../../src"

type Vertex = { x: number; y: number; bulge?: number }
const reflect = (vertices: Vertex[]): Vertex[] =>
  vertices.map(({ x, y, bulge }) => ({
    x,
    y: -y,
    bulge: bulge === undefined ? undefined : -bulge,
  }))

const render = (gerber: string) =>
  new Promise<string>((resolve, reject) => {
    gerberToSvg(gerber, { id: "pour" }, (error, svg) => {
      if (error) reject(error)
      else resolve(svg)
    })
  })

for (const layer of ["top", "bottom"] as const) {
  for (const ringKind of ["outer", "inner"] as const) {
    for (const bulge of [-2, -0.5, 0.5, 2]) {
      test(`${layer} ${ringKind} bulge ${bulge} is reflected without changing the arc`, async () => {
        const curved = [
          { x: 2, y: 3, bulge },
          { x: 6, y: 3 },
          { x: 6, y: 8 },
          { x: 2, y: 8 },
        ]
        const outer =
          ringKind === "outer"
            ? curved
            : [
                { x: -10, y: -10 },
                { x: -10, y: 20 },
                { x: 20, y: 20 },
                { x: 20, y: -10 },
              ]
        const inner = ringKind === "inner" ? [curved] : []
        const makePour = (mirror: boolean): PcbCopperPour => ({
          type: "pcb_copper_pour",
          pcb_copper_pour_id: "pour",
          source_net_id: "net",
          layer,
          shape: "brep",
          covered_with_solder_mask: true,
          brep_shape: {
            outer_ring: { vertices: mirror ? reflect(outer) : outer },
            inner_rings: inner.map((vertices) => ({
              vertices: mirror ? reflect(vertices) : vertices,
            })),
          },
        })
        const board: AnyCircuitElement = {
          type: "pcb_board",
          pcb_board_id: "board",
          center: { x: 0, y: 0 },
          width: 80,
          height: 80,
          num_layers: 2,
          thickness: 1.6,
          material: "fr4",
        }
        const input = [board, makePour(false)]
        const original = structuredClone(input)
        const actual = convertSoupToGerberCommands(input, { flip_y_axis: true })
        const expected = convertSoupToGerberCommands([board, makePour(true)], {
          flip_y_axis: false,
        })
        const key = layer === "top" ? "F_Cu" : "B_Cu"
        const arcs = actual[key].filter(
          (c) => c.command_code === "D01" && c.i !== undefined,
        )
        const expectedArcs = expected[key].filter(
          (c) => c.command_code === "D01" && c.i !== undefined,
        )
        expect(arcs).toHaveLength(1)
        expect(expectedArcs).toHaveLength(1)
        for (let i = 0; i < arcs.length; i++) {
          const a = arcs[i],
            e = expectedArcs[i]
          if (a.command_code !== "D01" || e.command_code !== "D01")
            throw new Error("Expected arc")
          expect(a.x).toBeCloseTo(e.x, 8)
          expect(a.y).toBeCloseTo(e.y, 8)
          expect(a.i!).toBeCloseTo(e.i!, 8)
          expect(a.j!).toBeCloseTo(e.j!, 8)
        }
        expect(await render(stringifyGerberCommandLayers(actual)[key])).toBe(
          await render(stringifyGerberCommandLayers(expected)[key]),
        )
        expect(input).toEqual(original)
      })
    }
  }
}

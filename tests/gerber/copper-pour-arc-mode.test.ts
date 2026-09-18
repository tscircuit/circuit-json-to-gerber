import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import gerberToSvg from "gerber-to-svg"
import { convertSoupToGerberCommands, stringifyGerberCommands } from "../../src"

const render = (gerber: string) =>
  new Promise<string>((resolve, reject) => {
    gerberToSvg(gerber, { id: "mode" }, (error, svg) => {
      if (error) reject(error)
      else resolve(svg)
    })
  })

for (const layer of ["top", "bottom"] as const) {
  for (const ring of ["outer", "inner"] as const) {
    for (const following of ["trace", "rect", "polygon"] as const) {
      test(`${layer} ${following} stays linear after a circular ${ring} pour ring`, async () => {
        const circle = {
          vertices: [
            { x: -8, y: 0, bulge: 1 },
            { x: -4, y: 0, bulge: 1 },
          ],
        }
        const pour: PcbCopperPour = {
          type: "pcb_copper_pour",
          pcb_copper_pour_id: "curved",
          source_net_id: "net",
          layer,
          shape: "brep",
          covered_with_solder_mask: false,
          brep_shape: {
            outer_ring:
              ring === "outer"
                ? circle
                : {
                    vertices: [
                      { x: -10, y: -5 },
                      { x: -10, y: 5 },
                      { x: -2, y: 5 },
                      { x: -2, y: -5 },
                    ],
                  },
            inner_rings: ring === "inner" ? [circle] : [],
          },
        }
        const next: AnyCircuitElement =
          following === "trace"
            ? {
                type: "pcb_trace",
                pcb_trace_id: "trace",
                route: [
                  { route_type: "wire", x: 4, y: 1, layer, width: 0.3 },
                  { route_type: "wire", x: 8, y: 1, layer, width: 0.3 },
                ],
              }
            : ({
                type: "pcb_copper_pour",
                pcb_copper_pour_id: "straight",
                source_net_id: "net",
                layer,
                covered_with_solder_mask: false,
                ...(following === "rect"
                  ? {
                      shape: "rect",
                      center: { x: 6, y: 1 },
                      width: 4,
                      height: 2,
                      rotation: 0,
                    }
                  : {
                      shape: "polygon",
                      points: [
                        { x: 4, y: 0 },
                        { x: 8, y: 0 },
                        { x: 6, y: 3 },
                      ],
                    }),
              } as AnyCircuitElement)
        const layers = convertSoupToGerberCommands([
          {
            type: "pcb_board",
            pcb_board_id: "board",
            center: { x: 0, y: 0 },
            width: 30,
            height: 20,
            num_layers: 2,
            thickness: 1.6,
            material: "fr4",
          },
          pour,
          next,
        ])
        const keys =
          following === "trace"
            ? ([layer === "top" ? "F_Cu" : "B_Cu"] as const)
            : layer === "top"
              ? (["F_Cu", "F_Mask"] as const)
              : (["B_Cu", "B_Mask"] as const)
        for (const key of keys) {
          const commands = layers[key]
          let mode = "G01"
          let arcs = 0
          let linesAfterArc = 0
          for (const command of commands) {
            if (["G01", "G02", "G03"].includes(command.command_code))
              mode = command.command_code
            if (command.command_code !== "D01") continue
            if (command.i !== undefined || command.j !== undefined) {
              arcs++
              expect(mode).not.toBe("G01")
            } else if (arcs > 0) {
              linesAfterArc++
              expect(mode).toBe("G01")
            }
          }
          expect(arcs).toBe(2)
          expect(linesAfterArc).toBeGreaterThan(0)
          const explicit = commands.flatMap((command) =>
            command.command_code === "D01" &&
            command.i === undefined &&
            command.j === undefined
              ? [{ command_code: "G01" as const }, command]
              : [command],
          )
          expect(await render(stringifyGerberCommands(commands))).toBe(
            await render(stringifyGerberCommands(explicit)),
          )
        }
      })
    }
  }
}

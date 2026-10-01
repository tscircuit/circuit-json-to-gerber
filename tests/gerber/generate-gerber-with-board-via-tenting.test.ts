import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { convertCircuitJsonToExcellonDrillCommandLayers } from "src/excellon-drill"

const board: PcbBoard = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 12,
  height: 8,
  thickness: 1.6,
  num_layers: 4,
  material: "fr4",
}
const via: PcbVia = {
  type: "pcb_via",
  pcb_via_id: "via",
  x: 2,
  y: 0,
  outer_diameter: 1.2,
  hole_diameter: 0.5,
  layers: ["top", "bottom"],
}

// The same route transition may also be described by a standalone via.
const trace = {
  type: "pcb_trace" as const,
  pcb_trace_id: "trace",
  route: [
    {
      route_type: "via" as const,
      x: 2,
      y: 0,
      from_layer: "top" as const,
      to_layer: "bottom" as const,
      outer_diameter: 1.2,
      hole_diameter: 0.5,
    },
  ],
}

test("board defaults and per-side overrides control via mask, never copper or drills", () => {
  for (const routeOnly of [false, true]) {
    for (const top of [false, true]) {
      for (const bottom of [false, true]) {
        for (const override of [undefined, false, true]) {
          const circuit: AnyCircuitElement[] = [
            {
              ...board,
              default_via_tented_on_top: top,
              default_via_tented_on_bottom: bottom,
            },
            routeOnly
              ? {
                  ...trace,
                  route: [{ ...trace.route[0], tented_on_top: override }],
                }
              : { ...via, tented_on_top: override },
          ]
          const output = stringifyGerberCommandLayers(
            convertSoupToGerberCommands(circuit),
          )
          const flash = "X002000000Y000000000D03*"
          expect(output.F_Mask.includes(flash)).toBe(!(override ?? top))
          expect(output.B_Mask.includes(flash)).toBe(!bottom)
          expect(output.F_Cu).toContain(flash)
          expect(output.B_Cu).toContain(flash)
          const drills = convertCircuitJsonToExcellonDrillCommandLayers({
            circuitJson: circuit,
          })
          const bareCircuit = circuit.map((element) =>
            element.type === "pcb_board"
              ? {
                  ...element,
                  default_via_tented_on_top: false,
                  default_via_tented_on_bottom: false,
                }
              : element,
          )
          const bareDrills = convertCircuitJsonToExcellonDrillCommandLayers({
            circuitJson: bareCircuit,
          })
          expect(Object.keys(drills)).toEqual(Object.keys(bareDrills))
          for (const file of Object.keys(drills)) {
            const withoutDates = (commands: (typeof drills)[string]) =>
              commands.filter(
                (command) =>
                  command.command_code !== "header_comment" &&
                  !(
                    command.command_code === "header_attribute" &&
                    command.attribute_name === "TF.CreationDate"
                  ),
              )
            expect(withoutDates(drills[file]!)).toEqual(
              withoutDates(bareDrills[file]!),
            )
          }
        }
      }
    }
  }
})

test("standalone via overrides win over duplicate route transitions and board defaults", () => {
  const circuit: AnyCircuitElement[] = [
    {
      ...board,
      default_via_tented_on_top: false,
      default_via_tented_on_bottom: false,
    },
    trace,
    { ...via, tented_on_top: true, ...{ is_tented: true } },
  ]
  const output = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuit),
  )
  const flash = "X002000000Y000000000D03*"
  expect(output.F_Mask).not.toContain(flash)
  expect(output.B_Mask).not.toContain(flash)
})

test("panel vias inherit their owning board settings", () => {
  const circuit: AnyCircuitElement[] = [
    {
      ...board,
      pcb_board_id: "board-a",
      subcircuit_id: "a",
      default_via_tented_on_top: true,
      default_via_tented_on_bottom: false,
    },
    {
      ...board,
      pcb_board_id: "board-b",
      subcircuit_id: "b",
      default_via_tented_on_top: false,
      default_via_tented_on_bottom: true,
    },
    { ...via, subcircuit_id: "b" },
    { ...trace, subcircuit_id: "a", route: [{ ...trace.route[0], x: -2 }] },
  ]
  const output = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuit),
  )
  expect(output.F_Mask).toContain("X002000000Y000000000D03*")
  expect(output.B_Mask).not.toContain("X002000000Y000000000D03*")
  expect(output.F_Mask).not.toContain("X-02000000Y000000000D03*")
  expect(output.B_Mask).toContain("X-02000000Y000000000D03*")
})

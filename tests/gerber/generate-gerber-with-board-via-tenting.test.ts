import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"

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

test("snapshot exported mask openings and retained drills for inherited and overridden route vias", async () => {
  const circuit: AnyCircuitElement[] = [
    {
      ...board,
      center: { x: 0, y: 0 },
      width: 96,
      height: 56,
      default_via_tented_on_top: true,
      default_via_tented_on_bottom: false,
    },
  ]
  const label = (text: string, x: number, y: number, font_size = 1) => {
    circuit.push({
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `label_${x}_${y}`,
      pcb_component_id: "labels",
      text,
      layer: "top",
      anchor_position: { x, y },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size,
    })
  }
  label(
    "default_via_tented_on_top = true / default_via_tented_on_bottom = false",
    0,
    25,
    1.3,
  )
  for (const [column, flags] of [
    {},
    { tented_on_top: false, tented_on_bottom: false },
    { tented_on_top: false, tented_on_bottom: true },
    { tented_on_top: true, tented_on_bottom: true },
  ].entries()) {
    const x = -36 + column * 24
    label(`tented_on_top = ${flags.tented_on_top ?? "unset"}`, x, 19)
    label(`tented_on_bottom = ${flags.tented_on_bottom ?? "unset"}`, x, 16)
    circuit.push(
      {
        ...via,
        pcb_via_id: `via_${column}`,
        x,
        y: 4,
        hole_diameter: 2,
        outer_diameter: 4,
        ...flags,
      },
      {
        ...trace,
        pcb_trace_id: `trace_${column}`,
        route: [
          {
            ...trace.route[0],
            x,
            y: -16,
            hole_diameter: 2,
            outer_diameter: 4,
            ...flags,
          },
        ],
      },
    )
  }
  label("pcb_via", 0, 11, 1.8)
  label("pcb_trace.route via", 0, -8, 1.8)
  const output = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuit),
  )
  const drills = convertCircuitJsonToExcellonDrillCommandLayers({
    circuitJson: circuit,
  })
  for (const [name, commands] of Object.entries(drills)) {
    output[name] = stringifyExcellonDrill(commands)
  }
  for (const side of ["F", "B"] as const) {
    // These are exported layer overlays, not a simulation of the masked surface.
    // Gold is an actual soldermask opening; green locates copper beneath tenting.
    await expect(output).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `board-via-tenting-${side === "F" ? "top" : "bottom"}-mask`,
      [`${side}_Cu`, `${side}_Mask`, "F_SilkScreen"],
      {
        backgroundColor: "#16382d",
        colors: {
          [`${side}_Cu`]: "#38644d",
          [`${side}_Mask`]: "#e5b65c",
          F_SilkScreen: "#ffffff",
        },
      },
    )
  }
  await expect(output).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "board-via-tenting-drills",
    ["F_Cu", ...Object.keys(drills), "F_SilkScreen"],
    {
      backgroundColor: "#16382d",
      colors: {
        F_Cu: "#38644d",
        F_SilkScreen: "#ffffff",
        ...Object.fromEntries(
          Object.keys(drills).map((name) => [name, "#ffffff"]),
        ),
      },
    },
  )
})

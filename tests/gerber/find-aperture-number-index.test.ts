import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { AnyGerberCommand } from "src/gerber/any_gerber_command"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { findApertureNumber } from "src/gerber/convert-soup-to-gerber-commands/findApertureNumber"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

/** The pre-index implementation: rescans the whole layer on every call. */
const findApertureNumberRescan = (
  glayer: AnyGerberCommand[],
  search_params: Record<string, unknown>,
  apertureFunction = "Conductor",
): number | undefined => {
  const isCopper = glayer.some(
    (c: any) =>
      c.command_code === "TF" &&
      c.attribute_name === "FileFunction" &&
      c.attribute_value?.startsWith("Copper,"),
  )
  let currentFunction: string | undefined
  const candidates = glayer.filter((c: any) => {
    if (c.command_code === "TA" && c.attribute_name === ".AperFunction")
      currentFunction = c.attribute_value
    if (
      c.command_code === "TD" &&
      (!c.attribute || c.attribute === ".AperFunction")
    )
      currentFunction = undefined
    return (
      c.command_code === "ADD" &&
      (!isCopper || currentFunction === apertureFunction)
    )
  })
  const found: any =
    "trace_width" in search_params
      ? candidates.find(
          (c: any) =>
            c.standard_template_code === "C" &&
            c.diameter === search_params.trace_width,
        )
      : candidates.find((c: any) =>
          Object.keys(search_params).every((k) => c[k] === search_params[k]),
        )
  return found?.aperture_number
}

const tryFind = (
  layer: AnyGerberCommand[],
  params: Record<string, unknown>,
  fn?: string,
) => {
  try {
    return findApertureNumber(layer, params as any, fn as any)
  } catch {
    return undefined
  }
}

test("findApertureNumber returns what a full rescan returns after every appended command", () => {
  const layer: AnyGerberCommand[] = []
  const push = (c: Record<string, unknown>) => layer.push(c as any)
  const queries: Array<[Record<string, unknown>, string | undefined]> = [
    [{ trace_width: 0.2 }, undefined],
    [{ trace_width: 0.25 }, "Conductor"],
    [{ standard_template_code: "C", diameter: 0.6 }, "ViaPad"],
    [{ standard_template_code: "R", x_size: 1, y_size: 0.5 }, "SMDPad,CuDef"],
    [{ standard_template_code: "C", diameter: 0.6 }, "SMDPad,CuDef"],
  ]
  const steps: Array<Record<string, unknown>> = [
    {
      command_code: "TF",
      attribute_name: "FileFunction",
      attribute_value: "Copper,L1,Top",
    },
    {
      command_code: "TA",
      attribute_name: ".AperFunction",
      attribute_value: "Conductor",
    },
    {
      command_code: "ADD",
      aperture_number: 10,
      standard_template_code: "C",
      diameter: 0.2,
    },
    {
      command_code: "ADD",
      aperture_number: 11,
      standard_template_code: "C",
      diameter: 0.25,
    },
    { command_code: "TD", attribute: ".AperFunction" },
    {
      command_code: "TA",
      attribute_name: ".AperFunction",
      attribute_value: "ViaPad",
    },
    {
      command_code: "ADD",
      aperture_number: 12,
      standard_template_code: "C",
      diameter: 0.6,
    },
    { command_code: "TD" },
    {
      command_code: "TA",
      attribute_name: ".AperFunction",
      attribute_value: "SMDPad,CuDef",
    },
    {
      command_code: "ADD",
      aperture_number: 13,
      standard_template_code: "R",
      x_size: 1,
      y_size: 0.5,
    },
    {
      command_code: "ADD",
      aperture_number: 14,
      standard_template_code: "C",
      diameter: 0.6,
    },
    { command_code: "D", aperture_number: 10 },
    { command_code: "TD", attribute: "SomethingElse" },
    {
      command_code: "ADD",
      aperture_number: 15,
      standard_template_code: "C",
      diameter: 0.2,
    },
  ]
  for (const step of steps) {
    push(step)
    for (const [params, fn] of queries)
      expect(tryFind(layer, params, fn)).toBe(
        findApertureNumberRescan(layer, params, fn),
      )
  }
  // a non-copper layer ignores the aperture function
  const silk: AnyGerberCommand[] = [
    {
      command_code: "TF",
      attribute_name: "FileFunction",
      attribute_value: "Legend,Top",
    } as any,
    {
      command_code: "ADD",
      aperture_number: 10,
      standard_template_code: "C",
      diameter: 0.15,
    } as any,
  ]
  expect(tryFind(silk, { trace_width: 0.15 }, "ViaPad")).toBe(10)
  // a layer that shrank (never done by the converter) is rescanned
  layer.length = 3
  for (const [params, fn] of queries)
    expect(tryFind(layer, params, fn)).toBe(
      findApertureNumberRescan(layer, params, fn),
    )
})

test("Gerber generation is linear in the number of primitives on a layer", () => {
  // 20 000 trace segments in 20 widths on one copper layer: quadratic aperture lookup took ~minutes
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "b",
      center: { x: 0, y: 0 },
      width: 200,
      height: 200,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    } as any,
  ]
  for (let i = 0; i < 20000; i++) {
    const w = 0.1 + (i % 20) * 0.01
    const x = (i % 100) - 50
    const y = Math.floor(i / 100) * 0.5 - 50
    circuitJson.push({
      type: "pcb_trace",
      pcb_trace_id: `t${i}`,
      route: [
        { route_type: "wire", x, y, width: w, layer: "top" },
        { route_type: "wire", x: x + 0.4, y, width: w, layer: "top" },
      ],
    } as any)
  }
  const t0 = performance.now()
  const layers = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson, { flip_y_axis: false }),
  )
  const ms = performance.now() - t0
  expect(Object.keys(layers).length).toBeGreaterThan(0)
  expect(ms).toBeLessThan(15000)
}, 60000)

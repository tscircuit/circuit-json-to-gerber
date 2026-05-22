import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 12,
    height: 10,
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "polygon_plated_hole",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 0.9,
    pad_outline: [
      { x: -1.8, y: -1.2 },
      { x: 1.7, y: -1.2 },
      { x: 2.2, y: 0.3 },
      { x: 0.4, y: 1.8 },
      { x: -2, y: 0.7 },
    ],
    hole_offset_x: 0,
    hole_offset_y: 0,
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    is_covered_with_solder_mask: false,
  } as AnyCircuitElement,
] as AnyCircuitElement[]

test(
  "repro: plated holes with polygon pads render copper regions",
  async () => {
    const getGerberOutput = () =>
      stringifyGerberCommandLayers(convertSoupToGerberCommands(circuitJson))

    let gerberOutput: Record<string, string> | undefined
    let gerberError: string | undefined

    try {
      gerberOutput = getGerberOutput()
    } catch (error) {
      gerberError = error instanceof Error ? error.message : String(error)
    }

    if (gerberError) {
      await expect(circuitJson).toMatchCircuitJsonPcbAndMessageSnapshot(
        import.meta.path,
        "polygon-plated-hole-support-repro",
        ["Gerber generation currently throws:", gerberError],
        {
          messageLabel: "Current failure",
        },
      )
    }

    expect(getGerberOutput).not.toThrow()

    gerberOutput ??= getGerberOutput()
    const drillLayers = Object.fromEntries(
      Object.entries(
        convertSoupToExcellonDrillCommandLayers({
          circuitJson,
        }),
      ).map(([layerName, commands]) => [
        layerName,
        stringifyExcellonDrill(commands),
      ]),
    )

    expect(gerberOutput.F_Cu).toContain("G36*")
    expect(gerberOutput.F_Cu).toContain("G37*")
    expect(gerberOutput.B_Cu).toContain("G36*")
    expect(gerberOutput.B_Cu).toContain("G37*")
    expect(drillLayers["drill-L1-L2.drl"]).toContain("X0.0000Y0.0000")

    expect(gerberOutput.F_Cu).toContain("%ADD10C,0.001000*%")
    expect(gerberOutput.F_Cu).toContain("D10*")
    expect(gerberOutput.F_Cu).toContain("X-01800000Y-01200000D02*")
    expect(gerberOutput.F_Cu).toContain("X002200000Y000300000D01*")

    await expect({
      ...gerberOutput,
      ...drillLayers,
    }).toMatchCircuitJsonPcbAndGerberSnapshot(
      import.meta.path,
      "polygon-plated-hole-support-repro",
      circuitJson,
      ["F_Cu", "B_Cu"],
    )
  },
)

import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"
import { maybeOutputGerber } from "tests/fixtures/maybe-output-gerber"

const defaultLayers: Array<"top" | "bottom"> = ["top", "bottom"]

test("Generate gerber with hole_with_rect_pad offsets", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={40} height={30}>
      <platedhole
        shape="circular_hole_with_rect_pad"
        holeDiameter={1.2}
        rectPadWidth={3}
        rectPadHeight={2.2}
        holeOffsetX={0.4}
        holeOffsetY={-0.3}
        pcbX={-6}
        pcbY={4}
      />
      <platedhole
        shape="pill_hole_with_rect_pad"
        holeShape="pill"
        padShape="rect"
        holeWidth={2.5}
        holeHeight={1.1}
        rectPadWidth={4}
        rectPadHeight={2.5}
        holeOffsetX={-0.35}
        holeOffsetY={0.45}
        pcbX={5}
        pcbY={-3}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson() as any[]

  circuitJson.push({
    type: "pcb_plated_hole",
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    pad_shape: "rect",
    hole_width: 3,
    hole_height: 1.6,
    hole_ccw_rotation: 30,
    rect_pad_width: 4.6,
    rect_pad_height: 2.4,
    rect_ccw_rotation: 15,
    hole_offset_x: 0.5,
    hole_offset_y: -0.25,
    x: -1,
    y: -6,
    layers: defaultLayers,
    pcb_plated_hole_id: "rotated-pill-offset",
  })

  const gerber_cmds = convertSoupToGerberCommands(circuitJson as any)
  const excellon_drill_cmds = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: true,
  })
  const excellon_drill_cmds_unplated = convertSoupToExcellonDrillCommands({
    circuitJson: circuitJson as any,
    is_plated: false,
  })

  const excellonDrillOutput = stringifyExcellonDrill(excellon_drill_cmds)
  const excellonDrillOutputUnplated = stringifyExcellonDrill(
    excellon_drill_cmds_unplated,
  )
  const gerberOutput = stringifyGerberCommandLayers(gerber_cmds)

  await maybeOutputGerber(gerberOutput, excellonDrillOutput)

  expect({
    ...gerberOutput,
    "drill.drl": excellonDrillOutput,
    "drill_npth.drl": excellonDrillOutputUnplated,
  }).toMatchGerberSnapshot(import.meta.path, "hole-with-rect-pad-offsets")
})

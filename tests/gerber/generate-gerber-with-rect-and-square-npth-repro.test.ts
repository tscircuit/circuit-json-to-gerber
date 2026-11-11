import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import {
  convertSoupToExcellonDrillCommands,
  stringifyExcellonDrill,
} from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "rect_and_square_npth_board",
    center: { x: 0, y: 0 },
    width: 14,
    height: 8,
    material: "fr4",
    num_layers: 4,
    thickness: 1.6,
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "inner_ground_plane",
    layer: "inner1",
    shape: "rect",
    source_net_id: "ground",
    center: { x: 0, y: 0 },
    width: 14,
    height: 8,
    rotation: 0,
  } as PcbCopperPour,
  {
    type: "pcb_hole",
    pcb_hole_id: "round_npth_control",
    hole_shape: "circle",
    hole_diameter: 1,
    x: 0,
    y: 2,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "square_npth_hole",
    hole_shape: "square",
    hole_diameter: 1.4,
    x: -3.5,
    y: -0.5,
    soldermask_margin: 0.1,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "rect_npth_slot",
    hole_shape: "rect",
    hole_width: 1.2,
    hole_height: 2.4,
    x: 3.5,
    y: -0.5,
    soldermask_margin: 0.1,
    is_covered_with_solder_mask: false,
  },
]

test("rect and square NPTH holes are included in drill and Gerber openings", async () => {
  const gerberLayers = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(gerberLayers)
  const unplatedDrillCommands = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: false,
  })
  const unplatedDrillOutput = stringifyExcellonDrill(unplatedDrillCommands)

  expect(unplatedDrillOutput).toContain(
    "; #@! TF.FileFunction,NonPlated,1,4,NPTH",
  )

  const innerCopperClearPolarityCount = gerberLayers.In1_Cu.filter(
    (command) => command.command_code === "LP" && command.polarity === "C",
  ).length
  const frontMaskFlashCount = gerberLayers.F_Mask.filter(
    (command) => command.command_code === "D03",
  ).length

  expect(innerCopperClearPolarityCount).toBe(3)
  expect(frontMaskFlashCount).toBe(3)
  expect(gerberOutput.In1_Cu).toContain("%ADD11R,1.400000X1.400000*%")
  expect(gerberOutput.In1_Cu).toContain("%ADD12R,1.200000X2.400000*%")
  expect(gerberOutput.F_Mask).toContain("%ADD11R,1.600000X1.600000*%")
  expect(gerberOutput.F_Mask).toContain("%ADD12R,1.400000X2.600000*%")

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "rect-and-square-npth-gerber-openings-repro",
    circuitJson,
    ["In1_Cu", "F_Mask"],
    {
      circuitJsonLabel: "tscircuit Circuit JSON",
      gerberLabel: "Gerber inner copper + front mask",
    },
  )
})

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
    pcb_board_id: "usb_c_alignment_slot_board",
    center: { x: 0, y: 0 },
    width: 12,
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
    width: 12,
    height: 8,
    rotation: 0,
  } as PcbCopperPour,
  {
    type: "pcb_hole",
    pcb_hole_id: "round_npth_control",
    hole_shape: "circle",
    hole_diameter: 1,
    x: -2.5,
    y: 0,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "usb_c_oval_alignment_slot",
    hole_shape: "oval",
    hole_width: 0.5999988,
    hole_height: 0.999998,
    x: 2.5,
    y: 0,
    is_covered_with_solder_mask: false,
  },
]

test("USB-C oval NPTH is included in drill and Gerber clearances", async () => {
  const gerberLayers = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(gerberLayers)
  const unplatedDrillCommands = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: false,
  })
  const unplatedDrillOutput = stringifyExcellonDrill(unplatedDrillCommands)

  expect(unplatedDrillCommands).toContainEqual(
    expect.objectContaining({
      command_code: "G85",
      width: 0.5999988,
    }),
  )
  expect(unplatedDrillOutput).toContain(
    "; #@! TF.FileFunction,NonPlated,1,4,NPTH",
  )

  const innerCopperClearPolarityCount = gerberLayers.In1_Cu.filter(
    (command) => command.command_code === "LP" && command.polarity === "C",
  ).length
  const frontMaskFlashCount = gerberLayers.F_Mask.filter(
    (command) => command.command_code === "D03",
  ).length

  // Both the circular control hole and the oval USB-C alignment slot are
  // included in the copper and soldermask Gerbers.
  expect(innerCopperClearPolarityCount).toBe(2)
  expect(frontMaskFlashCount).toBe(3)

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "oval-npth-gerber-clearance-repro",
    circuitJson,
    ["In1_Cu", "F_Mask"],
    {
      circuitJsonLabel: "tscircuit Circuit JSON",
      gerberLabel: "Gerber inner copper + front mask",
    },
  )
})

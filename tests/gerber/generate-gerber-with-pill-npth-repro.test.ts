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
    pcb_board_id: "pill_npth_slot_board",
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
    y: 2.5,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "kh_sk22d07_g5_mount_1",
    hole_shape: "pill",
    hole_width: 0.700024,
    hole_height: 1.6000222,
    x: -4.100068,
    y: 0,
    is_covered_with_solder_mask: false,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "kh_sk22d07_g5_mount_2",
    hole_shape: "pill",
    hole_width: 0.700024,
    hole_height: 1.6000222,
    x: 4.100068,
    y: 0,
    is_covered_with_solder_mask: false,
  },
]

test("repro: pill NPTH slots are drilled but omitted from Gerber openings", async () => {
  const gerberLayers = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(gerberLayers)
  const unplatedDrillCommands = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: false,
  })
  const unplatedDrillOutput = stringifyExcellonDrill(unplatedDrillCommands)

  const pillSlotDrillCommands = unplatedDrillCommands.filter(
    (command) => command.command_code === "G85" && command.width === 0.700024,
  )

  expect(pillSlotDrillCommands).toHaveLength(2)
  expect(unplatedDrillOutput).toContain(
    "; #@! TF.FileFunction,NonPlated,1,4,NPTH",
  )

  const innerCopperClearPolarityCount = gerberLayers.In1_Cu.filter(
    (command) => command.command_code === "LP" && command.polarity === "C",
  ).length
  const frontMaskFlashCount = gerberLayers.F_Mask.filter(
    (command) => command.command_code === "D03",
  ).length

  // Only the circular control hole is cleared. Both pill mounting slots are
  // present in the drill file but missing from copper and soldermask Gerbers.
  expect(innerCopperClearPolarityCount).toBe(1)
  expect(frontMaskFlashCount).toBe(1)

  await expect(gerberOutput).toMatchCircuitJsonPcbAndGerberSnapshot(
    import.meta.path,
    "pill-npth-gerber-openings-repro",
    circuitJson,
    ["In1_Cu", "F_Mask"],
    {
      circuitJsonLabel: "tscircuit Circuit JSON",
      gerberLabel: "Gerber inner copper + front mask",
    },
  )
})

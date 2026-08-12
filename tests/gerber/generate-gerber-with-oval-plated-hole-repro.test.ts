import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import gerberToSvg from "gerber-to-svg"
import { convertSoupToExcellonDrillCommands } from "src/excellon-drill"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

const renderGerberLayer = (gerber: string, id: string) =>
  new Promise<string>((resolve, reject) => {
    gerberToSvg(gerber, { id }, (error, svg) => {
      if (error) reject(error)
      else resolve(svg)
    })
  })

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_0",
    shape: "oval",
    outer_width: 2,
    outer_height: 1,
    hole_width: 1.2,
    hole_height: 0.5,
    x: 0,
    y: 0,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
    soldermask_margin: 0.2,
  },
  {
    type: "pcb_solder_paste",
    pcb_solder_paste_id: "pcb_solder_paste_0",
    shape: "oval",
    width: 1.6,
    height: 0.8,
    x: 0,
    y: 0,
    layer: "top",
  },
]

test("oval plated holes export as elliptical Gerber regions", async () => {
  const gerberLayers = convertSoupToGerberCommands(circuitJson)
  const gerberOutput = stringifyGerberCommandLayers(gerberLayers)
  const platedDrill = convertSoupToExcellonDrillCommands({
    circuitJson,
    is_plated: true,
  })

  expect(gerberLayers.F_Cu).toContainEqual({ command_code: "G36" })
  expect(gerberLayers.F_Cu).toContainEqual({ command_code: "G37" })
  const copperRegionStart = gerberLayers.F_Cu.find(
    (command) => command.command_code === "D02",
  )
  const maskRegionStart = gerberLayers.F_Mask.find(
    (command) => command.command_code === "D02",
  )
  expect(copperRegionStart?.x).toBeCloseTo(0)
  expect(copperRegionStart?.y).toBeCloseTo(1)
  expect(maskRegionStart?.x).toBeCloseTo(0)
  expect(maskRegionStart?.y).toBeCloseTo(1.2)
  expect(gerberLayers.F_Paste).toContainEqual({
    command_code: "D02",
    x: 0.8,
    y: 0,
  })
  expect(platedDrill).toContainEqual(
    expect.objectContaining({ command_code: "G85", width: 0.5 }),
  )

  await expect(
    renderGerberLayer(gerberOutput.F_Cu, "oval-F_Cu"),
  ).resolves.toContain("<path")
  await expect(
    renderGerberLayer(gerberOutput.F_Mask, "oval-F_Mask"),
  ).resolves.toContain("<path")
  await expect(
    renderGerberLayer(gerberOutput.F_Paste, "oval-F_Paste"),
  ).resolves.toContain("<path")
})

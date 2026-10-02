import { expect, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "../../src"
import { board, polygon, rectangle } from "../fixtures/pcb-stiffeners"
import {
  createCopperLandmark,
  getGerberLayers,
  stiffenerOverlayOptions,
} from "../fixtures/stiffener-visuals"

test.each([false, true])(
  "snapshots exported stiffeners registered to an off-origin board with flip_y_axis=%s",
  async (flipY) => {
    const offsetBoard: PcbBoard = { ...board, center: { x: 30, y: -10 } }
    const files = convertCircuitJsonToGerberFiles(
      [
        offsetBoard,
        {
          ...rectangle,
          center: { x: 3, y: 7 },
          width: 4,
          height: 2,
          rotation: 37,
        },
        polygon,
        createCopperLandmark("top_polygon", 36.5, -4.5, "top"),
        createCopperLandmark("bottom_rectangle", 33, -3, "bottom"),
        createCopperLandmark("board_orientation", 14, -17, "top"),
      ],
      { flip_y_axis: flipY },
    )
    expect(files["B_Stiffener_polyimide.gbr"]).toBeDefined()
    expect(files["F_Stiffener_fr4.gbr"]).toBeDefined()
    await expect(getGerberLayers(files)).toMatchGerberLayerOverlaySnapshot(
      import.meta.path,
      `stiffener-translated-${flipY ? "flipped" : "normal"}`,
      ["Edge_Cuts", "F_Cu", "B_Cu", "B_Stiffener_polyimide", "F_Stiffener_fr4"],
      stiffenerOverlayOptions,
    )
  },
)

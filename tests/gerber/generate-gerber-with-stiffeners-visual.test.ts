import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "../../src"
import {
  board,
  getGerberLayers,
  stiffenerLayerColors,
  stiffenerOverlayOptions,
  visualCopperLandmarks,
  visualStiffeners,
} from "../fixtures/stiffener-visuals"

test("snapshots exported stiffener outlines by material and face with copper registration", async () => {
  const files = convertCircuitJsonToGerberFiles([
    board,
    ...visualCopperLandmarks,
    ...visualStiffeners,
  ])
  expect(
    Object.keys(files)
      .filter((name) => name.includes("Stiffener"))
      .sort(),
  ).toEqual([
    "B_Stiffener_fr4.gbr",
    "B_Stiffener_polyimide.gbr",
    "F_Stiffener_aluminum.gbr",
    "F_Stiffener_fr4.gbr",
    "F_Stiffener_polyimide.gbr",
    "F_Stiffener_stainless_steel.gbr",
  ])
  const layers = getGerberLayers(files)
  for (const [layerName, color] of Object.entries(stiffenerLayerColors)) {
    await expect(layers).toMatchGerberLayerSnapshots(
      import.meta.path,
      "stiffener-materials",
      [layerName],
      { color },
    )
  }
  await expect(layers).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "stiffener-top-registration",
    [
      "Edge_Cuts",
      "F_Cu",
      "F_Stiffener_fr4",
      "F_Stiffener_polyimide",
      "F_Stiffener_stainless_steel",
      "F_Stiffener_aluminum",
    ],
    stiffenerOverlayOptions,
  )
  await expect(layers).toMatchGerberLayerOverlaySnapshot(
    import.meta.path,
    "stiffener-bottom-registration",
    ["Edge_Cuts", "B_Cu", "B_Stiffener_polyimide", "B_Stiffener_fr4"],
    stiffenerOverlayOptions,
  )
})

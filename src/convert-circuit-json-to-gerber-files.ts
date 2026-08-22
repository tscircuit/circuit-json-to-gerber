import type { AnyCircuitElement } from "circuit-json"
import {
  convertSoupToExcellonDrillCommandLayers,
  stringifyExcellonDrill,
} from "./excellon-drill"
import {
  convertSoupToGerberCommands,
  stringifyGerberCommandLayers,
} from "./gerber"

export type GerberFileMap = Record<string, string>

/**
 * Converts Circuit JSON into a complete, filesystem-neutral set of Gerber and
 * Excellon files. Consumers can write this map to disk, a ZIP archive, or any
 * other storage implementation without reproducing conversion options.
 */
export const convertCircuitJsonToGerberFiles = (
  circuitJson: AnyCircuitElement[],
  options: { flip_y_axis?: boolean } = {},
): GerberFileMap => {
  const { flip_y_axis = false } = options
  const gerberCommandLayers = convertSoupToGerberCommands(circuitJson, {
    flip_y_axis,
  })
  const gerberFiles = Object.fromEntries(
    Object.entries(stringifyGerberCommandLayers(gerberCommandLayers)).map(
      ([layerName, contents]) => [`${layerName}.gbr`, contents],
    ),
  )
  const drillCommandLayers = convertSoupToExcellonDrillCommandLayers({
    circuitJson,
    flip_y_axis,
  })
  const drillFiles = Object.fromEntries(
    Object.entries(drillCommandLayers).map(([fileName, commands]) => [
      fileName,
      stringifyExcellonDrill(commands),
    ]),
  )

  return { ...gerberFiles, ...drillFiles }
}

import type { AnyGerberCommand } from "../any_gerber_command"
import { stringifyGerberCommand } from "./stringify-gerber-command"

export const stringifyGerberCommandLayers = (
  commandLayers: Record<string, AnyGerberCommand[]>,
): Record<string, string> => {
  const stringifiedCommandLayers: Record<string, string> = {}
  for (const layerName of Object.keys(commandLayers)) {
    stringifiedCommandLayers[layerName] = commandLayers[layerName]
      .map((command) => {
        return stringifyGerberCommand(command)
      })
      .join("\n")
  }
  return stringifiedCommandLayers
}

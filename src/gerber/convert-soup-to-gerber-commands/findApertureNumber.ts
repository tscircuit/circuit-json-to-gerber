import type {
  ApertureTemplateConfig,
  DefineAperatureTemplateCommand,
} from "../commands/define_aperture_template"
import type { CopperApertureFunction } from "./defineAperturesForLayer"
import type { AnyGerberCommand } from "../any_gerber_command"

interface ApertureIndex {
  /** number of commands of the layer already scanned */
  scanned: number
  isCopper: boolean
  /** the .AperFunction in force after the scanned commands */
  currentFunction: string | undefined
  /** every ADD command scanned so far, with the .AperFunction in force where it was defined */
  apertures: Array<{
    command: AnyGerberCommand
    apertureFunction: string | undefined
  }>
}

// Layers only grow (commands are pushed), so the scan of a layer resumes where
// the previous call stopped instead of restarting for every primitive. An index
// is rebuilt if its layer ever got shorter.
const apertureIndexByLayer = new WeakMap<AnyGerberCommand[], ApertureIndex>()

const getApertureIndex = (glayer: AnyGerberCommand[]): ApertureIndex => {
  let index = apertureIndexByLayer.get(glayer)
  if (!index || index.scanned > glayer.length) {
    index = {
      scanned: 0,
      isCopper: false,
      currentFunction: undefined,
      apertures: [],
    }
    apertureIndexByLayer.set(glayer, index)
  }
  for (; index.scanned < glayer.length; index.scanned++) {
    const command = glayer[index.scanned]
    if (
      command.command_code === "TF" &&
      command.attribute_name === "FileFunction" &&
      command.attribute_value?.startsWith("Copper,")
    )
      index.isCopper = true
    if (
      command.command_code === "TA" &&
      command.attribute_name === ".AperFunction"
    )
      index.currentFunction = command.attribute_value
    if (
      command.command_code === "TD" &&
      (!command.attribute || command.attribute === ".AperFunction")
    )
      index.currentFunction = undefined
    if (command.command_code === "ADD")
      index.apertures.push({
        command,
        apertureFunction: index.currentFunction,
      })
  }
  return index
}

export const findApertureNumber = (
  glayer: AnyGerberCommand[],
  search_params:
    | {
        trace_width?: number
      }
    | ApertureTemplateConfig,
  apertureFunction: CopperApertureFunction = "Conductor",
): number => {
  const index = getApertureIndex(glayer)
  const candidates: AnyGerberCommand[] = []
  for (const entry of index.apertures) {
    if (!index.isCopper || entry.apertureFunction === apertureFunction)
      candidates.push(entry.command)
  }
  let aperture: any
  if ("trace_width" in search_params) {
    const trace_width = search_params.trace_width
    aperture = candidates.find(
      (command): command is DefineAperatureTemplateCommand =>
        "standard_template_code" in command &&
        command.command_code === "ADD" &&
        command.standard_template_code === "C" &&
        command.diameter === trace_width,
    )
  } else if (
    "standard_template_code" in search_params ||
    "macro_name" in search_params
  ) {
    aperture = candidates.find(
      (command): command is DefineAperatureTemplateCommand =>
        command.command_code === "ADD" &&
        Object.keys(search_params).every(
          (param_name) =>
            command[param_name as keyof typeof search_params] ===
            search_params[param_name as keyof typeof search_params],
        ),
    )
  }

  if (!aperture) {
    // TODO add FileFunction/layer name to this error to help narrow it
    throw new Error(
      `Aperture not found for search params ${JSON.stringify(search_params)}`,
    )
  }
  return aperture.aperture_number
}

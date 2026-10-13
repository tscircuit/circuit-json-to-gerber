import type {
  ApertureTemplateConfig,
  DefineAperatureTemplateCommand,
} from "../commands/define_aperture_template"
import type { CopperApertureFunction } from "./defineAperturesForLayer"
import type { AnyGerberCommand } from "../any_gerber_command"

export const findApertureNumber = (
  glayer: AnyGerberCommand[],
  search_params:
    | {
        trace_width?: number
      }
    | ApertureTemplateConfig,
  apertureFunction: CopperApertureFunction = "Conductor",
): number => {
  const isCopper = glayer.some(
    (command) =>
      command.command_code === "TF" &&
      command.attribute_name === "FileFunction" &&
      command.attribute_value?.startsWith("Copper,"),
  )
  let currentFunction: string | undefined
  const candidates = glayer.filter((command) => {
    if (
      command.command_code === "TA" &&
      command.attribute_name === ".AperFunction"
    )
      currentFunction = command.attribute_value
    if (
      command.command_code === "TD" &&
      (!command.attribute || command.attribute === ".AperFunction")
    )
      currentFunction = undefined
    return (
      command.command_code === "ADD" &&
      (!isCopper || currentFunction === apertureFunction)
    )
  })
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

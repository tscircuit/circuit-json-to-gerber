import type {
  ApertureTemplateConfig,
  DefineAperatureTemplateCommand,
} from "../commands/define_aperture_template"
import type { AnyGerberCommand } from "../any_gerber_command"

export const findApertureNumber = (
  glayer: AnyGerberCommand[],
  search_params:
    | {
        trace_width?: number
        aper_function?: string
      }
    | (ApertureTemplateConfig & { aper_function?: string }),
): number => {
  let aperture: any
  if ("trace_width" in search_params) {
    const trace_width = search_params.trace_width
    const targetAperFunction = search_params.aper_function ?? "Conductor"
    aperture = glayer.find(
      (command): command is DefineAperatureTemplateCommand =>
        "standard_template_code" in command &&
        command.command_code === "ADD" &&
        command.standard_template_code === "C" &&
        command.diameter === trace_width &&
        ("aper_function" in command
          ? command.aper_function === targetAperFunction
          : true),
    )
    if (!aperture) {
      aperture = glayer.find(
        (command): command is DefineAperatureTemplateCommand =>
          "standard_template_code" in command &&
          command.command_code === "ADD" &&
          command.standard_template_code === "C" &&
          command.diameter === trace_width,
      )
    }
  } else if (
    "standard_template_code" in search_params ||
    "macro_name" in search_params
  ) {
    aperture = glayer.find(
      (command): command is DefineAperatureTemplateCommand =>
        command.command_code === "ADD" &&
        Object.keys(search_params).every(
          (param_name) =>
            command[param_name as keyof typeof search_params] ===
            search_params[param_name as keyof typeof search_params],
        ),
    )
    if (!aperture && "aper_function" in search_params) {
      const { aper_function, ...rest } = search_params as any
      aperture = glayer.find(
        (command): command is DefineAperatureTemplateCommand =>
          command.command_code === "ADD" &&
          Object.keys(rest).every(
            (param_name) =>
              (command as Record<string, any>)[param_name] ===
              (rest as Record<string, any>)[param_name],
          ),
      )
    }
  }

  if (!aperture) {
    // TODO add FileFunction/layer name to this error to help narrow it
    throw new Error(
      `Aperture not found for search params ${JSON.stringify(search_params)}`,
    )
  }
  return aperture.aperture_number
}

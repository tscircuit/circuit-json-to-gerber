import {
  type AnyExcellonDrillCommand,
  excellon_drill_command_map,
} from "./any-excellon-drill-command-map"

export const stringifyExcellonDrill = (
  commands: Array<AnyExcellonDrillCommand>,
) => {
  const lines: string[] = []
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!
    const nextCommand = commands[i + 1]
    if (
      command.command_code === "drill_at" &&
      nextCommand?.command_code === "G85"
    ) {
      lines.push(
        `${excellon_drill_command_map.drill_at.stringify(command)}${excellon_drill_command_map.G85.stringify(nextCommand)}`,
      )
      i++
      continue
    }
    switch (command.command_code) {
      case "drill_at":
        lines.push(excellon_drill_command_map.drill_at.stringify(command))
        break
      case "G85":
        lines.push(excellon_drill_command_map.G85.stringify(command))
        break
      case "M48":
        lines.push(excellon_drill_command_map.M48.stringify(command))
        break
      case "M95":
        lines.push(excellon_drill_command_map.M95.stringify(command))
        break
      case "G90":
        lines.push(excellon_drill_command_map.G90.stringify(command))
        break
      case "G00":
        lines.push(excellon_drill_command_map.G00.stringify(command))
        break
      case "G01":
        lines.push(excellon_drill_command_map.G01.stringify(command))
        break
      case "G05":
        lines.push(excellon_drill_command_map.G05.stringify(command))
        break
      case "M15":
        lines.push(excellon_drill_command_map.M15.stringify(command))
        break
      case "M16":
        lines.push(excellon_drill_command_map.M16.stringify(command))
        break
      case "M30":
        lines.push(excellon_drill_command_map.M30.stringify(command))
        break
      case "FMAT":
        lines.push(excellon_drill_command_map.FMAT.stringify(command))
        break
      case "unit_format":
        lines.push(excellon_drill_command_map.unit_format.stringify(command))
        break
      case "header_comment":
        lines.push(excellon_drill_command_map.header_comment.stringify(command))
        break
      case "header_attribute":
        lines.push(
          excellon_drill_command_map.header_attribute.stringify(command),
        )
        break
      case "aper_function_header":
        lines.push(
          excellon_drill_command_map.aper_function_header.stringify(command),
        )
        break
      case "define_tool":
        lines.push(excellon_drill_command_map.define_tool.stringify(command))
        break
      case "use_tool":
        lines.push(excellon_drill_command_map.use_tool.stringify(command))
        break
      case "rewind":
        lines.push(excellon_drill_command_map.rewind.stringify(command))
        break
      case "percent_sign":
        lines.push(excellon_drill_command_map.percent_sign.stringify(command))
        break
    }
  }
  return lines.join("\n")
}

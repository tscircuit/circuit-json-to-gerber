import {
  type AnyExcellonDrillCommand,
  excellon_drill_command_map,
} from "./any-excellon-drill-command-map"

export const stringifyExcellonDrill = (
  commands: Array<AnyExcellonDrillCommand>,
) => {
  const blocks: string[] = []
  for (const [index, command] of commands.entries()) {
    const definition = excellon_drill_command_map[command.command_code]
    const text = definition.stringify(command as any)
    if (
      command.command_code === "G85" &&
      commands[index - 1]?.command_code === "drill_at"
    ) {
      // Keep the start coordinate in the slot block to avoid an extra drill hit.
      blocks[blocks.length - 1] += text
    } else {
      blocks.push(text)
    }
  }
  return blocks.join("\n")
}

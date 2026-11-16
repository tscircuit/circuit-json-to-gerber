import {
  type AnyExcellonDrillCommand,
  excellon_drill_command_map,
} from "./any-excellon-drill-command-map"

export const stringifyExcellonDrill = (
  commands: Array<AnyExcellonDrillCommand>,
) => {
  const blocks: string[] = []
  for (const [index, command] of commands.entries()) {
    const def = excellon_drill_command_map[command.command_code]
    const block = def.stringify(command as any)
    if (
      command.command_code === "G85" &&
      commands[index - 1]?.command_code === "drill_at"
    ) {
      blocks[blocks.length - 1] += block
      continue
    }
    blocks.push(block)
  }
  return blocks.join("\n")
}

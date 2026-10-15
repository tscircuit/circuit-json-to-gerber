import {
  type AnyExcellonDrillCommand,
  excellon_drill_command_map,
} from "./any-excellon-drill-command-map"

export const stringifyExcellonDrill = (
  commands: Array<AnyExcellonDrillCommand>,
) => {
  const commandBlocks = commands.map((c) => {
    const def = excellon_drill_command_map[c.command_code]
    return def.stringify(c as any)
  })
  const blocks: string[] = []
  for (const [index, command] of commands.entries()) {
    if (
      command.command_code === "G85" &&
      commands[index - 1]?.command_code === "drill_at"
    ) {
      blocks[blocks.length - 1] += commandBlocks[index]
      continue
    }
    blocks.push(commandBlocks[index])
  }
  return blocks.join("\n")
}

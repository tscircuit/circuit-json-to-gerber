export type DrillSlot = {
  start: { x: number; y: number }
  end: { x: number; y: number }
  diameter: number
}

export const parseDrillSlots = (drill = ""): DrillSlot[] => {
  if (!drill) return []
  const slots: DrillSlot[] = []
  const toolDiameters: Record<string, number> = {}
  let currentToolDiameter: number | undefined
  let lastPoint: { x: number; y: number } | undefined

  const toolDefineRegex = /^T(\d+)C([\d.]+)/
  const toolSelectRegex = /^T(\d+)$/
  const inlineSlotRegex = /^X(-?[\d.]+)Y(-?[\d.]+)G85X(-?[\d.]+)Y(-?[\d.]+)$/
  const moveRegex = /^X(-?[\d.]+)Y(-?[\d.]+)$/
  const slotRegex = /^G85X(-?[\d.]+)Y(-?[\d.]+)/

  for (const rawLine of drill.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const toolDefineMatch = line.match(toolDefineRegex)
    if (toolDefineMatch) {
      const [, toolId, diameterStr] = toolDefineMatch
      const diameter = Number(diameterStr)
      if (Number.isFinite(diameter)) {
        toolDiameters[toolId] = diameter
        currentToolDiameter = diameter
      }
      continue
    }

    const toolSelectMatch = line.match(toolSelectRegex)
    if (toolSelectMatch) {
      const [, toolId] = toolSelectMatch
      currentToolDiameter = toolDiameters[toolId]
      continue
    }

    const inlineSlotMatch = line.match(inlineSlotRegex)
    if (inlineSlotMatch && currentToolDiameter) {
      const start = {
        x: Number(inlineSlotMatch[1]),
        y: Number(inlineSlotMatch[2]),
      }
      const end = {
        x: Number(inlineSlotMatch[3]),
        y: Number(inlineSlotMatch[4]),
      }
      slots.push({
        start,
        end,
        diameter: currentToolDiameter,
      })
      lastPoint = end
      continue
    }

    const moveMatch = line.match(moveRegex)
    if (moveMatch) {
      lastPoint = {
        x: Number(moveMatch[1]),
        y: Number(moveMatch[2]),
      }
      continue
    }

    const slotMatch = line.match(slotRegex)
    if (slotMatch && lastPoint && currentToolDiameter) {
      slots.push({
        start: { ...lastPoint },
        end: { x: Number(slotMatch[1]), y: Number(slotMatch[2]) },
        diameter: currentToolDiameter,
      })
      lastPoint = {
        x: Number(slotMatch[1]),
        y: Number(slotMatch[2]),
      }
    }
  }

  return slots
}

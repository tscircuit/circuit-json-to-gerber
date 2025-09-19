import "bun-match-svg"
import { expect } from "bun:test"
import pcbStackup, { type Stackup } from "pcb-stackup"
import { Readable } from "stream"

type Slot = {
  start: { x: number; y: number }
  end: { x: number; y: number }
  diameter: number
}

type PasteRotationQueues = Map<string, number[]>

const toMicrons = (valueMm: number) => valueMm * 1000

const toFixedKey = (value: number) => value.toFixed(3)

const parseGerberNumber = (value: string) => Number(value) / 1_000_000

const parseDrillSlots = (drill?: string): Slot[] => {
  if (!drill) return []

  const slots: Slot[] = []
  const toolDiameters: Record<string, number> = {}
  let currentToolDiameter: number | undefined
  let lastPoint: { x: number; y: number } | undefined

  const toolDefineRegex = /^T(\d+)C([\d.]+)/
  const toolSelectRegex = /^T(\d+)$/
  const moveRegex = /^X(-?[\d.]+)Y(-?[\d.]+)/
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
      const diameter = toolDiameters[toolId]
      currentToolDiameter = diameter
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

const buildCapsulePath = ({ start, end, diameter }: Slot) => {
  const sx = toMicrons(start.x)
  const sy = toMicrons(start.y)
  const ex = toMicrons(end.x)
  const ey = toMicrons(end.y)

  const dx = ex - sx
  const dy = ey - sy
  const length = Math.hypot(dx, dy)
  if (!isFinite(length) || length === 0) return undefined

  const px = -dy / length
  const py = dx / length
  const radius = toMicrons(diameter / 2)

  const offset = (v: { x: number; y: number }, nx: number, ny: number) => ({
    x: v.x + nx * radius,
    y: v.y + ny * radius,
  })

  const startPoint = { x: sx, y: sy }
  const endPoint = { x: ex, y: ey }

  const startOuter = offset(startPoint, px, py)
  const endOuter = offset(endPoint, px, py)
  const startInner = offset(startPoint, -px, -py)
  const endInner = offset(endPoint, -px, -py)

  const arc = `${radius.toFixed(3)} ${radius.toFixed(3)} 0 0 0`

  return [
    `M ${startOuter.x.toFixed(3)} ${startOuter.y.toFixed(3)}`,
    `L ${endOuter.x.toFixed(3)} ${endOuter.y.toFixed(3)}`,
    `A ${arc} ${endInner.x.toFixed(3)} ${endInner.y.toFixed(3)}`,
    `L ${startInner.x.toFixed(3)} ${startInner.y.toFixed(3)}`,
    `A ${arc} ${startOuter.x.toFixed(3)} ${startOuter.y.toFixed(3)}`,
    "Z",
  ].join(" ")
}

const injectSlotSvg = (svg: string, slots: Slot[], svgId: string) => {
  if (!slots.length) return svg

  const defsCloseIndex = svg.indexOf("</defs>")
  if (defsCloseIndex === -1) return svg

  let slotIndex = 0
  const slotDefs: string[] = []
  const slotUses: string[] = []

  for (const slot of slots) {
    const path = buildCapsulePath(slot)
    if (!path) continue
    const slotId = `${svgId}_slot-${slotIndex++}`
    slotDefs.push(`<path id="${slotId}" d="${path}" fill="#000"/>`)
    slotUses.push(`<use xlink:href="#${slotId}"/>`)
  }

  if (!slotDefs.length) return svg

  const defsInsertion = slotDefs.join("")
  const withDefs =
    svg.slice(0, defsCloseIndex) + defsInsertion + svg.slice(defsCloseIndex)

  const drillGroupRegex = /(<g id="[^"]*_drill[^"]*">)([\s\S]*?)(<\/g>)/g

  return withDefs.replace(drillGroupRegex, (match, open, content, close) => {
    if (content.includes("_slot-")) return match
    return `${open}${content}${slotUses.join("")}${close}`
  })
}

const parsePastePillRotations = (gerber?: string): PasteRotationQueues => {
  if (!gerber) return new Map()

  const pillDcCodes = new Set<number>()
  const rotationQueues: PasteRotationQueues = new Map()

  let currentRotation = 0
  let currentDcode: number | undefined

  for (const rawLine of gerber.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const apertureMatch = line.match(/^%ADD(\d+)(HORZPILL|VERTPILL),/)
    if (apertureMatch) {
      pillDcCodes.add(Number(apertureMatch[1]))
      continue
    }

    const rotationMatch = line.match(/^%LR(-?[\d.]+)\*%$/)
    if (rotationMatch) {
      currentRotation = Number(rotationMatch[1])
      continue
    }

    const dcodeMatch = line.match(/^D(\d+)\*$/)
    if (dcodeMatch) {
      currentDcode = Number(dcodeMatch[1])
      continue
    }

    const flashMatch = line.match(/^X(-?\d+)Y(-?\d+)D0?3\*$/)
    if (!flashMatch) continue
    if (currentDcode === undefined || !pillDcCodes.has(currentDcode)) continue

    const xMm = parseGerberNumber(flashMatch[1])
    const yMm = parseGerberNumber(flashMatch[2])
    const key = `${toFixedKey(toMicrons(xMm))}:${toFixedKey(toMicrons(yMm))}`
    const queue = rotationQueues.get(key) ?? []
    queue.push(currentRotation)
    rotationQueues.set(key, queue)
  }

  return rotationQueues
}

const injectPasteRotation = (
  svg: string,
  rotations: PasteRotationQueues,
): string => {
  if (!rotations.size) return svg

  const queueMap: PasteRotationQueues = new Map(
    Array.from(rotations.entries(), ([key, values]) => [key, [...values]]),
  )

  const pasteGroupRegex = /(<g id="[^"]*_solderpaste">)([\s\S]*?)(<\/g>)/g

  return svg.replace(pasteGroupRegex, (match, open, content, close) => {
    let updatedContent = content
    const useRegex = /<use\b[^>]*?\/?>/g
    updatedContent = updatedContent.replace(useRegex, (useTag: string) => {
      const xMatch = useTag.match(/\sx="(-?[\d.]+)"/)
      const yMatch = useTag.match(/\sy="(-?[\d.]+)"/)
      if (!xMatch || !yMatch) return useTag
      const xVal = Number(xMatch[1])
      const yVal = Number(yMatch[1])
      const key = `${toFixedKey(xVal)}:${toFixedKey(yVal)}`
      const queue = queueMap.get(key)
      if (!queue || queue.length === 0) return useTag
      const rotation = queue.shift() ?? 0
      if (Math.abs(rotation) < 1e-6) return useTag
      if (/\btransform=/.test(useTag)) return useTag
      const insertion = ` transform="rotate(${rotation} ${xVal} ${yVal})"`
      if (useTag.endsWith("/>")) {
        return `${useTag.slice(0, -2)}${insertion} />`
      }
      return `${useTag}${insertion}`
    })

    return `${open}${updatedContent}${close}`
  })
}
async function toMatchGerberSnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName?: string,
) {
  const slots = [
    ...parseDrillSlots(gerberOutput["drill.drl"]),
    ...parseDrillSlots(gerberOutput["drill_npth.drl"]),
  ]

  const pasteRotations = {
    top: parsePastePillRotations(gerberOutput["F_Paste"]),
    bottom: parsePastePillRotations(gerberOutput["B_Paste"]),
  }

  // Create layers array from gerberOutput
  const layers = Object.entries(gerberOutput).map(([filename, content]) => ({
    filename,
    gerber: Readable.from(content),
  }))

  try {
    const stackup = await pcbStackup(layers)
    const svgArray: string[] = []
    const svgNames: string[] = []

    for (const item of Object.keys(stackup!) as Array<keyof Stackup>) {
      const layer = stackup[item] as { svg: string }
      if (layer.svg) {
        const svgIdMatch = layer.svg.match(/id="([^"]+)"/)
        let enhancedSvg = layer.svg
        if (svgIdMatch) {
          enhancedSvg = injectSlotSvg(enhancedSvg, slots, svgIdMatch[1])
          const id = svgIdMatch[1]
          if (/_top$/.test(id)) {
            enhancedSvg = injectPasteRotation(enhancedSvg, pasteRotations.top)
          } else if (/_bottom$/.test(id)) {
            enhancedSvg = injectPasteRotation(
              enhancedSvg,
              pasteRotations.bottom,
            )
          }
        }
        svgArray.push(enhancedSvg)
        svgNames.push(`${svgName}-${item}`)
      }
    }
    return expect(svgArray).toMatchMultipleSvgSnapshots(
      testPathOriginal,
      svgNames,
    )
  } catch (error) {
    throw new Error(`Failed to generate PCB stackup: ${error}`)
  }
}

expect.extend({
  toMatchGerberSnapshot: toMatchGerberSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchGerberSnapshot(
      testImportMetaPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
  }
}

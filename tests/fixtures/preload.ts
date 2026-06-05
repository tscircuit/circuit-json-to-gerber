import "bun-match-svg"
import { expect } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg, type PcbSvgOptions } from "circuit-to-svg"
import gerberToSvg from "gerber-to-svg"
import pcbStackup, { type Stackup } from "pcb-stackup"
import { Readable } from "stream"

type Slot = {
  start: { x: number; y: number }
  end: { x: number; y: number }
  diameter: number
}

type PasteRotationQueues = Map<string, number[]>

type GerberLayerSnapshotOptions = {
  color?: string
}

type GerberLayerOverlaySnapshotOptions = {
  colors?: Record<string, string>
  backgroundColor?: string
}

type CircuitJsonPcbGerberSnapshotOptions = GerberLayerOverlaySnapshotOptions & {
  circuitJsonPcbSvgOptions?: PcbSvgOptions
  circuitJsonLabel?: string
  gerberLabel?: string
}

type CircuitJsonPcbMessageSnapshotOptions = {
  circuitJsonPcbSvgOptions?: PcbSvgOptions
  circuitJsonLabel?: string
  messageLabel?: string
  messageColor?: string
}

const kicadCopperLayerColors: Record<string, string> = {
  F_Cu: "#c83434",
  In1_Cu: "#7fc97f",
  In2_Cu: "#ce7d2c",
  In3_Cu: "#7f7fc9",
  In4_Cu: "#c97f7f",
  In5_Cu: "#7fc9c9",
  In6_Cu: "#c9c97f",
  B_Cu: "#4d7fc4",
}

const nonCopperSnapshotColors: Record<string, string> = {
  F_SilkScreen: "#f3f3f3",
  B_SilkScreen: "#f3f3f3",
  F_Mask: "#004200",
  B_Mask: "#004200",
  F_Paste: "#999999",
  B_Paste: "#999999",
}

const isDrillLayerName = (layerName: string) => layerName.endsWith(".drl")
const isCopperLayerName = (layerName: string) =>
  /(^F_Cu$|^B_Cu$|^In\d+_Cu$)/.test(layerName)

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

const injectSoldermaskBackdrop = (svg: string) => {
  if (/_soldermask"/.test(svg)) return svg

  const svgId = svg.match(/\bid="([^"]+)"/)?.[1]
  const viewBox = parseSvgViewBox(svg)
  if (!svgId || !viewBox) return svg

  const stackupPrefix = svgId.replace(/_(top|bottom)$/, "")
  const fr4Rect = `<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="currentColor" class="${stackupPrefix}_fr4"/>`
  const soldermaskRect = `<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="currentColor" class="${stackupPrefix}_sm"/>`

  if (!svg.includes(fr4Rect)) return svg

  return svg.replace(fr4Rect, `${fr4Rect}${soldermaskRect}`)
}

const renderGerberLayerSvg = (
  gerber: string,
  id: string,
  opts: GerberLayerSnapshotOptions = {},
) =>
  new Promise<string>((resolve, reject) => {
    gerberToSvg(
      gerber,
      {
        id,
        attributes: {
          color: opts.color ?? "#cccccc",
        },
      },
      (error, svg) => {
        if (error) {
          reject(error)
        } else {
          resolve(svg)
        }
      },
    )
  })

const parseSvgViewBox = (svg: string) => {
  const viewBoxMatch = svg.match(/\bviewBox="([^"]+)"/)
  if (!viewBoxMatch) return undefined

  const [x, y, width, height] = viewBoxMatch[1]
    .split(/\s+/)
    .map((value) => Number(value))

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return undefined
  }

  return { x, y, width, height }
}

const parseSvgDimension = (value?: string) => {
  if (!value) return undefined
  const numericValue = Number(value.match(/-?[\d.]+/)?.[0] ?? "")
  if (!Number.isFinite(numericValue) || numericValue <= 0) return undefined
  return numericValue
}

const parseSvgIntrinsicSize = (svg: string) => {
  const rootTag = svg.match(/<svg\b([^>]*)>/)?.[1] ?? ""
  const width = parseSvgDimension(rootTag.match(/\bwidth="([^"]+)"/)?.[1])
  const height = parseSvgDimension(rootTag.match(/\bheight="([^"]+)"/)?.[1])
  const viewBox = parseSvgViewBox(svg)

  return {
    width: width ?? viewBox?.width ?? 800,
    height: height ?? viewBox?.height ?? 600,
  }
}

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const wrapTextLines = (input: string, maxCharsPerLine = 40) => {
  const sourceLines = input.split("\n")
  const wrappedLines: string[] = []

  for (const sourceLine of sourceLines) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      wrappedLines.push("")
      continue
    }

    let currentLine = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${currentLine} ${word}`
      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate
      } else {
        wrappedLines.push(currentLine)
        currentLine = word
      }
    }
    wrappedLines.push(currentLine)
  }

  return wrappedLines
}

const positionSvg = ({
  svg,
  x,
  y,
  width,
  height,
}: {
  svg: string
  x: number
  y: number
  width: number
  height: number
}) => {
  const viewBox = parseSvgViewBox(svg)
  const intrinsicSize = parseSvgIntrinsicSize(svg)
  const rootTagMatch = svg.match(/<svg\b[^>]*>/)

  if (!rootTagMatch) {
    throw new Error("Could not find root <svg> tag while stacking snapshots")
  }

  const positionedRootTag = rootTagMatch[0]
    .replace(/\s(?:x|y|width|height|preserveAspectRatio|viewBox)="[^"]*"/g, "")
    .replace(
      "<svg",
      `<svg x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" viewBox="${viewBox?.x ?? 0} ${viewBox?.y ?? 0} ${viewBox?.width ?? intrinsicSize.width} ${viewBox?.height ?? intrinsicSize.height}"`,
    )

  return svg.replace(rootTagMatch[0], positionedRootTag)
}

const getUnionViewBox = (
  viewBoxes: Array<ReturnType<typeof parseSvgViewBox>>,
) => {
  const definedViewBoxes = viewBoxes.filter((viewBox) => viewBox !== undefined)
  if (definedViewBoxes.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }

  const minX = Math.min(...definedViewBoxes.map((viewBox) => viewBox.x))
  const minY = Math.min(...definedViewBoxes.map((viewBox) => viewBox.y))
  const maxX = Math.max(
    ...definedViewBoxes.map((viewBox) => viewBox.x + viewBox.width),
  )
  const maxY = Math.max(
    ...definedViewBoxes.map((viewBox) => viewBox.y + viewBox.height),
  )

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const getSvgDefsContent = (svg: string) =>
  svg.match(/<defs>([\s\S]*?)<\/defs>/)?.[1] ?? ""

const hasRenderedSvgGeometry = (svg: string) =>
  /<(path|use|circle|rect|polygon|polyline|line|ellipse)\b/.test(
    svg.replace(/<defs>[\s\S]*?<\/defs>/g, ""),
  )

const getGerberLayerSvgContent = (svg: string, layerName: string) => {
  const contentMatch = svg.match(
    /<g transform="[^"]+" fill="currentColor" stroke="currentColor">([\s\S]*?)<\/g><\/svg>$/,
  )
  if (contentMatch) return contentMatch[1]

  if (!hasRenderedSvgGeometry(svg)) return ""

  throw new Error(
    `Could not extract rendered SVG content for Gerber layer "${layerName}"`,
  )
}

const renderGerberLayerOverlaySvg = async (
  gerberOutput: Record<string, string>,
  svgName: string,
  layerNames: string[],
  opts: GerberLayerOverlaySnapshotOptions = {},
) => {
  const renderedLayers = await Promise.all(
    layerNames.map(async (layerName) => {
      const gerber = gerberOutput[layerName]
      if (!gerber) {
        throw new Error(`No Gerber output found for layer "${layerName}"`)
      }

      const svg = await renderGerberLayerSvg(gerber, `${svgName}-${layerName}`)
      return {
        layerName,
        svg,
        viewBox: parseSvgViewBox(svg),
        defs: getSvgDefsContent(svg),
        content: getGerberLayerSvgContent(svg, layerName),
      }
    }),
  )

  const edgeCutsSvg = gerberOutput.Edge_Cuts
    ? await renderGerberLayerSvg(gerberOutput.Edge_Cuts, `${svgName}-Edge_Cuts`)
    : undefined
  const viewBox =
    parseSvgViewBox(edgeCutsSvg ?? "") ??
    getUnionViewBox(renderedLayers.map((layer) => layer.viewBox))
  const colors = { ...kicadCopperLayerColors, ...opts.colors }

  const defs = renderedLayers.map((layer) => layer.defs).join("")
  const layerGroups = renderedLayers
    .map((layer) => {
      const color = colors[layer.layerName] ?? "#cccccc"
      return `<g id="${svgName}-${layer.layerName}" fill="${color}" stroke="${color}">${layer.content}</g>`
    })
    .join("")

  return [
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ',
    'xmlns:xlink="http://www.w3.org/1999/xlink" ',
    'stroke-linecap="round" stroke-linejoin="round" stroke-width="0" ',
    `fill-rule="evenodd" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" `,
    `width="${viewBox.width / 1000}mm" height="${viewBox.height / 1000}mm">`,
    `<defs>${defs}</defs>`,
    `<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="${opts.backgroundColor ?? "#666666"}"/>`,
    `<g transform="scale(1,-1)">${layerGroups}</g>`,
    "</svg>",
  ].join("")
}

const getGerberStackupSvg = async (
  gerberOutput: Record<string, string>,
  layerNames: string[],
  svgName: string,
  opts: GerberLayerOverlaySnapshotOptions = {},
) => {
  for (const layerName of layerNames) {
    if (!gerberOutput[layerName]) {
      throw new Error(`No Gerber output found for layer "${layerName}"`)
    }
  }

  const hasTopLayers = layerNames.some((layerName) =>
    layerName.startsWith("F_"),
  )
  const hasBottomLayers = layerNames.some((layerName) =>
    layerName.startsWith("B_"),
  )
  const contextualLayerNames = [
    ...(hasTopLayers && gerberOutput.F_Mask ? ["F_Mask"] : []),
    ...(hasBottomLayers && gerberOutput.B_Mask ? ["B_Mask"] : []),
  ]

  const hasCopperLayers = layerNames.some(isCopperLayerName)
  if (!hasCopperLayers) {
    return renderGerberLayerOverlaySvg(
      gerberOutput,
      `${svgName}-overlay`,
      [...new Set([...contextualLayerNames, ...layerNames])],
      {
        ...opts,
        colors: {
          ...nonCopperSnapshotColors,
          ...opts.colors,
        },
      },
    )
  }

  const stackupLayerNames = [
    ...new Set([
      ...layerNames,
      ...contextualLayerNames,
      ...(gerberOutput.Edge_Cuts ? ["Edge_Cuts"] : []),
      ...Object.keys(gerberOutput).filter(isDrillLayerName),
    ]),
  ]

  const layers = stackupLayerNames.map((filename) => ({
    filename,
    gerber: Readable.from(gerberOutput[filename]),
  }))

  const slots = Object.entries(gerberOutput)
    .filter(([filename]) => isDrillLayerName(filename))
    .flatMap(([, drill]) => parseDrillSlots(drill))

  const pasteRotations = {
    top: parsePastePillRotations(gerberOutput["F_Paste"]),
    bottom: parsePastePillRotations(gerberOutput["B_Paste"]),
  }
  const shouldShowSoldermaskContext = contextualLayerNames.length > 0

  const stackup = await pcbStackup(layers)
  const prefersBottomView =
    layerNames.some((layerName) => layerName.startsWith("B_")) &&
    !layerNames.some((layerName) => layerName.startsWith("F_"))
  const stackupView = prefersBottomView ? stackup.bottom : stackup.top

  if (!stackupView?.svg) {
    throw new Error(
      `Could not render Gerber stackup view for layers "${layerNames.join(", ")}"`,
    )
  }

  const svgIdMatch = stackupView.svg.match(/id="([^"]+)"/)
  if (!svgIdMatch) return stackupView.svg

  let enhancedSvg = injectSlotSvg(stackupView.svg, slots, svgIdMatch[1])
  if (prefersBottomView) {
    enhancedSvg = injectPasteRotation(enhancedSvg, pasteRotations.bottom)
  } else {
    enhancedSvg = injectPasteRotation(enhancedSvg, pasteRotations.top)
  }
  if (shouldShowSoldermaskContext) {
    enhancedSvg = injectSoldermaskBackdrop(enhancedSvg)
  }

  return enhancedSvg
}

const renderCircuitJsonPcbAndGerberSnapshotSvg = async ({
  circuitJson,
  gerberOutput,
  svgName,
  layerNames,
  opts = {},
}: {
  circuitJson: AnyCircuitElement[]
  gerberOutput: Record<string, string>
  svgName: string
  layerNames: string[]
  opts?: CircuitJsonPcbGerberSnapshotOptions
}) => {
  const circuitSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    matchBoardAspectRatio: true,
    backgroundColor: "#111111",
    showPcbNotes: false,
    ...opts.circuitJsonPcbSvgOptions,
  })
  const gerberSvg = await getGerberStackupSvg(
    gerberOutput,
    layerNames,
    svgName,
    {
      colors: opts.colors,
      backgroundColor: opts.backgroundColor,
    },
  )

  const padding = 28
  const gutter = 28
  const headerHeight = 32
  const cardPadding = 20
  const panelWidth = 720
  const panelHeight = 520
  const cardWidth = panelWidth + cardPadding * 2
  const cardHeight = panelHeight + cardPadding * 2 + headerHeight
  const totalWidth = padding * 2 + cardWidth * 2 + gutter
  const totalHeight = padding * 2 + cardHeight
  const cardY = padding
  const leftCardX = padding
  const rightCardX = padding + cardWidth + gutter
  const contentY = cardY + headerHeight + cardPadding
  const contentXOffset = cardPadding

  return [
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ',
    'xmlns:xlink="http://www.w3.org/1999/xlink" ',
    `viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">`,
    "<defs>",
    "<style><![CDATA[",
    ".snapshot-label { font: 600 24px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #e5e7eb; }",
    ".snapshot-subtitle { font: 500 16px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #94a3b8; }",
    "]]></style>",
    "</defs>",
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#0b1020"/>`,
    `<rect x="${leftCardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#111827" stroke="#334155" stroke-width="2"/>`,
    `<rect x="${rightCardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#111827" stroke="#334155" stroke-width="2"/>`,
    `<text x="${leftCardX + cardPadding}" y="${cardY + 26}" class="snapshot-label">${escapeXml(opts.circuitJsonLabel ?? "Circuit JSON PCB view")}</text>`,
    `<text x="${rightCardX + cardPadding}" y="${cardY + 26}" class="snapshot-label">${escapeXml(opts.gerberLabel ?? `Gerber view: ${layerNames.join(" + ")}`)}</text>`,
    `<text x="${leftCardX + cardPadding}" y="${cardY + 48}" class="snapshot-subtitle">Input</text>`,
    `<text x="${rightCardX + cardPadding}" y="${cardY + 48}" class="snapshot-subtitle">Output</text>`,
    positionSvg({
      svg: circuitSvg,
      x: leftCardX + contentXOffset,
      y: contentY,
      width: panelWidth,
      height: panelHeight,
    }),
    positionSvg({
      svg: gerberSvg,
      x: rightCardX + contentXOffset,
      y: contentY,
      width: panelWidth,
      height: panelHeight,
    }),
    "</svg>",
  ].join("")
}

const renderCircuitJsonPcbAndMessageSnapshotSvg = ({
  circuitJson,
  message,
  opts = {},
}: {
  circuitJson: AnyCircuitElement[]
  message: string | string[]
  opts?: CircuitJsonPcbMessageSnapshotOptions
}) => {
  const circuitSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    matchBoardAspectRatio: true,
    backgroundColor: "#111111",
    showPcbNotes: false,
    ...opts.circuitJsonPcbSvgOptions,
  })

  const padding = 28
  const gutter = 28
  const headerHeight = 32
  const cardPadding = 20
  const panelWidth = 720
  const panelHeight = 520
  const cardWidth = panelWidth + cardPadding * 2
  const cardHeight = panelHeight + cardPadding * 2 + headerHeight
  const totalWidth = padding * 2 + cardWidth * 2 + gutter
  const totalHeight = padding * 2 + cardHeight
  const cardY = padding
  const leftCardX = padding
  const rightCardX = padding + cardWidth + gutter
  const contentY = cardY + headerHeight + cardPadding
  const contentXOffset = cardPadding
  const messageLines = Array.isArray(message)
    ? message
    : wrapTextLines(message, 42)

  return [
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" ',
    'xmlns:xlink="http://www.w3.org/1999/xlink" ',
    `viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">`,
    "<defs>",
    "<style><![CDATA[",
    ".snapshot-label { font: 600 24px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #e5e7eb; }",
    ".snapshot-subtitle { font: 500 16px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #94a3b8; }",
    ".snapshot-message { font: 500 21px ui-monospace, SFMono-Regular, Menlo, monospace; fill: #f8fafc; }",
    "]]></style>",
    "</defs>",
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#0b1020"/>`,
    `<rect x="${leftCardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#111827" stroke="#334155" stroke-width="2"/>`,
    `<rect x="${rightCardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#111827" stroke="#334155" stroke-width="2"/>`,
    `<text x="${leftCardX + cardPadding}" y="${cardY + 26}" class="snapshot-label">${escapeXml(opts.circuitJsonLabel ?? "Circuit JSON PCB view")}</text>`,
    `<text x="${rightCardX + cardPadding}" y="${cardY + 26}" class="snapshot-label">${escapeXml(opts.messageLabel ?? "Gerber status")}</text>`,
    `<text x="${leftCardX + cardPadding}" y="${cardY + 48}" class="snapshot-subtitle">Input</text>`,
    `<text x="${rightCardX + cardPadding}" y="${cardY + 48}" class="snapshot-subtitle">Output</text>`,
    positionSvg({
      svg: circuitSvg,
      x: leftCardX + contentXOffset,
      y: contentY,
      width: panelWidth,
      height: panelHeight,
    }),
    `<rect x="${rightCardX + contentXOffset}" y="${contentY}" width="${panelWidth}" height="${panelHeight}" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>`,
    ...messageLines.map(
      (line, index) =>
        `<text x="${rightCardX + contentXOffset + 24}" y="${contentY + 56 + index * 30}" class="snapshot-message" fill="${opts.messageColor ?? "#fca5a5"}">${escapeXml(line)}</text>`,
    ),
    "</svg>",
  ].join("")
}

async function toMatchGerberLayerSnapshots(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName: string,
  layerNames: string[],
  opts: GerberLayerSnapshotOptions = {},
) {
  const layerSvgs = await Promise.all(
    layerNames.map((layerName) => {
      const gerber = gerberOutput[layerName]
      if (!gerber) {
        throw new Error(`No Gerber output found for layer "${layerName}"`)
      }
      return renderGerberLayerSvg(gerber, `${svgName}-${layerName}`, opts)
    }),
  )

  return expect(layerSvgs).toMatchMultipleSvgSnapshots(
    testPathOriginal,
    layerNames.map((layerName) => `${svgName}-${layerName}`),
  )
}

async function toMatchGerberLayerOverlaySnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName: string,
  layerNames: string[],
  opts: GerberLayerOverlaySnapshotOptions = {},
) {
  const svg = await renderGerberLayerOverlaySvg(
    gerberOutput,
    svgName,
    layerNames,
    opts,
  )

  return expect([svg]).toMatchMultipleSvgSnapshots(testPathOriginal, [svgName])
}

async function toMatchCircuitJsonPcbAndGerberSnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName: string,
  circuitJson: AnyCircuitElement[],
  layerNames: string[],
  opts: CircuitJsonPcbGerberSnapshotOptions = {},
) {
  const svg = await renderCircuitJsonPcbAndGerberSnapshotSvg({
    circuitJson,
    gerberOutput,
    svgName,
    layerNames,
    opts,
  })

  return expect([svg]).toMatchMultipleSvgSnapshots(testPathOriginal, [svgName])
}

async function toMatchCircuitJsonPcbAndMessageSnapshot(
  this: any,
  circuitJson: AnyCircuitElement[],
  testPathOriginal: string,
  svgName: string,
  message: string | string[],
  opts: CircuitJsonPcbMessageSnapshotOptions = {},
) {
  const svg = renderCircuitJsonPcbAndMessageSnapshotSvg({
    circuitJson,
    message,
    opts,
  })

  return expect([svg]).toMatchMultipleSvgSnapshots(testPathOriginal, [svgName])
}

async function toMatchGerberSnapshot(
  this: any,
  gerberOutput: Record<string, string>,
  testPathOriginal: string,
  svgName?: string,
) {
  const slots = Object.entries(gerberOutput)
    .filter(([filename]) => filename.endsWith(".drl"))
    .flatMap(([, drill]) => parseDrillSlots(drill))

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
  toMatchGerberLayerSnapshots: toMatchGerberLayerSnapshots as any,
  toMatchGerberLayerOverlaySnapshot: toMatchGerberLayerOverlaySnapshot as any,
  toMatchCircuitJsonPcbAndGerberSnapshot:
    toMatchCircuitJsonPcbAndGerberSnapshot as any,
  toMatchCircuitJsonPcbAndMessageSnapshot:
    toMatchCircuitJsonPcbAndMessageSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchGerberSnapshot(
      testImportMetaPath: string,
      svgName?: string,
    ): Promise<MatcherResult>
    toMatchGerberLayerSnapshots(
      testImportMetaPath: string,
      svgName: string,
      layerNames: string[],
      opts?: GerberLayerSnapshotOptions,
    ): Promise<MatcherResult>
    toMatchGerberLayerOverlaySnapshot(
      testImportMetaPath: string,
      svgName: string,
      layerNames: string[],
      opts?: GerberLayerOverlaySnapshotOptions,
    ): Promise<MatcherResult>
    toMatchCircuitJsonPcbAndGerberSnapshot(
      testImportMetaPath: string,
      svgName: string,
      circuitJson: AnyCircuitElement[],
      layerNames: string[],
      opts?: CircuitJsonPcbGerberSnapshotOptions,
    ): Promise<MatcherResult>
    toMatchCircuitJsonPcbAndMessageSnapshot(
      testImportMetaPath: string,
      svgName: string,
      message: string | string[],
      opts?: CircuitJsonPcbMessageSnapshotOptions,
    ): Promise<MatcherResult>
  }
}

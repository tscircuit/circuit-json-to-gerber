import type {
  PCBHole,
  LayerRef,
  PCBPlatedHole,
  PCBSMTPad,
  PcbCopperText,
  PcbFabricationNoteDimension,
  PcbFabricationNotePath,
  PcbFabricationNoteRect,
  PcbFabricationNoteText,
  PcbHole,
  PcbSolderPaste,
  PcbSilkscreenPath,
  PcbSilkscreenText,
} from "circuit-json"
import { strokeWidthRatio } from "@tscircuit/alphabet"
import { isSilkscreenShape } from "./getSilkscreenShapeStroke"
import stableStringify from "fast-json-stable-stringify"
import type { AnyGerberCommand } from "../any_gerber_command"
import type { ApertureTemplateConfig } from "../commands/define_aperture_template"
import { gerberBuilder } from "../gerber-builder"
import type { GerberLayerName } from "./GerberLayerName"
import { getAllTraceWidths } from "./getAllTraceWidths"
import type { AnyCircuitElement } from "circuit-json"
import { isGeometryChangingRectRotation } from "./getRotatedRectPoints"

export type CopperApertureFunction =
  | "Conductor"
  | "SMDPad,CuDef"
  | "ComponentPad"
  | "ViaPad"
type LayerApertureConfig = ApertureTemplateConfig & {
  apertureFunction?: CopperApertureFunction
}

// Bake rotation into the aperture so CAM readers that ignore LR still see a pad.
export const getPillApertureConfig = (
  width: number,
  height: number,
  rotation = 0,
): ApertureTemplateConfig => {
  const normalized = ((rotation % 180) + 180) % 180
  if (normalized === 0 || width === height)
    return { standard_template_code: "O", x_size: width, y_size: height }
  if (normalized === 90)
    return { standard_template_code: "O", x_size: height, y_size: width }
  const angle = (rotation * Math.PI) / 180
  const offset = Math.abs(width - height) / 2
  return {
    macro_name: "ROTATEDPILL",
    diameter: Math.min(width, height),
    offset_x: offset * (width >= height ? Math.cos(angle) : -Math.sin(angle)),
    offset_y: offset * (width >= height ? Math.sin(angle) : Math.cos(angle)),
  }
}

const getLayerRefFromGerberLayerName = (
  glayer_name: GerberLayerName,
): LayerRef => {
  if (glayer_name.startsWith("F_")) return "top"
  if (glayer_name.startsWith("B_")) return "bottom"

  const innerLayerMatch = glayer_name.match(/^In(\d+)_/)
  if (innerLayerMatch) return `inner${innerLayerMatch[1]}` as LayerRef

  throw new Error(`Could not infer layer ref from ${glayer_name}`)
}

const getClampedRoundedRectCornerRadius = (
  width: number,
  height: number,
  cornerRadius?: number,
) => {
  if (typeof cornerRadius !== "number") return 0
  return Math.max(0, Math.min(cornerRadius, width / 2, height / 2))
}

const getRoundedRectApertureConfig = (
  width: number,
  height: number,
  cornerRadius: number,
  rotationDegrees = 0,
): ApertureTemplateConfig => {
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Bake the orientation into the macro coordinates. Some fabrication CAM
  // readers ignore LR, which otherwise turns fine-pitch side pads into shorts.
  const angle = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const corners = [
    [-halfWidth + cornerRadius, halfHeight - cornerRadius],
    [halfWidth - cornerRadius, halfHeight - cornerRadius],
    [halfWidth - cornerRadius, -halfHeight + cornerRadius],
    [-halfWidth + cornerRadius, -halfHeight + cornerRadius],
  ].map(([x, y]) => ({ x: x * cos - y * sin, y: x * sin + y * cos }))

  return {
    macro_name: "ROUNDRECT",
    corner_radius: cornerRadius,
    corner_1_x: corners[0].x,
    corner_1_y: corners[0].y,
    corner_2_x: corners[1].x,
    corner_2_y: corners[1].y,
    corner_3_x: corners[2].x,
    corner_3_y: corners[2].y,
    corner_4_x: corners[3].x,
    corner_4_y: corners[3].y,
  }
}

export function defineAperturesForLayer({
  glayer,
  circuitJson,
  glayer_name,
  flip_y_axis = false,
}: {
  flip_y_axis?: boolean
  glayer: AnyGerberCommand[]
  circuitJson: AnyCircuitElement[]
  glayer_name: GerberLayerName
}) {
  const getNextApertureNumber = () => {
    const highest_aperture_number = glayer.reduce((acc, command) => {
      if (command.command_code === "ADD") {
        return Math.max(acc, command.aperture_number)
      }
      return acc
    }, 0)
    if (highest_aperture_number === 0) {
      return 10
    }
    return highest_aperture_number + 1
  }

  glayer.push(
    ...gerberBuilder()
      .add("comment", { comment: "aperture START LIST" })
      .build(),
  )

  // Add all trace width apertures
  const traceWidths: Record<LayerRef, number[]> = getAllTraceWidths(circuitJson)
  const layerRef = getLayerRefFromGerberLayerName(glayer_name)
  for (const width of traceWidths[layerRef] ?? []) {
    if (glayer_name.endsWith("_Cu")) {
      glayer.push(
        ...gerberBuilder()
          .add("add_attribute_on_aperture", {
            attribute_name: ".AperFunction",
            attribute_value: "Conductor",
          })
          .build(),
      )
    }
    glayer.push(
      ...gerberBuilder()
        .add("define_aperture_template", {
          aperture_number: getNextApertureNumber(),
          standard_template_code: "C",
          diameter: width,
        })
        .build(),
    )
  }

  // Add all pcb smtpad, plated hole etc. aperatures
  const apertureConfigs = getAllApertureTemplateConfigsForLayer({
    circuitJson,
    layer: layerRef,
    glayer_name,
    flip_y_axis,
  })

  for (const { apertureFunction, ...apertureConfig } of apertureConfigs) {
    if (apertureFunction) {
      glayer.push(
        ...gerberBuilder()
          .add("add_attribute_on_aperture", {
            attribute_name: ".AperFunction",
            attribute_value: apertureFunction,
          })
          .build(),
      )
    }
    glayer.push(
      ...gerberBuilder()
        .add("define_aperture_template", {
          aperture_number: getNextApertureNumber(),
          ...apertureConfig,
        })
        .build(),
    )
  }

  glayer.push(
    ...gerberBuilder()
      .add("delete_attribute", {})
      .add("comment", { comment: "aperture END LIST" })
      .build(),
  )
}

export const REGION_APERTURE_CONFIG = {
  standard_template_code: "C" as const,
  diameter: 0.001,
}

export const getApertureConfigFromPcbSmtpad = (
  elm: PCBSMTPad,
  flipYAxis = false,
): ApertureTemplateConfig => {
  if (elm.shape === "rect" || elm.shape === "rotated_rect") {
    const cornerRadius = getClampedRoundedRectCornerRadius(
      elm.width,
      elm.height,
      "corner_radius" in elm ? elm.corner_radius : undefined,
    )

    if (cornerRadius > 0) {
      return getRoundedRectApertureConfig(
        elm.width,
        elm.height,
        cornerRadius,
        elm.shape === "rotated_rect"
          ? elm.ccw_rotation * (flipYAxis ? -1 : 1)
          : 0,
      )
    }
  }

  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height,
    }
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2,
    }
  }
  if (elm.shape === "rotated_rect") {
    // Rotation is handled by the LR command, not the aperture definition
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height,
    }
  }
  if (elm.shape === "pill" || elm.shape === "rotated_pill") {
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbSmtpad: missing dimensions",
      )
    }

    return getPillApertureConfig(
      elm.width,
      elm.height,
      "ccw_rotation" in elm ? elm.ccw_rotation : 0,
    )
  }
  if (elm.shape === "polygon") {
    // Polygon shapes don't use apertures - they're drawn as regions
    throw new Error("Polygon SMT pads are drawn as regions, not apertures")
  }
  throw new Error(`Unsupported shape ${(elm as any).shape}`)
}

export const getApertureConfigFromPcbSmtpadSoldermask = (
  elm: PCBSMTPad,
  flipYAxis = false,
): ApertureTemplateConfig => {
  let soldermaskMargin = 0
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin
  }

  if (elm.shape === "rect" || elm.shape === "rotated_rect") {
    const width = elm.width + soldermaskMargin * 2
    const height = elm.height + soldermaskMargin * 2
    const cornerRadius = getClampedRoundedRectCornerRadius(
      width,
      height,
      "corner_radius" in elm && typeof elm.corner_radius === "number"
        ? elm.corner_radius + soldermaskMargin
        : undefined,
    )

    if (cornerRadius > 0) {
      return getRoundedRectApertureConfig(
        width,
        height,
        cornerRadius,
        elm.shape === "rotated_rect"
          ? elm.ccw_rotation * (flipYAxis ? -1 : 1)
          : 0,
      )
    }
  }

  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width + soldermaskMargin * 2,
      y_size: elm.height + soldermaskMargin * 2,
    }
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2 + soldermaskMargin * 2,
    }
  }
  if (elm.shape === "rotated_rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width + soldermaskMargin * 2,
      y_size: elm.height + soldermaskMargin * 2,
    }
  }
  if (elm.shape === "pill" || elm.shape === "rotated_pill") {
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbSmtpadSoldermask: missing dimensions",
      )
    }
    const width = elm.width + soldermaskMargin * 2
    const height = elm.height + soldermaskMargin * 2

    return getPillApertureConfig(
      width,
      height,
      "ccw_rotation" in elm ? elm.ccw_rotation : 0,
    )
  }
  if (elm.shape === "polygon") {
    throw new Error("Polygon SMT pads are drawn as regions, not apertures")
  }
  throw new Error(`Unsupported shape ${(elm as any).shape}`)
}

export const getApertureConfigFromPcbSilkscreenPath = (
  elm: PcbSilkscreenPath,
): ApertureTemplateConfig => {
  if ("stroke_width" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.stroke_width,
    }
  }
  throw new Error(`Provide stroke_width for: ${elm as any}`)
}

export const getApertureConfigFromPcbSilkscreenText = (
  elm: PcbSilkscreenText,
): ApertureTemplateConfig => {
  if ("font_size" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.font_size * strokeWidthRatio,
    }
  }
  throw new Error(`Provide font_size for: ${elm as any}`)
}

export const getApertureConfigFromPcbCopperText = (
  elm: PcbCopperText,
): ApertureTemplateConfig => {
  if ("font_size" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.font_size * strokeWidthRatio,
    }
  }
  throw new Error(`Provide font_size for: ${elm as any}`)
}

type FabricationTextApertureElement =
  | PcbFabricationNoteText
  | Pick<PcbFabricationNoteDimension, "font_size">

export const getApertureConfigFromPcbFabricationNoteText = (
  elm: FabricationTextApertureElement,
): ApertureTemplateConfig => {
  if ("font_size" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.font_size * strokeWidthRatio,
    }
  }
  throw new Error(`Provide font_size for: ${elm as any}`)
}

export const getApertureConfigFromPcbFabricationNotePath = (
  elm: PcbFabricationNotePath | PcbFabricationNoteRect,
): ApertureTemplateConfig => {
  if (!("stroke_width" in elm) || typeof elm.stroke_width !== "number") {
    return {
      standard_template_code: "C",
      diameter: 0.1,
    }
  }
  return {
    standard_template_code: "C",
    diameter: elm.stroke_width,
  }
}

export const getApertureConfigFromPcbFabricationNoteDimension = (
  elm: PcbFabricationNoteDimension,
): ApertureTemplateConfig => {
  return {
    standard_template_code: "C",
    diameter: Math.max(0.05, elm.font_size / 10),
  }
}

export const getApertureConfigFromPcbSolderPaste = (
  elm: PcbSolderPaste,
): ApertureTemplateConfig => {
  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height,
    }
  }
  if (elm.shape === "rotated_rect") {
    // Rotation is handled by the LR command, not the aperture definition
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height,
    }
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2,
    }
  }
  if (elm.shape === "pill" || elm.shape === "rotated_pill") {
    // rotated_pill rotation is handled by the LR command at flash time
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHole: missing dimensions",
      )
    }
    if (elm.width >= elm.height) {
      return {
        macro_name: "HORZPILL",
        x_size: elm.width,
        y_size: elm.height,
        circle_diameter: Math.min(elm.width, elm.height),
        circle_center_offset: (elm.width - elm.height) / 2,
      }
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.width,
      y_size: elm.height,
      circle_diameter: Math.min(elm.width, elm.height),
      circle_center_offset: (elm.height - elm.width) / 2,
    }
  }
  throw new Error(`Unsupported shape ${(elm as any).shape}`)
}

export const getApertureConfigFromPcbPlatedHole = (
  elm: PCBPlatedHole,
): ApertureTemplateConfig => {
  if (elm.shape === "circle") {
    if (!("outer_diameter" in elm && "hole_diameter" in elm)) {
      throw new Error(
        "Invalid circle shape in getApertureConfigFromPcbPlatedHole: missing diameters",
      )
    }
    return {
      standard_template_code: "C",
      diameter: elm.outer_diameter,
    }
  }
  if (elm.shape === "pill") {
    if (!("outer_width" in elm && "outer_height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHole: missing dimensions",
      )
    }

    return getPillApertureConfig(
      Math.max(elm.outer_width, elm.hole_width),
      Math.max(elm.outer_height, elm.hole_height),
      elm.ccw_rotation ?? 0,
    )
  }
  const shape = elm.shape
  if (
    shape === "circular_hole_with_rect_pad" ||
    shape === "pill_hole_with_rect_pad" ||
    shape === "rotated_pill_hole_with_rect_pad"
  ) {
    if (!("rect_pad_width" in elm && "rect_pad_height" in elm)) {
      throw new Error(
        `Invalid ${shape} shape in getApertureConfigFromPcbPlatedHole: missing dimensions`,
      )
    }
    return {
      standard_template_code: "R",
      x_size: elm.rect_pad_width,
      y_size: elm.rect_pad_height,
    }
  }
  throw new Error(
    `Unsupported shape in getApertureConfigFromPcbPlatedHole: ${elm.shape}`,
  )
}

export const getApertureConfigFromPcbPlatedHoleSoldermask = (
  elm: PCBPlatedHole,
): ApertureTemplateConfig => {
  let soldermaskMargin = 0
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin
  }

  if (elm.shape === "circle") {
    if (!("outer_diameter" in elm && "hole_diameter" in elm)) {
      throw new Error(
        "Invalid circle shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing diameters",
      )
    }
    return {
      standard_template_code: "C",
      diameter: elm.outer_diameter + soldermaskMargin * 2,
    }
  }

  if (elm.shape === "pill") {
    if (!("outer_width" in elm && "outer_height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing dimensions",
      )
    }

    return getPillApertureConfig(
      Math.max(elm.outer_width, elm.hole_width) + soldermaskMargin * 2,
      Math.max(elm.outer_height, elm.hole_height) + soldermaskMargin * 2,
      elm.ccw_rotation ?? 0,
    )
  }

  const shape = elm.shape
  if (
    shape === "circular_hole_with_rect_pad" ||
    shape === "pill_hole_with_rect_pad" ||
    shape === "rotated_pill_hole_with_rect_pad"
  ) {
    if (!("rect_pad_width" in elm && "rect_pad_height" in elm)) {
      throw new Error(
        `Invalid ${shape} shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing dimensions`,
      )
    }
    return {
      standard_template_code: "R",
      x_size: elm.rect_pad_width + soldermaskMargin * 2,
      y_size: elm.rect_pad_height + soldermaskMargin * 2,
    }
  }

  throw new Error(
    `Unsupported shape in getApertureConfigFromPcbPlatedHoleSoldermask: ${elm.shape}`,
  )
}

export const getApertureConfigFromCirclePcbHole = (
  elm: PcbHole,
): ApertureTemplateConfig => {
  if (!("hole_diameter" in elm)) {
    throw new Error(
      `Invalid shape called in getApertureConfigFromCirclePcbHole: ${elm.hole_shape}`,
    )
  }
  return {
    standard_template_code: "C",
    diameter: elm.hole_diameter,
  }
}

export const getApertureConfigFromCirclePcbHoleSoldermask = (
  elm: PcbHole,
): ApertureTemplateConfig => {
  if (!("hole_diameter" in elm)) {
    throw new Error(
      `Invalid shape called in getApertureConfigFromCirclePcbHoleSoldermask: ${elm.hole_shape}`,
    )
  }
  let soldermaskMargin = 0
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin
  }
  return {
    standard_template_code: "C",
    diameter: elm.hole_diameter + soldermaskMargin * 2,
  }
}

export const getApertureConfigFromRotatedPillPcbHole = (
  elm: Extract<PcbHole, { hole_shape: "rotated_pill" | "oval" }>,
  soldermaskMargin = 0,
): ApertureTemplateConfig => {
  return {
    standard_template_code: "C",
    diameter: Math.min(elm.hole_width, elm.hole_height) + soldermaskMargin * 2,
  }
}

export const getApertureConfigFromOuterDiameter = (elm: {
  outer_diameter?: number
}): ApertureTemplateConfig => {
  if (typeof elm.outer_diameter !== "number") {
    throw new Error(
      "outer_diameter not specified in getApertureConfigFromOuterDiameter",
    )
  }
  return {
    standard_template_code: "C",
    diameter: elm.outer_diameter,
  }
}

function getAllApertureTemplateConfigsForLayer({
  flip_y_axis,
  circuitJson,
  layer,
  glayer_name,
}: {
  circuitJson: AnyCircuitElement[]
  layer: LayerRef
  glayer_name: GerberLayerName
  flip_y_axis: boolean
}): LayerApertureConfig[] {
  const configs: LayerApertureConfig[] = []
  const configHashMap = new Set<string>()
  const isSoldermaskLayer = glayer_name.endsWith("_Mask")
  const isCopperLayer = glayer_name.endsWith("_Cu")
  const isFabricationLayer = glayer_name.endsWith("_Fab")
  const hasCopperPourForLayer = circuitJson.some(
    (element) => element.type === "pcb_copper_pour" && element.layer === layer,
  )

  let apertureFunction: CopperApertureFunction = "Conductor"
  const addConfigIfNew = (geometry: ApertureTemplateConfig) => {
    if (
      flip_y_axis &&
      "macro_name" in geometry &&
      geometry.macro_name === "ROTATEDPILL"
    )
      geometry = { ...geometry, offset_y: -geometry.offset_y }
    const config: LayerApertureConfig = isCopperLayer
      ? { ...geometry, apertureFunction }
      : geometry
    const hash = stableStringify(config)
    if (!configHashMap.has(hash)) {
      configs.push(config)
      configHashMap.add(hash)
    }
  }

  for (const elm of circuitJson) {
    apertureFunction =
      elm.type === "pcb_smtpad"
        ? "SMDPad,CuDef"
        : elm.type === "pcb_plated_hole"
          ? "ComponentPad"
          : elm.type === "pcb_via" || elm.type === "pcb_trace"
            ? "ViaPad"
            : "Conductor"
    if (elm.type === "pcb_smtpad") {
      if (isFabricationLayer) continue
      if (elm.layer === layer) {
        if (elm.shape === "polygon") {
          addConfigIfNew(REGION_APERTURE_CONFIG)
          continue
        }
        if (isSoldermaskLayer) {
          addConfigIfNew(
            getApertureConfigFromPcbSmtpadSoldermask(elm, flip_y_axis),
          )
        } else {
          addConfigIfNew(getApertureConfigFromPcbSmtpad(elm, flip_y_axis))
        }
      }
    } else if (elm.type === "pcb_soldermask_opening") {
      if (!isSoldermaskLayer || elm.layer !== layer) continue
      addConfigIfNew(
        elm.shape === "circle"
          ? { standard_template_code: "C", diameter: elm.radius * 2 }
          : REGION_APERTURE_CONFIG,
      )
    } else if (elm.type === "pcb_solder_paste") {
      if (isFabricationLayer) continue
      if (elm.layer === layer) {
        if (elm.shape === "polygon" && !glayer_name.endsWith("_Paste")) continue
        if (elm.shape === "oval" || elm.shape === "polygon") {
          addConfigIfNew(REGION_APERTURE_CONFIG)
          continue
        }
        addConfigIfNew(getApertureConfigFromPcbSolderPaste(elm))
        if (elm.shape === "pill") {
          addConfigIfNew(
            getApertureConfigFromPcbSolderPaste({
              ...elm,
              width: elm.height,
              height: elm.width,
            }),
          )
        }
      }
    } else if (elm.type === "pcb_plated_hole") {
      if (isFabricationLayer) continue
      if (elm.layers.includes(layer)) {
        if (elm.shape === "hole_with_polygon_pad") {
          addConfigIfNew(REGION_APERTURE_CONFIG)
          continue
        }
        if (
          glayer_name.endsWith("_Mask") &&
          elm.is_covered_with_solder_mask === true
        ) {
          continue
        }
        if (elm.shape === "oval") {
          addConfigIfNew(REGION_APERTURE_CONFIG)
          continue
        }
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromPcbPlatedHoleSoldermask(elm))
        } else {
          addConfigIfNew(getApertureConfigFromPcbPlatedHole(elm))
        }
        if (
          "rect_pad_width" in elm &&
          typeof elm.rect_pad_width === "number" &&
          "rect_pad_height" in elm &&
          typeof elm.rect_pad_height === "number" &&
          "rect_ccw_rotation" in elm &&
          typeof elm.rect_ccw_rotation === "number" &&
          isGeometryChangingRectRotation({
            width: elm.rect_pad_width,
            height: elm.rect_pad_height,
            ccwRotationDegrees: elm.rect_ccw_rotation,
          })
        ) {
          addConfigIfNew(REGION_APERTURE_CONFIG)
        }
      }
    } else if (elm.type === "pcb_hole") {
      if (!isCopperLayer && !isSoldermaskLayer) continue
      if (isCopperLayer && !hasCopperPourForLayer) continue
      if (isSoldermaskLayer && elm.is_covered_with_solder_mask === true) {
        continue
      }
      if (elm.hole_shape === "circle") {
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromCirclePcbHoleSoldermask(elm))
        } else {
          addConfigIfNew(getApertureConfigFromCirclePcbHole(elm))
        }
      } else if (
        elm.hole_shape === "rotated_pill" ||
        elm.hole_shape === "oval"
      ) {
        const soldermaskMargin = isSoldermaskLayer
          ? (elm.soldermask_margin ?? 0)
          : 0
        addConfigIfNew(
          getApertureConfigFromRotatedPillPcbHole(elm, soldermaskMargin),
        )
      } else
        console.warn("NOT IMPLEMENTED: drawing gerber for non circle holes")
    } else if (elm.type === "pcb_via") {
      if (isFabricationLayer) continue
      addConfigIfNew(getApertureConfigFromOuterDiameter(elm))
    } else if (elm.type === "pcb_trace") {
      if (isFabricationLayer) continue
      for (const point of elm.route) {
        if (
          point.route_type === "via" &&
          typeof point.outer_diameter === "number" &&
          (point.from_layer === layer || point.to_layer === layer)
        ) {
          addConfigIfNew(getApertureConfigFromOuterDiameter(point))
        }
      }
    } else if (elm.type === "pcb_silkscreen_path") {
      if (!isFabricationLayer)
        addConfigIfNew(getApertureConfigFromPcbSilkscreenPath(elm))
    } else if (isSilkscreenShape(elm)) {
      if (!isFabricationLayer) {
        addConfigIfNew({
          standard_template_code: "C",
          diameter: (elm as any).stroke_width ?? 0.1,
        })
        if ((elm as any).is_filled === true) {
          addConfigIfNew(REGION_APERTURE_CONFIG)
        }
      }
    } else if ((elm as { type: string }).type === "pcb_silkscreen_graphic") {
      // A silkscreen graphic is a filled brep, drawn as a Gerber region.
      // (Newer than the pinned circuit-json, so matched structurally.)
      if (glayer_name.endsWith("_SilkScreen")) {
        addConfigIfNew(REGION_APERTURE_CONFIG)
      }
    } else if (elm.type === "pcb_silkscreen_text") {
      if (!isFabricationLayer)
        addConfigIfNew(getApertureConfigFromPcbSilkscreenText(elm))
    } else if (elm.type === "pcb_fabrication_note_text") {
      if (isFabricationLayer && elm.layer === layer)
        addConfigIfNew(getApertureConfigFromPcbFabricationNoteText(elm))
    } else if (elm.type === "pcb_fabrication_note_path") {
      if (isFabricationLayer && elm.layer === layer)
        addConfigIfNew(getApertureConfigFromPcbFabricationNotePath(elm))
    } else if (elm.type === "pcb_fabrication_note_rect") {
      if (isFabricationLayer && elm.layer === layer) {
        if (elm.has_stroke !== false)
          addConfigIfNew(getApertureConfigFromPcbFabricationNotePath(elm))
        if (elm.is_filled === true) addConfigIfNew(REGION_APERTURE_CONFIG)
      }
    } else if (elm.type === "pcb_fabrication_note_dimension") {
      if (isFabricationLayer && elm.layer === layer) {
        addConfigIfNew(getApertureConfigFromPcbFabricationNoteDimension(elm))
        addConfigIfNew(getApertureConfigFromPcbFabricationNoteText(elm))
      }
    } else if (elm.type === "pcb_copper_text") {
      if (elm.layer === layer)
        addConfigIfNew(getApertureConfigFromPcbCopperText(elm))
    }
  }

  const needsRegionAperture = circuitJson.some((elm) => {
    if (elm.type === "pcb_copper_pour") {
      if (elm.layer !== layer) return false
      if (isCopperLayer) return true
      return isSoldermaskLayer && elm.covered_with_solder_mask === false
    }

    if (elm.type === "pcb_smtpad" && elm.shape === "polygon") {
      if (elm.layer !== layer) return false
      if (isCopperLayer) return true
      return isSoldermaskLayer && elm.is_covered_with_solder_mask !== true
    }

    if (elm.type === "pcb_smtpad" && elm.shape === "rotated_rect") {
      if (elm.layer !== layer) return false
      return isCopperLayer || isSoldermaskLayer
    }

    if (
      elm.type === "pcb_plated_hole" &&
      elm.shape === "hole_with_polygon_pad"
    ) {
      if (!elm.layers.includes(layer)) return false
      if (isCopperLayer) return true
      return isSoldermaskLayer && elm.is_covered_with_solder_mask !== true
    }

    return false
  })

  if (needsRegionAperture) {
    apertureFunction = "Conductor"
    addConfigIfNew(REGION_APERTURE_CONFIG)
    if (isCopperLayer) {
      for (const functionName of ["SMDPad,CuDef", "ComponentPad"] as const) {
        apertureFunction = functionName
        addConfigIfNew(REGION_APERTURE_CONFIG)
      }
    }
  }

  return configs
}

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
import stableStringify from "fast-json-stable-stringify"
import type { AnyGerberCommand } from "../any_gerber_command"
import type { ApertureTemplateConfig } from "../commands/define_aperture_template"
import { gerberBuilder } from "../gerber-builder"
import type { GerberLayerName } from "./GerberLayerName"
import { getAllTraceWidths } from "./getAllTraceWidths"
import type { AnyCircuitElement } from "circuit-json"

const getLayerRefFromGerberLayerName = (
  glayer_name: GerberLayerName,
): LayerRef => {
  if (glayer_name.startsWith("F_")) return "top"
  if (glayer_name.startsWith("B_")) return "bottom"

  const innerLayerMatch = glayer_name.match(/^In([1-6])_/)
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
): ApertureTemplateConfig => {
  const halfWidth = width / 2
  const halfHeight = height / 2

  return {
    macro_name: "ROUNDRECT",
    corner_radius: cornerRadius,
    corner_1_x: -halfWidth + cornerRadius,
    corner_1_y: halfHeight - cornerRadius,
    corner_2_x: halfWidth - cornerRadius,
    corner_2_y: halfHeight - cornerRadius,
    corner_3_x: halfWidth - cornerRadius,
    corner_3_y: -halfHeight + cornerRadius,
    corner_4_x: -halfWidth + cornerRadius,
    corner_4_y: -halfHeight + cornerRadius,
  }
}

export function defineAperturesForLayer({
  glayer,
  circuitJson,
  glayer_name,
}: {
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
  for (const width of traceWidths[layerRef]) {
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
  })

  for (const apertureConfig of apertureConfigs) {
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
): ApertureTemplateConfig => {
  if (elm.shape === "rect" || elm.shape === "rotated_rect") {
    const cornerRadius = getClampedRoundedRectCornerRadius(
      elm.width,
      elm.height,
      "corner_radius" in elm ? elm.corner_radius : undefined,
    )

    if (cornerRadius > 0) {
      return getRoundedRectApertureConfig(elm.width, elm.height, cornerRadius)
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

    // SMT pill pads are rendered as a stroked segment with circular endcaps,
    // so the layer only needs the circular endcap aperture.
    return {
      standard_template_code: "C",
      diameter: Math.min(elm.width, elm.height),
    }
  }
  if (elm.shape === "polygon") {
    // Polygon shapes don't use apertures - they're drawn as regions
    throw new Error("Polygon SMT pads are drawn as regions, not apertures")
  }
  throw new Error(`Unsupported shape ${(elm as any).shape}`)
}

export const getApertureConfigFromPcbSmtpadSoldermask = (
  elm: PCBSMTPad,
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
      return getRoundedRectApertureConfig(width, height, cornerRadius)
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

    // SMT pill pads are rendered as a stroked segment with circular endcaps,
    // so the layer only needs the circular endcap aperture.
    return {
      standard_template_code: "C",
      diameter: Math.min(width, height),
    }
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
      diameter: elm.font_size / 8, // font size and diamater have different units of measurement
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
      diameter: elm.font_size / 8, // font size and diamater have different units of measurement
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
      diameter: elm.font_size / 8,
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
  if (elm.shape === "pill") {
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

    if (elm.outer_width > elm.outer_height) {
      return {
        macro_name: "HORZPILL",
        x_size: elm.outer_width,
        y_size: elm.outer_height,
        circle_diameter: Math.min(elm.outer_width, elm.outer_height),
        circle_center_offset: (elm.outer_width - elm.outer_height) / 2,
      }
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.outer_width,
      y_size: elm.outer_height,
      circle_diameter: Math.min(elm.outer_width, elm.outer_height),
      circle_center_offset: (elm.outer_height - elm.outer_width) / 2,
    }
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

    const outerWidth = elm.outer_width + soldermaskMargin * 2
    const outerHeight = elm.outer_height + soldermaskMargin * 2

    if (outerWidth > outerHeight) {
      return {
        macro_name: "HORZPILL",
        x_size: outerWidth,
        y_size: outerHeight,
        circle_diameter: Math.min(outerWidth, outerHeight),
        circle_center_offset: (outerWidth - outerHeight) / 2,
      }
    }
    return {
      macro_name: "VERTPILL",
      x_size: outerWidth,
      y_size: outerHeight,
      circle_diameter: Math.min(outerWidth, outerHeight),
      circle_center_offset: (outerHeight - outerWidth) / 2,
    }
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
  circuitJson,
  layer,
  glayer_name,
}: {
  circuitJson: AnyCircuitElement[]
  layer: LayerRef
  glayer_name: GerberLayerName
}): ApertureTemplateConfig[] {
  const configs: ApertureTemplateConfig[] = []
  const configHashMap = new Set<string>()
  const isSoldermaskLayer = glayer_name.endsWith("_Mask")
  const isCopperLayer = glayer_name.endsWith("_Cu")
  const isFabricationLayer = glayer_name.endsWith("_Fab")

  const addConfigIfNew = (config: ApertureTemplateConfig) => {
    const hash = stableStringify(config)
    if (!configHashMap.has(hash)) {
      configs.push(config)
      configHashMap.add(hash)
    }
  }

  for (const elm of circuitJson) {
    if (elm.type === "pcb_smtpad") {
      if (isFabricationLayer) continue
      if (elm.layer === layer && elm.shape !== "polygon") {
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromPcbSmtpadSoldermask(elm))
        } else {
          addConfigIfNew(getApertureConfigFromPcbSmtpad(elm))
        }
      }
    } else if (elm.type === "pcb_solder_paste") {
      if (isFabricationLayer) continue
      if (elm.layer === layer) {
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
          continue
        }
        if (
          glayer_name.endsWith("_Mask") &&
          elm.is_covered_with_solder_mask === true
        ) {
          continue
        }
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromPcbPlatedHoleSoldermask(elm))
        } else {
          addConfigIfNew(getApertureConfigFromPcbPlatedHole(elm))
        }
      }
    } else if (elm.type === "pcb_hole") {
      if (!isSoldermaskLayer) continue
      if (
        glayer_name.endsWith("_Mask") &&
        elm.is_covered_with_solder_mask === true
      ) {
        continue
      }
      if (elm.hole_shape === "circle") {
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromCirclePcbHoleSoldermask(elm))
        } else {
          addConfigIfNew(getApertureConfigFromCirclePcbHole(elm))
        }
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
    addConfigIfNew(REGION_APERTURE_CONFIG)
  }

  return configs
}

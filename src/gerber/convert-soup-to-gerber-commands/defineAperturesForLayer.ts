import type {
  PCBHole,
  LayerRef,
  PCBPlatedHole,
  PCBSMTPad,
  PcbVia,
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

export function defineAperturesForLayer({
  glayer,
  soup,
  glayer_name,
}: {
  glayer: AnyGerberCommand[]
  soup: AnyCircuitElement[]
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
  const traceWidths: Record<LayerRef, number[]> = getAllTraceWidths(soup)
  for (const width of traceWidths[
    glayer_name.startsWith("F_") ? "top" : "bottom"
  ]) {
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
  const apertureConfigs = getAllApertureTemplateConfigsForLayer(
    soup,
    glayer_name.startsWith("F_") ? "top" : "bottom",
  )

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

export const getApertureConfigFromPcbSmtpad = (
  elm: PCBSMTPad,
): ApertureTemplateConfig => {
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
      diameter: elm.font_size / 4, // font size and diamater have different units of measurement
    }
  }
  throw new Error(`Provide font_size for: ${elm as any}`)
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
        circle_center_offset: elm.width / 2,
      }
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.width,
      y_size: elm.height,
      circle_diameter: Math.min(elm.width, elm.height),
      circle_center_offset: elm.height / 2,
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
        circle_center_offset: elm.outer_width / 2,
      }
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.outer_width,
      y_size: elm.outer_height,
      circle_diameter: Math.min(elm.outer_width, elm.outer_height),
      circle_center_offset: elm.outer_height / 2,
    }
  }
  throw new Error(
    `Unsupported shape in getApertureConfigFromPcbPlatedHole: ${elm.shape}`,
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

export const getApertureConfigFromPcbVia = (
  elm: PcbVia,
): ApertureTemplateConfig => {
  if (!("outer_diameter" in elm)) {
    throw new Error(
      "outer_diameter not specified in getApertureConfigFromPcbVia",
    )
  }
  return {
    standard_template_code: "C",
    diameter: elm.outer_diameter,
  }
}

function getAllApertureTemplateConfigsForLayer(
  soup: AnyCircuitElement[],
  layer: "top" | "bottom",
): ApertureTemplateConfig[] {
  const configs: ApertureTemplateConfig[] = []
  const configHashMap = new Set<string>()

  const addConfigIfNew = (config: ApertureTemplateConfig) => {
    const hash = stableStringify(config)
    if (!configHashMap.has(hash)) {
      configs.push(config)
      configHashMap.add(hash)
    }
  }

  for (const elm of soup) {
    if (elm.type === "pcb_smtpad") {
      if (elm.layer === layer) {
        addConfigIfNew(getApertureConfigFromPcbSmtpad(elm))
      }
    } else if (elm.type === "pcb_solder_paste") {
      if (elm.layer === layer) {
        addConfigIfNew(getApertureConfigFromPcbSolderPaste(elm))
      }
    } else if (elm.type === "pcb_plated_hole") {
      if (elm.layers.includes(layer)) {
        addConfigIfNew(getApertureConfigFromPcbPlatedHole(elm))
      }
    } else if (elm.type === "pcb_hole") {
      if (elm.hole_shape === "circle")
        addConfigIfNew(getApertureConfigFromCirclePcbHole(elm))
      else console.warn("NOT IMPLEMENTED: drawing gerber for non circle holes")
    } else if (elm.type === "pcb_via") {
      addConfigIfNew(getApertureConfigFromPcbVia(elm))
    } else if (elm.type === "pcb_silkscreen_path")
      addConfigIfNew(getApertureConfigFromPcbSilkscreenPath(elm))
    else if (elm.type === "pcb_silkscreen_text")
      addConfigIfNew(getApertureConfigFromPcbSilkscreenText(elm))
  }

  return configs
}

import type { AnyCircuitElement, PCBSMTPad } from "circuit-json"
import { offsetPolygonOutline } from "./offsetPolygonOutline"

export const getSolderPasteFallbackFromSmtPad = (
  pad: PCBSMTPad,
  circuitJson: AnyCircuitElement[],
): PCBSMTPad | null => {
  const margin = pad.solderpaste_margin
  if (typeof margin !== "number") return null

  const hasExplicitSolderPaste = circuitJson.some(
    (element) =>
      element.type === "pcb_solder_paste" &&
      element.pcb_smtpad_id === pad.pcb_smtpad_id,
  )
  if (hasExplicitSolderPaste) return null

  if (pad.shape === "circle") {
    const radius = pad.radius + margin
    return radius > 0 ? { ...pad, radius } : null
  }

  if (pad.shape === "polygon") {
    return {
      ...pad,
      points: offsetPolygonOutline(pad.points, margin),
    }
  }

  const width = pad.width + margin * 2
  const height = pad.height + margin * 2
  if (width <= 0 || height <= 0) return null

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    return { ...pad, width, height }
  }

  const cornerRadius =
    "corner_radius" in pad && typeof pad.corner_radius === "number"
      ? Math.max(0, Math.min(pad.corner_radius + margin, width / 2, height / 2))
      : undefined

  return {
    ...pad,
    width,
    height,
    ...(typeof cornerRadius === "number"
      ? { corner_radius: cornerRadius }
      : {}),
  }
}

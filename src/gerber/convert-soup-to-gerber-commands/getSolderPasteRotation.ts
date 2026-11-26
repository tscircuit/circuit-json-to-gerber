import type {
  AnyCircuitElement,
  PcbPlatedHole,
  PcbSolderPaste,
} from "circuit-json"

export const getSolderPasteRotation = (
  paste: PcbSolderPaste,
  circuitJson: AnyCircuitElement[],
): number => {
  if ("ccw_rotation" in paste && typeof paste.ccw_rotation === "number") {
    return paste.ccw_rotation
  }
  if (!("x" in paste)) return 0

  // Older paste records inherit rotation from a plated hole at the same point.
  const platedHole = circuitJson.find(
    (candidate): candidate is PcbPlatedHole & { ccw_rotation: number } =>
      candidate.type === "pcb_plated_hole" &&
      candidate.x === paste.x &&
      candidate.y === paste.y &&
      "ccw_rotation" in candidate &&
      typeof candidate.ccw_rotation === "number",
  )
  return platedHole?.ccw_rotation ?? 0
}

import type { PcbSilkscreenText } from "circuit-json"

export const isPcbSilkscreenTextHidden = (
  element: PcbSilkscreenText,
): boolean => "is_hidden" in element && element.is_hidden === true

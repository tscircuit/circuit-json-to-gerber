import type { AnyCircuitElement, LayerRef, PCBTrace } from "circuit-json"

export function getAllTraceWidths(
  soup: AnyCircuitElement[],
): Record<LayerRef, number[]> {
  const pcb_traces = soup.filter(
    (elm): elm is PCBTrace => elm.type === "pcb_trace",
  )

  const widths: Record<LayerRef, Set<number>> = {} as any

  for (const trace of pcb_traces) {
    if (!Array.isArray(trace.route)) continue
    for (const segment of trace.route) {
      if (segment.route_type === "wire") {
        if (
          typeof segment.layer === "string" &&
          typeof segment.width === "number" &&
          Number.isFinite(segment.width) &&
          segment.width > 0
        ) {
          widths[segment.layer] = widths[segment.layer] || new Set<number>()
          widths[segment.layer].add(segment.width)
        }
      } else if (segment.route_type === "through_pad") {
        for (const layer of [segment.start_layer, segment.end_layer]) {
          if (
            typeof layer === "string" &&
            typeof segment.width === "number" &&
            Number.isFinite(segment.width) &&
            segment.width > 0
          ) {
            widths[layer as LayerRef] =
              widths[layer as LayerRef] || new Set<number>()
            widths[layer as LayerRef].add(segment.width)
          }
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(widths).map(([layer, layerWidths]) => [
      layer,
      Array.from(layerWidths),
    ]),
  ) as Record<LayerRef, number[]>
}

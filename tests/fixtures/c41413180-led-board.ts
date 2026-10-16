import type { AnyCircuitElement } from "circuit-json"
import importedLed from "../gerber/assets/c41413180-led.circuit.json"

// Complete EasyEDA conversion of LCSC C41413180 / XL-1615RGBC-WS2812B-S.
// Preserve the four real lands, supplier silkscreen and four filled fab symbols.
// The fixture includes the supplier's CAD model reference and source pin names.
export const createLedBreakoutBoard = (): AnyCircuitElement[] => {
  const component = structuredClone(importedLed) as AnyCircuitElement[]
  const pads = component.filter((e) => e.type === "pcb_smtpad")
  const names: Record<string, string> = {
    pin1: "DOUT",
    pin2: "VDD",
    pin3: "GND",
    pin4: "DIN",
  }
  const text = (
    id: string,
    value: string,
    x: number,
    y: number,
    size = 0.23,
  ): AnyCircuitElement => ({
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: id,
    pcb_component_id: "",
    layer: "top",
    text: value,
    font: "tscircuit2024",
    font_size: size,
    anchor_alignment: "center",
    anchor_position: { x, y },
  })
  return [
    {
      type: "pcb_board",
      pcb_board_id: "led-breakout",
      center: { x: 0, y: 0 },
      width: 4.8,
      height: 4,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    ...component.map((e) =>
      e.type === "source_component" ? { ...e, name: "LED1" } : e,
    ),
    ...pads.flatMap((pad): AnyCircuitElement[] => {
      const pin = pad.port_hints![0]!
      const x = Math.sign(pad.x) * 1.8
      return [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: `breakout-${pin}`,
          shape: "rect",
          layer: "top",
          x,
          y: pad.y,
          width: 0.6,
          height: 0.55,
          port_hints: [names[pin]!],
        },
        {
          type: "pcb_trace",
          pcb_trace_id: `trace-${pin}`,
          route: [
            {
              route_type: "wire",
              x: pad.x,
              y: pad.y,
              width: 0.18,
              layer: "top",
            },
            { route_type: "wire", x, y: pad.y, width: 0.18, layer: "top" },
          ],
        },
        text(`label-${pin}`, names[pin]!, x, Math.sign(pad.y) * 1.03, 0.2),
      ]
    }),
    text("led-reference", "LED1", 0, 1.6, 0.3),
    text("led-part", "WS2812-1615", 0, -1.6),
  ]
}

import { pcb_board, pcb_plated_hole } from "circuit-json"

export const platedPadShapes = [
  "circular_hole_with_rect_pad",
  "pill_hole_with_rect_pad",
  "rotated_pill_hole_with_rect_pad",
] as const

export const roundedPlatedPad = (
  shape: (typeof platedPadShapes)[number],
  radius = 0.6,
  x = 0,
) =>
  pcb_plated_hole.parse({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: `rounded_${shape}`,
    pcb_component_id: "rounded_pads",
    shape,
    pad_shape: "rect",
    hole_shape:
      shape === "circular_hole_with_rect_pad"
        ? "circle"
        : shape === "pill_hole_with_rect_pad"
          ? "pill"
          : "rotated_pill",
    hole_diameter: 0.8,
    hole_width: 1.6,
    hole_height: 0.8,
    hole_ccw_rotation: 30,
    rect_ccw_rotation: shape === "rotated_pill_hole_with_rect_pad" ? 30 : 0,
    rect_pad_width: 3.6,
    rect_pad_height: 2.4,
    rect_border_radius: radius,
    soldermask_margin: 0.2,
    hole_offset_x: 0,
    hole_offset_y: 0,
    x,
    y: 0,
    layers: ["top", "bottom"],
  })

export const roundedPlatedPadBoard = () => [
  pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "rounded_pad_board",
    center: { x: 0, y: 0 },
    width: 18,
    height: 7,
    num_layers: 2,
  }),
  ...platedPadShapes.map((shape, index) =>
    roundedPlatedPad(shape, 0.6, (index - 1) * 5.5),
  ),
]

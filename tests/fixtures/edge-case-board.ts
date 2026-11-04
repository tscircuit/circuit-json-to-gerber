/**
 * Synthetic 4-layer board for output-stability tests: every copper and hole shape the converter handles, at several
 * rotations, on outer and inner layers, plus cutouts, slots, pours with holes, silkscreen, paste and fabrication
 * notes. Deterministic: the same document on every call.
 */
type El = Record<string, unknown>

const ROT = [0, 30, 90, 135, 270]

export function gerberEdgeCaseBoard(): El[] {
  const out: El[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 80,
      height: 60,
      num_layers: 4,
      thickness: 1.6,
      material: "fr4",
      outline: [
        { x: -40, y: -30 },
        { x: 40, y: -30 },
        { x: 40, y: 25 },
        { x: 35, y: 30 },
        { x: -40, y: 30 },
      ],
    },
    // cutouts: rect (plain, rotated, rounded), circle, polygon
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cut_rect",
      shape: "rect",
      center: { x: -30, y: 22 },
      width: 6,
      height: 3,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cut_rect_rot",
      shape: "rect",
      center: { x: -20, y: 22 },
      width: 6,
      height: 3,
      rotation: 30,
      corner_radius: 0.5,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cut_circle",
      shape: "circle",
      center: { x: -10, y: 22 },
      radius: 1.5,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cut_poly",
      shape: "polygon",
      points: [
        { x: 0, y: 20 },
        { x: 4, y: 20 },
        { x: 5, y: 23 },
        { x: 2, y: 25 },
        { x: -1, y: 23 },
      ],
    },
  ]
  let n = 0
  const id = (p: string) => `${p}_${n++}`
  const all = ["top", "inner1", "inner2", "bottom"]

  ROT.forEach((r, i) => {
    const x = -32 + i * 8
    // plated holes
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "circle",
      x,
      y: 14,
      outer_diameter: 1.8,
      hole_diameter: 1,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "pill",
      x,
      y: 10,
      outer_width: 3,
      outer_height: 1.6,
      hole_width: 2.2,
      hole_height: 0.8,
      ccw_rotation: r,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "oval",
      x,
      y: 6,
      outer_width: 1.6,
      outer_height: 3,
      hole_width: 0.8,
      hole_height: 2.2,
      ccw_rotation: r,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      x,
      y: 2,
      hole_diameter: 0.9,
      rect_pad_width: 1.7,
      rect_pad_height: 1.7,
      hole_offset_x: 0,
      hole_offset_y: 0,
      rect_ccw_rotation: r,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      x,
      y: -2,
      hole_width: 2,
      hole_height: 0.8,
      rect_pad_width: 3,
      rect_pad_height: 1.6,
      hole_offset_x: 0.1,
      hole_offset_y: 0,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      x,
      y: -6,
      hole_width: 2,
      hole_height: 0.8,
      hole_ccw_rotation: r,
      rect_pad_width: 3,
      rect_pad_height: 1.6,
      rect_ccw_rotation: r,
      hole_offset_x: 0,
      hole_offset_y: 0,
      layers: all,
    })
    out.push({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: id("ph"),
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.8,
      x,
      y: -10,
      pad_outline: [
        { x: -1, y: -1 },
        { x: 1.2, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 0.8 },
      ],
      hole_offset_x: 0,
      hole_offset_y: 0,
      ccw_rotation: r,
      layers: all,
    })
    // non-plated holes and slots
    out.push({
      type: "pcb_hole",
      pcb_hole_id: id("h"),
      hole_shape: "circle",
      x: x + 3,
      y: 14,
      hole_diameter: 1.2,
    })
    out.push({
      type: "pcb_hole",
      pcb_hole_id: id("h"),
      hole_shape: "oval",
      x: x + 3,
      y: 10,
      hole_width: 2,
      hole_height: 1,
    })
    out.push({
      type: "pcb_hole",
      pcb_hole_id: id("h"),
      hole_shape: "pill",
      x: x + 3,
      y: 6,
      hole_width: 1,
      hole_height: 2.4,
    })
    out.push({
      type: "pcb_hole",
      pcb_hole_id: id("h"),
      hole_shape: "rotated_pill",
      x: x + 3,
      y: 2,
      hole_width: 2.4,
      hole_height: 1,
      ccw_rotation: r,
    })
    // pads, top and bottom
    for (const [layer, dy] of [
      ["top", 0],
      ["bottom", -6],
    ] as const) {
      const y = -15 + dy
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "rect",
        x,
        y,
        width: 1.2,
        height: 0.6,
        layer,
      })
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "rotated_rect",
        x: x + 1.8,
        y,
        width: 1.2,
        height: 0.6,
        ccw_rotation: r,
        layer,
        corner_radius: 0.1,
      })
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "circle",
        x: x + 3.6,
        y,
        radius: 0.4,
        layer,
      })
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "pill",
        x,
        y: y - 2,
        width: 1.6,
        height: 0.6,
        radius: 0.3,
        layer,
      })
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "rotated_pill",
        x: x + 1.8,
        y: y - 2,
        width: 1.6,
        height: 0.6,
        radius: 0.3,
        ccw_rotation: r,
        layer,
      })
      out.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: id("p"),
        shape: "polygon",
        points: [
          { x: x + 3, y: y - 2.5 },
          { x: x + 4.2, y: y - 2.5 },
          { x: x + 4, y: y - 1.5 },
        ],
        layer,
      })
      out.push({
        type: "pcb_solder_paste",
        pcb_solder_paste_id: id("sp"),
        shape: "rect",
        x,
        y,
        width: 1,
        height: 0.4,
        layer,
      })
    }
    // traces on every copper layer, several widths, joined by vias
    const w = [0.1, 0.15, 0.2, 0.254, 0.5][i]
    out.push({
      type: "pcb_trace",
      pcb_trace_id: id("t"),
      route: [
        { route_type: "wire", x, y: -26, width: w, layer: "top" },
        { route_type: "wire", x: x + 2, y: -26, width: w, layer: "top" },
        {
          route_type: "via",
          x: x + 2,
          y: -26,
          from_layer: "top",
          to_layer: "inner1",
        },
        { route_type: "wire", x: x + 2, y: -26, width: w, layer: "inner1" },
        { route_type: "wire", x: x + 2, y: -28, width: w, layer: "inner1" },
      ],
    })
    out.push({
      type: "pcb_trace",
      pcb_trace_id: id("t"),
      route: [
        { route_type: "wire", x, y: -28, width: w, layer: "inner2" },
        { route_type: "wire", x: x + 4, y: -24, width: w, layer: "inner2" },
      ],
    })
    out.push({
      type: "pcb_trace",
      pcb_trace_id: id("t"),
      route: [
        { route_type: "wire", x, y: -24, width: w * 2, layer: "bottom" },
        { route_type: "wire", x: x + 5, y: -24, width: w * 2, layer: "bottom" },
      ],
    })
    out.push({
      type: "pcb_via",
      pcb_via_id: id("v"),
      x: x + 2,
      y: -26,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "inner1"],
      from_layer: "top",
      to_layer: "inner1",
    })
    out.push({
      type: "pcb_via",
      pcb_via_id: id("v"),
      x: x + 4,
      y: -29,
      outer_diameter: 0.8,
      hole_diameter: 0.4,
      layers: all,
      from_layer: "top",
      to_layer: "bottom",
    })
    // silkscreen
    out.push({
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: id("s"),
      pcb_component_id: "c",
      font: "tscircuit2024",
      font_size: 1,
      text: `R${r}`,
      anchor_position: { x, y: 17 },
      anchor_alignment: "center",
      layer: i % 2 ? "bottom" : "top",
      ccw_rotation: r,
    })
    out.push({
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: id("s"),
      pcb_component_id: "c",
      layer: "top",
      route: [
        { x: x - 1, y: 18 },
        { x: x + 1, y: 18.5 },
        { x: x + 2, y: 18 },
      ],
      stroke_width: 0.12,
    })
  })
  // pours: rect on top, polygon on inner1, brep with a hole on inner2, and a bottom polygon
  out.push({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_rect",
    shape: "rect",
    layer: "top",
    center: { x: 30, y: 0 },
    width: 6,
    height: 10,
  })
  out.push({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_poly",
    shape: "polygon",
    layer: "inner1",
    points: [
      { x: 25, y: -10 },
      { x: 36, y: -10 },
      { x: 36, y: 10 },
      { x: 25, y: 5 },
    ],
  })
  out.push({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_brep",
    shape: "brep",
    layer: "inner2",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: 24, y: -20 },
          { x: 37, y: -20 },
          { x: 37, y: 18 },
          { x: 24, y: 18 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: 28, y: -4 },
            { x: 32, y: -4, bulge: 0.5 },
            { x: 32, y: 4 },
            { x: 28, y: 4 },
          ],
        },
      ],
    },
  })
  out.push({
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pour_bottom",
    shape: "polygon",
    layer: "bottom",
    points: [
      { x: 24, y: -28 },
      { x: 37, y: -28 },
      { x: 37, y: -21 },
    ],
  })
  out.push({
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab",
    pcb_component_id: "c",
    font: "tscircuit2024",
    font_size: 1,
    text: "FAB",
    anchor_position: { x: 30, y: 22 },
    anchor_alignment: "center",
    layer: "top",
  })
  return out
}

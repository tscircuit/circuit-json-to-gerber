// src/excellon-drill/commands/FMAT.ts
import { z } from "zod";

// src/excellon-drill/define-excellon-drill-command.ts
var defineExcellonDrillCommand = ({
  command_code,
  schema,
  stringify
}) => {
  return {
    command_code,
    schema,
    stringify
  };
};

// src/excellon-drill/commands/FMAT.ts
var FMAT = defineExcellonDrillCommand({
  command_code: "FMAT",
  schema: z.object({
    command_code: z.literal("FMAT").default("FMAT"),
    format: z.number()
  }),
  stringify: (c) => `FMAT,${c.format}`
});

// src/excellon-drill/commands/G00.ts
import { z as z2 } from "zod";
var G00 = defineExcellonDrillCommand({
  command_code: "G00",
  schema: z2.object({
    command_code: z2.literal("G00").default("G00")
  }),
  stringify: () => "G00"
});

// src/excellon-drill/commands/G01.ts
import { z as z3 } from "zod";
var G01 = defineExcellonDrillCommand({
  command_code: "G01",
  schema: z3.object({
    command_code: z3.literal("G01").default("G01")
  }),
  stringify: () => "G01"
});

// src/excellon-drill/commands/G05.ts
import { z as z4 } from "zod";
var G05 = defineExcellonDrillCommand({
  command_code: "G05",
  schema: z4.object({
    command_code: z4.literal("G05").default("G05")
  }),
  stringify: () => "G05"
});

// src/excellon-drill/commands/G85.ts
import { z as z5 } from "zod";
var G85 = defineExcellonDrillCommand({
  command_code: "G85",
  schema: z5.object({
    command_code: z5.literal("G85").default("G85"),
    x: z5.number(),
    y: z5.number(),
    width: z5.number()
    // slot width = tool diameter
  }),
  stringify: ({ x, y }) => `G85X${x.toFixed(3)}Y${y.toFixed(3)}`
});

// src/excellon-drill/commands/G90.ts
import { z as z6 } from "zod";
var G90 = defineExcellonDrillCommand({
  command_code: "G90",
  schema: z6.object({
    command_code: z6.literal("G90").default("G90")
  }),
  stringify: () => "G90"
});

// src/excellon-drill/commands/M15.ts
import { z as z7 } from "zod";
var M15 = defineExcellonDrillCommand({
  command_code: "M15",
  schema: z7.object({
    command_code: z7.literal("M15").default("M15")
  }),
  stringify: () => "M15"
});

// src/excellon-drill/commands/M16.ts
import { z as z8 } from "zod";
var M16 = defineExcellonDrillCommand({
  command_code: "M16",
  schema: z8.object({
    command_code: z8.literal("M16").default("M16")
  }),
  stringify: () => "M16"
});

// src/excellon-drill/commands/M30.ts
import { z as z9 } from "zod";
var M30 = defineExcellonDrillCommand({
  command_code: "M30",
  schema: z9.object({
    command_code: z9.literal("M30").default("M30")
  }),
  stringify: () => "M30"
});

// src/excellon-drill/commands/M48.ts
import { z as z10 } from "zod";
var M48 = defineExcellonDrillCommand({
  command_code: "M48",
  schema: z10.object({
    command_code: z10.literal("M48").default("M48")
  }),
  stringify: () => "M48"
});

// src/excellon-drill/commands/M95.ts
import { z as z11 } from "zod";
var M95 = defineExcellonDrillCommand({
  command_code: "M95",
  schema: z11.object({
    command_code: z11.literal("M95").default("M95")
  }),
  stringify: () => "M95"
});

// src/excellon-drill/commands/define_tool.ts
import { z as z12 } from "zod";
var define_tool = defineExcellonDrillCommand({
  command_code: "define_tool",
  schema: z12.object({
    command_code: z12.literal("define_tool").default("define_tool"),
    tool_number: z12.number(),
    diameter: z12.number()
  }),
  stringify: (c) => `T${c.tool_number}C${c.diameter.toFixed(6)}`
});

// src/excellon-drill/commands/drill_at.ts
import { z as z13 } from "zod";
var drill_at = defineExcellonDrillCommand({
  command_code: "drill_at",
  schema: z13.object({
    command_code: z13.literal("drill_at").default("drill_at"),
    x: z13.number(),
    y: z13.number()
  }),
  stringify: (c) => `X${c.x.toFixed(4)}Y${c.y.toFixed(4)}`
});

// src/excellon-drill/commands/header_attribute.ts
import { z as z14 } from "zod";
var header_attribute = defineExcellonDrillCommand({
  command_code: "header_attribute",
  schema: z14.object({
    command_code: z14.literal("header_attribute").default("header_attribute"),
    attribute_name: z14.string(),
    attribute_value: z14.string()
  }),
  stringify({ attribute_name, attribute_value }) {
    return `; #@! ${attribute_name},${attribute_value}`;
  }
});

// src/excellon-drill/commands/header_comment.ts
import { z as z15 } from "zod";
var header_comment = defineExcellonDrillCommand({
  command_code: "header_comment",
  schema: z15.object({
    command_code: z15.literal("header_comment").default("header_comment"),
    text: z15.string()
  }),
  stringify({ text }) {
    return `; ${text}`;
  }
});

// src/excellon-drill/commands/rewind.ts
import { z as z16 } from "zod";
var rewind = defineExcellonDrillCommand({
  command_code: "rewind",
  schema: z16.object({
    command_code: z16.literal("rewind").default("rewind")
  }),
  stringify: () => "%"
});

// src/excellon-drill/commands/unit_format.ts
import { z as z17 } from "zod";
var unit_format = defineExcellonDrillCommand({
  command_code: "unit_format",
  schema: z17.object({
    command_code: z17.literal("unit_format").default("unit_format"),
    unit: z17.union([z17.literal("INCH"), z17.literal("METRIC")]),
    lz: z17.union([z17.literal("LZ"), z17.literal("TZ")]).nullable().default(null)
  }),
  stringify(c) {
    return `${c.unit}${!c.lz ? "" : `,${c.lz}`}`;
  }
});

// src/excellon-drill/commands/use_tool.ts
import { z as z18 } from "zod";
var use_tool = defineExcellonDrillCommand({
  command_code: "use_tool",
  schema: z18.object({
    command_code: z18.literal("use_tool").default("use_tool"),
    tool_number: z18.number()
  }),
  stringify: (c) => `T${c.tool_number}`
});

// src/excellon-drill/commands/aper_function_header.ts
import { z as z19 } from "zod";
var aper_function_header = defineExcellonDrillCommand({
  command_code: "aper_function_header",
  schema: z19.object({
    command_code: z19.literal("aper_function_header").default("aper_function_header"),
    is_plated: z19.boolean()
  }),
  stringify({ is_plated }) {
    return is_plated ? "; #@! TA.AperFunction,Plated,PTH,ComponentDrill" : "; #@! TA.AperFunction,NonPlated,NPTH,ComponentDrill";
  }
});

// src/excellon-drill/commands/percent_sign.ts
import { z as z20 } from "zod";
var percent_sign = defineExcellonDrillCommand({
  command_code: "percent_sign",
  schema: z20.object({
    command_code: z20.literal("percent_sign").default("percent_sign")
  }),
  stringify: () => "%"
});

// src/excellon-drill/any-excellon-drill-command-map.ts
var excellon_drill_command_map = {
  G00,
  G01,
  G85,
  M48,
  M95,
  FMAT,
  unit_format,
  aper_function_header,
  percent_sign,
  T: define_tool,
  define_tool,
  use_tool,
  G90,
  G05,
  M15,
  M16,
  M30,
  drill_at,
  header_comment,
  header_attribute,
  rewind
};

// src/excellon-drill/stringify-excellon-drill.ts
var stringifyExcellonDrill = (commands) => {
  return commands.map((c) => {
    const def = excellon_drill_command_map[c.command_code];
    return def.stringify(c);
  }).join("\n");
};

// src/excellon-drill/excellon-drill-builder.ts
var ExcellonDrillBuilder = class {
  commands;
  constructor() {
    this.commands = [];
  }
  add(cmd, props) {
    this.commands.push({
      ...{
        command_code: excellon_drill_command_map[cmd].command_code
      },
      ...props
    });
    return this;
  }
  build() {
    return this.commands;
  }
};
var excellonDrill = () => new ExcellonDrillBuilder();

// src/excellon-drill/convert-soup-to-excellon-drill-commands.ts
var getLayerCount = (circuitJson) => {
  const board = circuitJson.find((element) => element.type === "pcb_board");
  if (!board || typeof board.num_layers !== "number") {
    return 2;
  }
  return Math.max(2, board.num_layers);
};
var getLayerNumber = (layer, layerCount) => {
  if (layer === "top") return 1;
  if (layer === "bottom") return layerCount;
  const innerLayerMatch = layer.match(/^inner([1-6])$/);
  if (innerLayerMatch) {
    const innerLayerNumber = Number(innerLayerMatch[1]);
    if (innerLayerNumber >= 1 && innerLayerNumber <= layerCount - 2) {
      return innerLayerNumber + 1;
    }
  }
  throw new Error(`Invalid layer "${layer}" for ${layerCount}-layer board`);
};
var normalizeLayerSpan = (span, layerCount) => {
  const fromLayerNumber = getLayerNumber(span.from_layer, layerCount);
  const toLayerNumber = getLayerNumber(span.to_layer, layerCount);
  if (fromLayerNumber <= toLayerNumber) {
    return span;
  }
  return {
    from_layer: span.to_layer,
    to_layer: span.from_layer
  };
};
var getPlatedElementLayerSpan = (element, layerCount) => {
  if (element.type !== "pcb_plated_hole" && element.type !== "pcb_via") {
    return void 0;
  }
  if ("from_layer" in element && typeof element.from_layer === "string" && "to_layer" in element && typeof element.to_layer === "string") {
    return normalizeLayerSpan(
      {
        from_layer: element.from_layer,
        to_layer: element.to_layer
      },
      layerCount
    );
  }
  let layers = [];
  if ("layers" in element && Array.isArray(element.layers)) {
    layers = element.layers;
  }
  if (layers.length > 0) {
    const sortedLayers = [...layers].sort(
      (a, b) => getLayerNumber(a, layerCount) - getLayerNumber(b, layerCount)
    );
    return {
      from_layer: sortedLayers[0],
      to_layer: sortedLayers[sortedLayers.length - 1]
    };
  }
  return {
    from_layer: "top",
    to_layer: "bottom"
  };
};
var getDefaultPlatedDrillLayerSpan = () => ({
  from_layer: "top",
  to_layer: "bottom"
});
var getRequestedLayerSpan = (layer_span) => {
  if (layer_span) {
    return layer_span;
  }
  return getDefaultPlatedDrillLayerSpan();
};
var isSameLayerSpan = (a, b, layerCount) => {
  const normalizedA = normalizeLayerSpan(a, layerCount);
  const normalizedB = normalizeLayerSpan(b, layerCount);
  return normalizedA.from_layer === normalizedB.from_layer && normalizedA.to_layer === normalizedB.to_layer;
};
var shouldIncludeElement = ({
  element,
  is_plated,
  layer_span,
  layerCount
}) => {
  if (element.type !== "pcb_plated_hole" && element.type !== "pcb_hole" && element.type !== "pcb_via") {
    return false;
  }
  if (!is_plated) return element.type === "pcb_hole";
  if (element.type === "pcb_hole") return false;
  const elementLayerSpan = getPlatedElementLayerSpan(element, layerCount);
  if (!elementLayerSpan) return false;
  const requestedLayerSpan = getRequestedLayerSpan(layer_span);
  return isSameLayerSpan(elementLayerSpan, requestedLayerSpan, layerCount);
};
var getFileFunctionLayerSpan = ({
  circuitJson,
  is_plated,
  layer_span
}) => {
  const layerCount = getLayerCount(circuitJson);
  if (!is_plated) return `NonPlated,1,${layerCount},NPTH`;
  const requestedLayerSpan = getRequestedLayerSpan(layer_span);
  const span = normalizeLayerSpan(requestedLayerSpan, layerCount);
  return `Plated,${getLayerNumber(span.from_layer, layerCount)},${getLayerNumber(span.to_layer, layerCount)},PTH`;
};
var getTraceRouteViaElements = (circuitJson) => {
  const routeVias = [];
  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") {
      continue;
    }
    for (const [index, point] of element.route.entries()) {
      if (point.route_type !== "via" || typeof point.hole_diameter !== "number" || typeof point.outer_diameter !== "number") {
        continue;
      }
      routeVias.push({
        type: "pcb_via",
        pcb_via_id: `${element.pcb_trace_id}_route_via_${index}`,
        x: point.x,
        y: point.y,
        hole_diameter: point.hole_diameter,
        outer_diameter: point.outer_diameter,
        from_layer: point.from_layer,
        to_layer: point.to_layer,
        layers: [point.from_layer, point.to_layer]
      });
    }
  }
  return routeVias;
};
var getDrillableElements = (circuitJson) => [
  ...circuitJson,
  ...getTraceRouteViaElements(circuitJson)
];
var convertSoupToExcellonDrillCommands = ({
  circuitJson,
  is_plated,
  flip_y_axis = false,
  layer_span
}) => {
  const builder = excellonDrill();
  const layerCount = getLayerCount(circuitJson);
  const drillableElements = getDrillableElements(circuitJson);
  builder.add("M48", {});
  const date_str = (/* @__PURE__ */ new Date()).toISOString();
  builder.add("header_comment", {
    text: `DRILL file {tscircuit} date ${date_str}`
  }).add("header_comment", {
    text: "FORMAT={-:-/ absolute / metric / decimal}"
  }).add("header_attribute", {
    attribute_name: "TF.CreationDate",
    attribute_value: date_str
  }).add("header_attribute", {
    attribute_name: "TF.GenerationSoftware",
    attribute_value: "tscircuit"
  }).add("header_attribute", {
    attribute_name: "TF.FileFunction",
    attribute_value: getFileFunctionLayerSpan({
      circuitJson,
      is_plated,
      layer_span
    })
  }).add("FMAT", { format: 2 }).add("unit_format", { unit: "METRIC", lz: null });
  let tool_counter = 10;
  const diameterToToolNumber = {};
  for (const element of drillableElements) {
    if (!shouldIncludeElement({
      element,
      is_plated,
      layer_span,
      layerCount
    })) {
      continue;
    }
    const holeDiameter = "hole_diameter" in element && typeof element.hole_diameter === "number" ? element.hole_diameter : "hole_width" in element && typeof element.hole_width === "number" && "hole_height" in element && typeof element.hole_height === "number" ? Math.min(element.hole_width, element.hole_height) : void 0;
    if (!holeDiameter) continue;
    if (!diameterToToolNumber[holeDiameter]) {
      builder.add("aper_function_header", {
        is_plated
      });
      builder.add("define_tool", {
        tool_number: tool_counter,
        diameter: holeDiameter
      });
      diameterToToolNumber[holeDiameter] = tool_counter;
      tool_counter++;
    }
  }
  builder.add("percent_sign", {});
  builder.add("G90", {});
  builder.add("G05", {});
  for (let i = 10; i < tool_counter; i++) {
    builder.add("use_tool", { tool_number: i });
    for (const element of drillableElements) {
      if (element.type === "pcb_plated_hole" || element.type === "pcb_hole" || element.type === "pcb_via") {
        if (!shouldIncludeElement({
          element,
          is_plated,
          layer_span,
          layerCount
        })) {
          continue;
        }
        const holeDiameter = "hole_diameter" in element && typeof element.hole_diameter === "number" ? element.hole_diameter : "hole_width" in element && typeof element.hole_width === "number" && "hole_height" in element && typeof element.hole_height === "number" ? Math.min(element.hole_width, element.hole_height) : void 0;
        if (!holeDiameter || diameterToToolNumber[holeDiameter] !== i) {
          continue;
        }
        const elementX = "x" in element && typeof element.x === "number" ? element.x : 0;
        const elementY = "y" in element && typeof element.y === "number" ? element.y : 0;
        const offsetX = "hole_offset_x" in element && typeof element.hole_offset_x === "number" ? element.hole_offset_x : 0;
        const offsetY = "hole_offset_y" in element && typeof element.hole_offset_y === "number" ? element.hole_offset_y : 0;
        const centerX = elementX + offsetX;
        const centerY = elementY + offsetY;
        const yMultiplier = flip_y_axis ? -1 : 1;
        if ("hole_width" in element && typeof element.hole_width === "number" && "hole_height" in element && typeof element.hole_height === "number") {
          const holeWidth = element.hole_width;
          const holeHeight = element.hole_height;
          const maxDim = Math.max(holeWidth, holeHeight);
          const minDim = Math.min(holeWidth, holeHeight);
          if (Math.abs(maxDim - minDim) <= 1e-6) {
            builder.add("drill_at", {
              x: centerX,
              y: centerY * yMultiplier
            });
            continue;
          }
          const rotationDegrees = "hole_ccw_rotation" in element && typeof element.hole_ccw_rotation === "number" ? element.hole_ccw_rotation : "ccw_rotation" in element && typeof element.ccw_rotation === "number" ? element.ccw_rotation : 0;
          const rotationRadians = rotationDegrees * Math.PI / 180;
          const cosTheta = Math.cos(rotationRadians);
          const sinTheta = Math.sin(rotationRadians);
          const isWidthMajor = holeWidth >= holeHeight;
          const slotHalfLength = (maxDim - minDim) / 2;
          const startRelative = isWidthMajor ? { x: -slotHalfLength, y: 0 } : { x: 0, y: -slotHalfLength };
          const endRelative = isWidthMajor ? { x: slotHalfLength, y: 0 } : { x: 0, y: slotHalfLength };
          const rotatePoint = ({ x, y }) => ({
            x: x * cosTheta - y * sinTheta,
            y: x * sinTheta + y * cosTheta
          });
          const startPoint = rotatePoint(startRelative);
          const endPoint = rotatePoint(endRelative);
          const startX = centerX + startPoint.x;
          const startY = (centerY + startPoint.y) * yMultiplier;
          const endX = centerX + endPoint.x;
          const endY = (centerY + endPoint.y) * yMultiplier;
          builder.add("drill_at", {
            x: startX,
            y: startY
          }).add("G85", {
            x: endX,
            y: endY,
            width: minDim
          });
          continue;
        }
        builder.add("drill_at", {
          x: centerX,
          y: centerY * yMultiplier
        });
      }
    }
  }
  builder.add("M30", {});
  return builder.build();
};
var getDrillLayerSpanKey = (span, layerCount) => {
  const normalizedSpan = normalizeLayerSpan(span, layerCount);
  return `L${getLayerNumber(normalizedSpan.from_layer, layerCount)}-L${getLayerNumber(normalizedSpan.to_layer, layerCount)}`;
};
var hasDrillGeometry = (element) => {
  if ("hole_diameter" in element && typeof element.hole_diameter === "number") {
    return true;
  }
  return "hole_width" in element && typeof element.hole_width === "number" && "hole_height" in element && typeof element.hole_height === "number";
};
var convertSoupToExcellonDrillCommandLayers = ({
  circuitJson,
  flip_y_axis = false
}) => {
  const layerCount = getLayerCount(circuitJson);
  const platedSpans = new Map(
    getDrillableElements(circuitJson).flatMap(
      (element) => {
        const span = getPlatedElementLayerSpan(element, layerCount);
        if (!span) {
          return [];
        }
        return [[getDrillLayerSpanKey(span, layerCount), span]];
      }
    )
  );
  const platedDrillLayers = Object.fromEntries(
    [...platedSpans.entries()].sort().map(([spanKey, span]) => [
      `drill-${spanKey}.drl`,
      convertSoupToExcellonDrillCommands({
        circuitJson,
        is_plated: true,
        flip_y_axis,
        layer_span: span
      })
    ])
  );
  const hasNonPlatedDrill = circuitJson.some((element) => {
    if (element.type !== "pcb_hole") {
      return false;
    }
    return hasDrillGeometry(element);
  });
  if (!hasNonPlatedDrill) {
    return platedDrillLayers;
  }
  return {
    ...platedDrillLayers,
    "drill_npth.drl": convertSoupToExcellonDrillCommands({
      circuitJson,
      is_plated: false,
      flip_y_axis
    })
  };
};

// src/gerber/commands/add_attribute_on_aperture.ts
import { z as z21 } from "zod";

// src/gerber/define-gerber-command.ts
var defineGerberCommand = ({
  command_code,
  schema,
  stringify
}) => {
  return {
    command_code,
    schema,
    stringify
  };
};

// src/gerber/commands/add_attribute_on_aperture.ts
var add_attribute_on_aperture = defineGerberCommand({
  command_code: "TA",
  schema: z21.object({
    command_code: z21.literal("TA").default("TA"),
    attribute_name: z21.string(),
    attribute_value: z21.string()
  }).describe(
    "Add attribute on aperture: Add an aperture attribute to the dictionary or modify it."
  ),
  stringify: ({ attribute_name, attribute_value }) => {
    return `%TA${attribute_name},${attribute_value}*%`;
  }
});

// src/gerber/commands/add_attribute_on_file.ts
import { z as z22 } from "zod";
var add_attribute_on_file = defineGerberCommand({
  command_code: "TF",
  schema: z22.object({
    command_code: z22.literal("TF").default("TF"),
    attribute_name: z22.string(),
    attribute_value: z22.string()
  }).describe("Add attribute on file: Set a file attribute."),
  stringify: ({ attribute_name, attribute_value }) => {
    return `%TF.${attribute_name},${attribute_value}*%`;
  }
});

// src/gerber/commands/add_attribute_on_object.ts
import { z as z23 } from "zod";
var add_attribute_on_object = defineGerberCommand({
  command_code: "TO",
  schema: z23.object({
    command_code: z23.literal("TO").default("TO"),
    attribute_name: z23.string(),
    attribute_value: z23.string()
  }).describe(
    "Add attribute on object: Add an object attribute to the dictionary or modify it."
  ),
  stringify: ({ attribute_name, attribute_value }) => {
    return `%TO${attribute_name},${attribute_value}*%`;
  }
});

// src/gerber/commands/aperture_block.ts
import { z as z24 } from "zod";
var aperture_block = defineGerberCommand({
  command_code: "AB",
  schema: z24.object({
    command_code: z24.literal("AB").default("AB"),
    block: z24.string()
  }).describe(
    "Aperture block: Opens a block aperture statement and assigns its aperture number or closes a block aperture statement"
  ),
  stringify() {
    return "";
  }
});

// src/gerber/commands/comment.ts
import { z as z25 } from "zod";
var comment = defineGerberCommand({
  command_code: "G04",
  schema: z25.object({
    command_code: z25.literal("G04").default("G04"),
    comment: z25.string()
  }).describe(
    "Comment: A human readable comment, does not affect the image. 4.1"
  ),
  stringify: (c) => {
    return `G04 ${c.comment}*`;
  }
});

// src/gerber/commands/create_arc.ts
import { z as z26 } from "zod";
var create_arc = defineGerberCommand({
  command_code: "G75",
  schema: z26.object({
    command_code: z26.literal("G75").default("G75")
  }).describe(
    "Create arc: A G75 must be called before creating the first arc."
  ),
  stringify() {
    return "G75*";
  }
});

// src/gerber/commands/define_aperture.ts
import { z as z27 } from "zod";
var define_aperture = defineGerberCommand({
  command_code: "AD",
  schema: z27.object({
    command_code: z27.literal("AD").default("AD"),
    aperture_code: z27.string()
  }).describe(
    "Aperture define: Defines a template-based aperture, assigns a D code to it. 4.3"
  ),
  stringify() {
    return "";
  }
});

// src/gerber/commands/define_macro_aperture_template.ts
import { z as z28 } from "zod";
var define_macro_aperture_template = defineGerberCommand({
  command_code: "AM",
  schema: z28.object({
    command_code: z28.literal("AM").default("AM"),
    macro_name: z28.string(),
    template_code: z28.string()
  }).describe("Aperture macro: Defines a macro aperture template. 4.5"),
  stringify({ macro_name, template_code }) {
    return `%AM${macro_name}*
${template_code}%`;
  }
});

// src/gerber/commands/delete_attribute.ts
import { z as z29 } from "zod";
var delete_attribute = defineGerberCommand({
  command_code: "TD",
  schema: z29.object({
    command_code: z29.literal("TD").default("TD"),
    attribute: z29.string().optional()
  }).describe(
    "Delete attribute: Attribute delete Delete one or all attributes in the dictionary."
  ),
  stringify({ attribute }) {
    if (!attribute) {
      return "%TD*%";
    }
    return `%TD${attribute}*%`;
  }
});

// src/gerber/commands/end_of_file.ts
import { z as z30 } from "zod";
var end_of_file = defineGerberCommand({
  command_code: "M02",
  schema: z30.object({
    command_code: z30.literal("M02").default("M02")
  }).describe("End of file: 4.13"),
  stringify() {
    return "M02*";
  }
});

// src/gerber/commands/end_region_statement.ts
import { z as z31 } from "zod";
var end_region_statement = defineGerberCommand({
  command_code: "G37",
  schema: z31.object({
    command_code: z31.literal("G37").default("G37")
  }).describe("End region statement: Ends the region statement"),
  stringify() {
    return "G37*";
  }
});

// src/gerber/commands/flash_operation.ts
import { z as z32 } from "zod";

// src/gerber/stringify-gerber/get-gerber-coordinate-with-padding.ts
var getGerberCoordinateWithPadding = (coordinate_mm) => {
  const coordinate_um = coordinate_mm * 1e6;
  let coordinate_str = coordinate_um.toFixed(0);
  while (coordinate_str.length < 9) {
    if (coordinate_um < 0) {
      coordinate_str = `-0${coordinate_str.slice(1)}`;
    } else {
      coordinate_str = `0${coordinate_str}`;
    }
  }
  return coordinate_str;
};

// src/gerber/commands/flash_operation.ts
var flash_operation = defineGerberCommand({
  command_code: "D03",
  schema: z32.object({
    command_code: z32.literal("D03").default("D03"),
    x: z32.number(),
    y: z32.number()
  }).describe(
    "Flash operation: Creates a flash object with the current aperture. The current point is moved to the flash point."
  ),
  stringify({ x, y }) {
    const [gx, gy] = [x, y].map(
      (coord) => getGerberCoordinateWithPadding(coord)
    );
    return `X${gx}Y${gy}D03*`;
  }
});

// src/gerber/commands/load_mirroring.ts
import { z as z33 } from "zod";
var load_mirroring = z33.object({
  command_code: z33.literal("LM"),
  mirroring: z33.string()
}).describe("Load mirroring: Loads the mirror object transformation parameter.");

// src/gerber/commands/load_polarity.ts
import { z as z34 } from "zod";
var load_polarity = z34.object({
  command_code: z34.literal("LP"),
  polarity: z34.string()
}).describe(
  "Load polarity: Loads the polarity object transformation parameter."
);

// src/gerber/commands/load_rotation.ts
import { z as z35 } from "zod";
var load_rotation = defineGerberCommand({
  command_code: "LR",
  schema: z35.object({
    command_code: z35.literal("LR").default("LR"),
    rotation_degrees: z35.number()
  }).describe(
    "Load rotation: Loads the rotation object transformation parameter."
  ),
  stringify: ({ rotation_degrees }) => {
    return `%LR${rotation_degrees}*%`;
  }
});

// src/gerber/commands/load_scaling.ts
import { z as z36 } from "zod";
var load_scaling = z36.object({
  command_code: z36.literal("LS"),
  scaling: z36.string()
}).describe("Load scaling: Loads the scale object transformation parameter.");

// src/gerber/commands/move_operation.ts
import { z as z37 } from "zod";
var move_operation = defineGerberCommand({
  command_code: "D02",
  schema: z37.object({
    command_code: z37.literal("D02").default("D02"),
    x: z37.number(),
    y: z37.number()
  }).describe(
    "Move operation: D02 moves the current point to the coordinate in the command. It does not create an object."
  ),
  stringify({ x, y }) {
    const [gx, gy] = [x, y].map(
      (coord) => getGerberCoordinateWithPadding(coord)
    );
    return `X${gx}Y${gy}D02*`;
  }
});

// src/gerber/commands/plot_operation.ts
import { z as z38 } from "zod";
var plot_operation = defineGerberCommand({
  command_code: "D01",
  schema: z38.object({
    command_code: z38.literal("D01").default("D01"),
    x: z38.number(),
    y: z38.number(),
    i: z38.number().optional(),
    j: z38.number().optional()
  }).describe(
    "Plot operation: Outside a region statement D01 creates a draw or arc object with the current aperture. Inside it adds a draw/arc segment to the contour under construction. The current point is moved to draw/arc end point after the creation of the draw/arc."
  ),
  stringify({ x, y, i, j }) {
    const gx = getGerberCoordinateWithPadding(x);
    const gy = getGerberCoordinateWithPadding(y);
    let cmd = `X${gx}Y${gy}`;
    if (i !== void 0 && j !== void 0) {
      const gi = getGerberCoordinateWithPadding(i);
      const gj = getGerberCoordinateWithPadding(j);
      cmd += `I${gi}J${gj}`;
    }
    return `${cmd}D01*`;
  }
});

// src/gerber/commands/set_coordinate_format.ts
import { z as z39 } from "zod";
var set_coordinate_format = z39.object({
  command_code: z39.literal("FS"),
  format: z39.string()
}).describe("Sets the coordinate format, e.g. the number of decimals.");

// src/gerber/commands/set_current_aperture_d_code.ts
import { z as z40 } from "zod";
var set_current_aperture_d_code = z40.object({
  command_code: z40.literal("Dnn"),
  d_code: z40.string()
}).describe("(nn\u226510) Sets the current aperture to D code nn. 4.6");

// src/gerber/commands/set_movement_mode_to_clockwise_circular.ts
import { z as z41 } from "zod";
var set_movement_mode_to_clockwise_circular = defineGerberCommand({
  command_code: "G02",
  schema: z41.object({
    command_code: z41.literal("G02").default("G02")
  }).describe(
    "Set movement mode to clockwise circular: Sets linear/circular mode to clockwise circular."
  ),
  stringify() {
    return "G02*";
  }
});

// src/gerber/commands/set_movement_mode_to_counterclockwise_circular.ts
import { z as z42 } from "zod";
var set_movement_mode_to_counterclockwise_circular = defineGerberCommand({
  command_code: "G03",
  // Add the missing command_code property
  schema: z42.object({
    command_code: z42.literal("G03").default("G03")
  }).describe(
    "Set movement mode to counterclockwise circular: Sets linear/circular mode to counterclockwise circular."
  ),
  stringify() {
    return "G03*";
  }
});

// src/gerber/commands/set_movement_mode_to_linear.ts
import { z as z43 } from "zod";
var set_movement_mode_to_linear = defineGerberCommand({
  command_code: "G01",
  schema: z43.object({
    command_code: z43.literal("G01").default("G01")
  }).describe(
    "Set movement mode to linear: Sets linear/circular mode to linear."
  ),
  stringify() {
    return "G01*";
  }
});

// src/gerber/commands/set_unit.ts
import { z as z44 } from "zod";
var set_unit = defineGerberCommand({
  command_code: "MO",
  schema: z44.object({
    command_code: z44.literal("MO").default("MO"),
    unit: z44.enum(["MM", "in"])
  }).describe("Mode: Sets the unit to mm or inch. 4.2.1"),
  stringify({ unit }) {
    return `%MO${unit}*%`;
  }
});

// src/gerber/commands/start_region_statement.ts
import { z as z45 } from "zod";
var start_region_statement = defineGerberCommand({
  command_code: "G36",
  schema: z45.object({
    command_code: z45.literal("G36").default("G36")
  }).describe(
    "Start region statement: Starts a region statement which creates a region by defining its contours."
  ),
  stringify() {
    return "G36*";
  }
});

// src/gerber/commands/step_and_repeat.ts
import { z as z46 } from "zod";
var step_and_repeat = z46.object({
  command_code: z46.literal("SR"),
  statement: z46.string()
}).describe("Step and repeat: Open or closes a step and repeat statement.");

// src/gerber/commands/format_specification.ts
import { z as z47 } from "zod";
var format_specification = defineGerberCommand({
  command_code: "FS",
  schema: z47.object({
    command_code: z47.literal("FS").default("FS"),
    zero_omission_mode: z47.union([z47.literal("L").describe("leading zeros omitted"), z47.literal("T")]).nullable().default(null),
    coordinate_notation: z47.union([
      z47.literal("A").describe("absolute notation"),
      z47.literal("I").describe("incremental notation")
    ]).default("A"),
    x_integer_digits: z47.number().int().default(4),
    x_decimal_digits: z47.number().int().default(6),
    y_integer_digits: z47.number().int().default(4),
    y_decimal_digits: z47.number().int().default(6)
  }),
  stringify: () => {
    return "%FSLAX46Y46*%";
  }
});

// src/gerber/commands/set_layer_polarity.ts
import { z as z48 } from "zod";
var set_layer_polarity = defineGerberCommand({
  command_code: "LP",
  schema: z48.object({
    command_code: z48.literal("LP").default("LP"),
    polarity: z48.enum(["D", "C"])
  }).describe(
    "Layer Polarity: Sets the layer polarity to dark or clear. 4.2.1"
  ),
  stringify({ polarity }) {
    return `%LP${polarity}*%`;
  }
});

// src/gerber/commands/define_aperture_template.ts
import { z as z49 } from "zod";
var circle_template = z49.object({
  standard_template_code: z49.literal("C").describe("circle"),
  diameter: z49.number(),
  hole_diameter: z49.number().optional()
});
var rectangle_template = z49.object({
  standard_template_code: z49.literal("R").describe("rectangle"),
  x_size: z49.number(),
  y_size: z49.number(),
  hole_diameter: z49.number().optional()
});
var obround_template = z49.object({
  standard_template_code: z49.literal("O").describe("obround"),
  x_size: z49.number(),
  y_size: z49.number(),
  hole_diameter: z49.number().optional()
});
var polygon_template = z49.object({
  standard_template_code: z49.literal("P").describe("polygon"),
  outer_diameter: z49.number(),
  number_of_vertices: z49.number().int(),
  rotation: z49.number().optional(),
  hole_diameter: z49.number().optional()
});
var standard_aperture_template_config = z49.discriminatedUnion(
  "standard_template_code",
  [circle_template, rectangle_template, obround_template, polygon_template]
);
var horz_pill_template = z49.object({
  macro_name: z49.literal("HORZPILL"),
  x_size: z49.number(),
  y_size: z49.number(),
  circle_diameter: z49.number(),
  circle_center_offset: z49.number()
});
var vert_pill_template = z49.object({
  macro_name: z49.literal("VERTPILL"),
  x_size: z49.number(),
  y_size: z49.number(),
  circle_diameter: z49.number(),
  circle_center_offset: z49.number()
});
var roundrect_template = z49.object({
  macro_name: z49.literal("ROUNDRECT"),
  corner_radius: z49.number(),
  corner_1_x: z49.number(),
  corner_1_y: z49.number(),
  corner_2_x: z49.number(),
  corner_2_y: z49.number(),
  corner_3_x: z49.number(),
  corner_3_y: z49.number(),
  corner_4_x: z49.number(),
  corner_4_y: z49.number()
});
var macro_aperture_template_config = z49.discriminatedUnion("macro_name", [
  horz_pill_template,
  vert_pill_template,
  roundrect_template
]);
var aperture_template_config = z49.union([
  standard_aperture_template_config,
  macro_aperture_template_config
]);
var define_aperture_template = defineGerberCommand({
  command_code: "ADD",
  schema: aperture_template_config.and(
    z49.object({
      command_code: z49.literal("ADD").default("ADD"),
      aperture_number: z49.number().int()
    })
  ),
  stringify(props) {
    if ("macro_name" in props) {
      const { aperture_number, macro_name } = props;
      let commandString = `%ADD${aperture_number}${macro_name},`;
      if (macro_name === "HORZPILL" || macro_name === "VERTPILL") {
        commandString += `${props.x_size.toFixed(6)}X${props.y_size.toFixed(6)}X${props.circle_diameter.toFixed(6)}X${props.circle_center_offset.toFixed(6)}`;
      } else if (macro_name === "ROUNDRECT") {
        commandString += [
          props.corner_radius,
          props.corner_1_x,
          props.corner_1_y,
          props.corner_2_x,
          props.corner_2_y,
          props.corner_3_x,
          props.corner_3_y,
          props.corner_4_x,
          props.corner_4_y
        ].map((value) => value.toFixed(6)).join("X");
      }
      commandString += "*%";
      return commandString;
    }
    if ("standard_template_code" in props) {
      const { aperture_number, standard_template_code } = props;
      let commandString = `%ADD${aperture_number}${standard_template_code},`;
      if (standard_template_code === "C") {
        commandString += `${props.diameter.toFixed(6)}`;
      } else if (standard_template_code === "R" || standard_template_code === "O") {
        commandString += `${props.x_size.toFixed(6)}X${props.y_size.toFixed(6)}`;
      } else if (standard_template_code === "P") {
        commandString += `${props.outer_diameter}X${props.number_of_vertices}X${props.rotation ? `X${props.rotation}` : ""}`;
      }
      if (props.hole_diameter) {
        commandString += `X${props.hole_diameter.toFixed(6)}`;
      }
      commandString += "*%";
      return commandString;
    }
    throw new Error(
      `Invalid aperture template config: ${JSON.stringify(props)}`
    );
  }
});

// src/gerber/commands/select_aperture.ts
import { z as z50 } from "zod";
var select_aperture = defineGerberCommand({
  command_code: "D",
  schema: z50.object({
    command_code: z50.literal("D").default("D"),
    aperture_number: z50.number().int()
  }),
  stringify({ aperture_number }) {
    return `D${aperture_number}*`;
  }
});

// src/gerber/any_gerber_command.ts
var gerber_command_map = {
  add_attribute_on_aperture,
  add_attribute_on_file,
  add_attribute_on_object,
  aperture_block,
  comment,
  create_arc,
  define_aperture,
  define_macro_aperture_template,
  delete_attribute,
  end_of_file,
  move_operation,
  flash_operation,
  end_region_statement,
  format_specification,
  // load_mirroring,
  // load_polarity,
  load_rotation,
  // load_scaling,
  plot_operation,
  // set_coordinate_format,
  // set_current_aperture_d_code,
  define_aperture_template,
  set_movement_mode_to_clockwise_circular,
  set_movement_mode_to_counterclockwise_circular,
  set_movement_mode_to_linear,
  select_aperture,
  set_unit,
  set_layer_polarity,
  start_region_statement
  // step_and_repeat,
};

// src/gerber/gerber-builder.ts
var gerberBuilder = () => new GerberBuilder();
var GerberBuilder = class {
  commands;
  constructor() {
    this.commands = [];
  }
  $if(condition, fn) {
    if (condition) {
      return fn(this);
    }
    return this;
  }
  add(cmd, props) {
    this.commands.push({
      ...{ command_code: gerber_command_map[cmd].command_code },
      ...props
    });
    return this;
  }
  build() {
    return this.commands;
  }
};

// src/gerber/stringify-gerber/stringify-gerber-command.ts
var stringifyGerberCommand = (command) => {
  const command_def = Object.values(gerber_command_map).find(
    (cmd) => cmd.command_code === command.command_code
  );
  if (!command_def) {
    throw new Error(
      `Command for command_code:"${command.command_code}" not found`
    );
  }
  if (!command_def.stringify) {
    throw new Error(
      `Command for command_code:"${command.command_code}" does not have a stringify method`
    );
  }
  return command_def.stringify(command);
};

// src/gerber/stringify-gerber/stringify-gerber-command-layers.ts
var stringifyGerberCommandLayers = (commandLayers) => {
  const stringifiedCommandLayers = {};
  for (const layerName of Object.keys(commandLayers)) {
    stringifiedCommandLayers[layerName] = commandLayers[layerName].map((command) => {
      return stringifyGerberCommand(command);
    }).join("\n");
  }
  return stringifiedCommandLayers;
};

// src/gerber/stringify-gerber/stringify-gerber-commands.ts
var stringifyGerberCommands = (commands) => {
  return commands.map((command) => {
    return stringifyGerberCommand(command);
  }).join("\n");
};

// src/gerber/utils/pairs.ts
function pairs(arr) {
  const result = [];
  for (let i = 0; i < arr.length - 1; i++) {
    result.push([arr[i], arr[i + 1]]);
  }
  return result;
}

// src/gerber/convert-soup-to-gerber-commands/define-common-macros.ts
var defineCommonMacros = (glayer) => {
  glayer.push(
    ...gerberBuilder().add("comment", { comment: "APERTURE MACROS START" }).add("define_macro_aperture_template", {
      macro_name: "HORZPILL",
      template_code: `
0 Horizontal pill (stadium) shape macro*
0 Parameters:*
0 $1 = Total width*
0 $2 = Total height*
0 $3 = Circle diameter (equal to height)*
0 $4 = Circle center offset
0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
0 1 = Circle(Exposure, Diameter, Center X, Center Y, Rotation)*
21,1,$1-$3,$2,0.0,0.0,0.0*
1,1,$3,0.0-$4,0.0*
1,1,$3,$4,0.0*
`.trim()
    }).add("define_macro_aperture_template", {
      macro_name: "VERTPILL",
      template_code: `
0 Vertical pill (stadium) shape macro*
0 Parameters:*
0 $1 = Total width*
0 $2 = Total height*
0 $3 = Circle diameter (equal to width)*
0 $4 = Circle center offset
0 21 = Center Line(Exposure, Width, Height, Center X, Center Y, Rotation)*
21,1,$1,$2-$3,0.0,0.0,0.0*
1,1,$3,0.0,0.0-$4*
1,1,$3,0.0,$4*
`.trim()
    }).add("define_macro_aperture_template", {
      macro_name: "ROUNDRECT",
      template_code: `
0 Rectangle with rounded corners*
0 $1 Corner radius*
0 $2 $3 $4 $5 $6 $7 $8 $9 X,Y Position of each corner*
0 Polygon box body*
4,1,4,$2,$3,$4,$5,$6,$7,$8,$9,$2,$3,0*
0 Circles for rounded corners*
1,1,$1+$1,$2,$3*
1,1,$1+$1,$4,$5*
1,1,$1+$1,$6,$7*
1,1,$1+$1,$8,$9*
0 Rectangles between the rounded corners*
20,1,$1+$1,$2,$3,$4,$5,0*
20,1,$1+$1,$4,$5,$6,$7,0*
20,1,$1+$1,$6,$7,$8,$9,0*
20,1,$1+$1,$8,$9,$2,$3,0*
`.trim()
    }).add("comment", { comment: "APERTURE MACROS END" }).build()
  );
};

// src/gerber/convert-soup-to-gerber-commands/defineAperturesForLayer.ts
import stableStringify from "fast-json-stable-stringify";

// src/gerber/convert-soup-to-gerber-commands/getAllTraceWidths.ts
function getAllTraceWidths(soup) {
  const pcb_traces = soup.filter(
    (elm) => elm.type === "pcb_trace"
  );
  const widths = {};
  for (const trace of pcb_traces) {
    for (const segment of trace.route) {
      if (segment.route_type === "wire") {
        widths[segment.layer] = widths[segment.layer] || /* @__PURE__ */ new Set();
        widths[segment.layer].add(segment.width);
      } else if (segment.route_type === "through_pad") {
        for (const layer of [segment.start_layer, segment.end_layer]) {
          if (typeof layer === "string" && typeof segment.width === "number") {
            widths[layer] = widths[layer] || /* @__PURE__ */ new Set();
            widths[layer].add(segment.width);
          }
        }
      }
    }
  }
  return {
    top: Array.from(widths.top || []),
    inner1: Array.from(widths.inner1 || []),
    inner2: Array.from(widths.inner2 || []),
    inner3: Array.from(widths.inner3 || []),
    inner4: Array.from(widths.inner4 || []),
    inner5: Array.from(widths.inner5 || []),
    inner6: Array.from(widths.inner6 || []),
    bottom: Array.from(widths.bottom || [])
  };
}

// src/gerber/convert-soup-to-gerber-commands/defineAperturesForLayer.ts
var getLayerRefFromGerberLayerName = (glayer_name) => {
  if (glayer_name.startsWith("F_")) return "top";
  if (glayer_name.startsWith("B_")) return "bottom";
  const innerLayerMatch = glayer_name.match(/^In([1-6])_/);
  if (innerLayerMatch) return `inner${innerLayerMatch[1]}`;
  throw new Error(`Could not infer layer ref from ${glayer_name}`);
};
var getClampedRoundedRectCornerRadius = (width, height, cornerRadius) => {
  if (typeof cornerRadius !== "number") return 0;
  return Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
};
var getRoundedRectApertureConfig = (width, height, cornerRadius) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
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
    corner_4_y: -halfHeight + cornerRadius
  };
};
function defineAperturesForLayer({
  glayer,
  circuitJson,
  glayer_name
}) {
  const getNextApertureNumber = () => {
    const highest_aperture_number = glayer.reduce((acc, command) => {
      if (command.command_code === "ADD") {
        return Math.max(acc, command.aperture_number);
      }
      return acc;
    }, 0);
    if (highest_aperture_number === 0) {
      return 10;
    }
    return highest_aperture_number + 1;
  };
  glayer.push(
    ...gerberBuilder().add("comment", { comment: "aperture START LIST" }).build()
  );
  const traceWidths = getAllTraceWidths(circuitJson);
  const layerRef = getLayerRefFromGerberLayerName(glayer_name);
  for (const width of traceWidths[layerRef]) {
    glayer.push(
      ...gerberBuilder().add("define_aperture_template", {
        aperture_number: getNextApertureNumber(),
        standard_template_code: "C",
        diameter: width
      }).build()
    );
  }
  const apertureConfigs = getAllApertureTemplateConfigsForLayer({
    circuitJson,
    layer: layerRef,
    glayer_name
  });
  for (const apertureConfig of apertureConfigs) {
    glayer.push(
      ...gerberBuilder().add("define_aperture_template", {
        aperture_number: getNextApertureNumber(),
        ...apertureConfig
      }).build()
    );
  }
  glayer.push(
    ...gerberBuilder().add("delete_attribute", {}).add("comment", { comment: "aperture END LIST" }).build()
  );
}
var REGION_APERTURE_CONFIG = {
  standard_template_code: "C",
  diameter: 1e-3
};
var getApertureConfigFromPcbSmtpad = (elm) => {
  if (elm.shape === "rect" || elm.shape === "rotated_rect") {
    const cornerRadius = getClampedRoundedRectCornerRadius(
      elm.width,
      elm.height,
      "corner_radius" in elm ? elm.corner_radius : void 0
    );
    if (cornerRadius > 0) {
      return getRoundedRectApertureConfig(elm.width, elm.height, cornerRadius);
    }
  }
  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height
    };
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2
    };
  }
  if (elm.shape === "rotated_rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height
    };
  }
  if (elm.shape === "pill" || elm.shape === "rotated_pill") {
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbSmtpad: missing dimensions"
      );
    }
    return {
      standard_template_code: "C",
      diameter: Math.min(elm.width, elm.height)
    };
  }
  if (elm.shape === "polygon") {
    throw new Error("Polygon SMT pads are drawn as regions, not apertures");
  }
  throw new Error(`Unsupported shape ${elm.shape}`);
};
var getApertureConfigFromPcbSmtpadSoldermask = (elm) => {
  let soldermaskMargin = 0;
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin;
  }
  if (elm.shape === "rect" || elm.shape === "rotated_rect") {
    const width = elm.width + soldermaskMargin * 2;
    const height = elm.height + soldermaskMargin * 2;
    const cornerRadius = getClampedRoundedRectCornerRadius(
      width,
      height,
      "corner_radius" in elm && typeof elm.corner_radius === "number" ? elm.corner_radius + soldermaskMargin : void 0
    );
    if (cornerRadius > 0) {
      return getRoundedRectApertureConfig(width, height, cornerRadius);
    }
  }
  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width + soldermaskMargin * 2,
      y_size: elm.height + soldermaskMargin * 2
    };
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2 + soldermaskMargin * 2
    };
  }
  if (elm.shape === "rotated_rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width + soldermaskMargin * 2,
      y_size: elm.height + soldermaskMargin * 2
    };
  }
  if (elm.shape === "pill" || elm.shape === "rotated_pill") {
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbSmtpadSoldermask: missing dimensions"
      );
    }
    const width = elm.width + soldermaskMargin * 2;
    const height = elm.height + soldermaskMargin * 2;
    return {
      standard_template_code: "C",
      diameter: Math.min(width, height)
    };
  }
  if (elm.shape === "polygon") {
    throw new Error("Polygon SMT pads are drawn as regions, not apertures");
  }
  throw new Error(`Unsupported shape ${elm.shape}`);
};
var getApertureConfigFromPcbSilkscreenPath = (elm) => {
  if ("stroke_width" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.stroke_width
    };
  }
  throw new Error(`Provide stroke_width for: ${elm}`);
};
var getApertureConfigFromPcbSilkscreenText = (elm) => {
  if ("font_size" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.font_size / 8
      // font size and diamater have different units of measurement
    };
  }
  throw new Error(`Provide font_size for: ${elm}`);
};
var getApertureConfigFromPcbCopperText = (elm) => {
  if ("font_size" in elm) {
    return {
      standard_template_code: "C",
      diameter: elm.font_size / 8
      // font size and diamater have different units of measurement
    };
  }
  throw new Error(`Provide font_size for: ${elm}`);
};
var getApertureConfigFromPcbSolderPaste = (elm) => {
  if (elm.shape === "rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height
    };
  }
  if (elm.shape === "rotated_rect") {
    return {
      standard_template_code: "R",
      x_size: elm.width,
      y_size: elm.height
    };
  }
  if (elm.shape === "circle") {
    return {
      standard_template_code: "C",
      diameter: elm.radius * 2
    };
  }
  if (elm.shape === "pill") {
    if (!("width" in elm && "height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHole: missing dimensions"
      );
    }
    if (elm.width >= elm.height) {
      return {
        macro_name: "HORZPILL",
        x_size: elm.width,
        y_size: elm.height,
        circle_diameter: Math.min(elm.width, elm.height),
        circle_center_offset: (elm.width - elm.height) / 2
      };
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.width,
      y_size: elm.height,
      circle_diameter: Math.min(elm.width, elm.height),
      circle_center_offset: (elm.height - elm.width) / 2
    };
  }
  throw new Error(`Unsupported shape ${elm.shape}`);
};
var getApertureConfigFromPcbPlatedHole = (elm) => {
  if (elm.shape === "circle") {
    if (!("outer_diameter" in elm && "hole_diameter" in elm)) {
      throw new Error(
        "Invalid circle shape in getApertureConfigFromPcbPlatedHole: missing diameters"
      );
    }
    return {
      standard_template_code: "C",
      diameter: elm.outer_diameter
    };
  }
  if (elm.shape === "pill") {
    if (!("outer_width" in elm && "outer_height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHole: missing dimensions"
      );
    }
    if (elm.outer_width > elm.outer_height) {
      return {
        macro_name: "HORZPILL",
        x_size: elm.outer_width,
        y_size: elm.outer_height,
        circle_diameter: Math.min(elm.outer_width, elm.outer_height),
        circle_center_offset: (elm.outer_width - elm.outer_height) / 2
      };
    }
    return {
      macro_name: "VERTPILL",
      x_size: elm.outer_width,
      y_size: elm.outer_height,
      circle_diameter: Math.min(elm.outer_width, elm.outer_height),
      circle_center_offset: (elm.outer_height - elm.outer_width) / 2
    };
  }
  const shape = elm.shape;
  if (shape === "circular_hole_with_rect_pad" || shape === "pill_hole_with_rect_pad" || shape === "rotated_pill_hole_with_rect_pad") {
    if (!("rect_pad_width" in elm && "rect_pad_height" in elm)) {
      throw new Error(
        `Invalid ${shape} shape in getApertureConfigFromPcbPlatedHole: missing dimensions`
      );
    }
    return {
      standard_template_code: "R",
      x_size: elm.rect_pad_width,
      y_size: elm.rect_pad_height
    };
  }
  throw new Error(
    `Unsupported shape in getApertureConfigFromPcbPlatedHole: ${elm.shape}`
  );
};
var getApertureConfigFromPcbPlatedHoleSoldermask = (elm) => {
  let soldermaskMargin = 0;
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin;
  }
  if (elm.shape === "circle") {
    if (!("outer_diameter" in elm && "hole_diameter" in elm)) {
      throw new Error(
        "Invalid circle shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing diameters"
      );
    }
    return {
      standard_template_code: "C",
      diameter: elm.outer_diameter + soldermaskMargin * 2
    };
  }
  if (elm.shape === "pill") {
    if (!("outer_width" in elm && "outer_height" in elm)) {
      throw new Error(
        "Invalid pill shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing dimensions"
      );
    }
    const outerWidth = elm.outer_width + soldermaskMargin * 2;
    const outerHeight = elm.outer_height + soldermaskMargin * 2;
    if (outerWidth > outerHeight) {
      return {
        macro_name: "HORZPILL",
        x_size: outerWidth,
        y_size: outerHeight,
        circle_diameter: Math.min(outerWidth, outerHeight),
        circle_center_offset: (outerWidth - outerHeight) / 2
      };
    }
    return {
      macro_name: "VERTPILL",
      x_size: outerWidth,
      y_size: outerHeight,
      circle_diameter: Math.min(outerWidth, outerHeight),
      circle_center_offset: (outerHeight - outerWidth) / 2
    };
  }
  const shape = elm.shape;
  if (shape === "circular_hole_with_rect_pad" || shape === "pill_hole_with_rect_pad" || shape === "rotated_pill_hole_with_rect_pad") {
    if (!("rect_pad_width" in elm && "rect_pad_height" in elm)) {
      throw new Error(
        `Invalid ${shape} shape in getApertureConfigFromPcbPlatedHoleSoldermask: missing dimensions`
      );
    }
    return {
      standard_template_code: "R",
      x_size: elm.rect_pad_width + soldermaskMargin * 2,
      y_size: elm.rect_pad_height + soldermaskMargin * 2
    };
  }
  throw new Error(
    `Unsupported shape in getApertureConfigFromPcbPlatedHoleSoldermask: ${elm.shape}`
  );
};
var getApertureConfigFromCirclePcbHole = (elm) => {
  if (!("hole_diameter" in elm)) {
    throw new Error(
      `Invalid shape called in getApertureConfigFromCirclePcbHole: ${elm.hole_shape}`
    );
  }
  return {
    standard_template_code: "C",
    diameter: elm.hole_diameter
  };
};
var getApertureConfigFromCirclePcbHoleSoldermask = (elm) => {
  if (!("hole_diameter" in elm)) {
    throw new Error(
      `Invalid shape called in getApertureConfigFromCirclePcbHoleSoldermask: ${elm.hole_shape}`
    );
  }
  let soldermaskMargin = 0;
  if ("soldermask_margin" in elm && typeof elm.soldermask_margin === "number") {
    soldermaskMargin = elm.soldermask_margin;
  }
  return {
    standard_template_code: "C",
    diameter: elm.hole_diameter + soldermaskMargin * 2
  };
};
var getApertureConfigFromOuterDiameter = (elm) => {
  if (typeof elm.outer_diameter !== "number") {
    throw new Error(
      "outer_diameter not specified in getApertureConfigFromOuterDiameter"
    );
  }
  return {
    standard_template_code: "C",
    diameter: elm.outer_diameter
  };
};
function getAllApertureTemplateConfigsForLayer({
  circuitJson,
  layer,
  glayer_name
}) {
  const configs = [];
  const configHashMap = /* @__PURE__ */ new Set();
  const isSoldermaskLayer = glayer_name.endsWith("_Mask");
  const isCopperLayer = glayer_name.endsWith("_Cu");
  const addConfigIfNew = (config) => {
    const hash = stableStringify(config);
    if (!configHashMap.has(hash)) {
      configs.push(config);
      configHashMap.add(hash);
    }
  };
  for (const elm of circuitJson) {
    if (elm.type === "pcb_smtpad") {
      if (elm.layer === layer && elm.shape !== "polygon") {
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromPcbSmtpadSoldermask(elm));
        } else {
          addConfigIfNew(getApertureConfigFromPcbSmtpad(elm));
        }
      }
    } else if (elm.type === "pcb_solder_paste") {
      if (elm.layer === layer) {
        addConfigIfNew(getApertureConfigFromPcbSolderPaste(elm));
        if (elm.shape === "pill") {
          addConfigIfNew(
            getApertureConfigFromPcbSolderPaste({
              ...elm,
              width: elm.height,
              height: elm.width
            })
          );
        }
      }
    } else if (elm.type === "pcb_plated_hole") {
      if (elm.layers.includes(layer)) {
        if (elm.shape === "hole_with_polygon_pad") {
          continue;
        }
        if (glayer_name.endsWith("_Mask") && elm.is_covered_with_solder_mask === true) {
          continue;
        }
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromPcbPlatedHoleSoldermask(elm));
        } else {
          addConfigIfNew(getApertureConfigFromPcbPlatedHole(elm));
        }
      }
    } else if (elm.type === "pcb_hole") {
      if (glayer_name.endsWith("_Mask") && elm.is_covered_with_solder_mask === true) {
        continue;
      }
      if (elm.hole_shape === "circle") {
        if (isSoldermaskLayer) {
          addConfigIfNew(getApertureConfigFromCirclePcbHoleSoldermask(elm));
        } else {
          addConfigIfNew(getApertureConfigFromCirclePcbHole(elm));
        }
      } else
        console.warn("NOT IMPLEMENTED: drawing gerber for non circle holes");
    } else if (elm.type === "pcb_via") {
      addConfigIfNew(getApertureConfigFromOuterDiameter(elm));
    } else if (elm.type === "pcb_trace") {
      for (const point of elm.route) {
        if (point.route_type === "via" && typeof point.outer_diameter === "number" && (point.from_layer === layer || point.to_layer === layer)) {
          addConfigIfNew(getApertureConfigFromOuterDiameter(point));
        }
      }
    } else if (elm.type === "pcb_silkscreen_path")
      addConfigIfNew(getApertureConfigFromPcbSilkscreenPath(elm));
    else if (elm.type === "pcb_silkscreen_text")
      addConfigIfNew(getApertureConfigFromPcbSilkscreenText(elm));
    else if (elm.type === "pcb_copper_text") {
      if (elm.layer === layer)
        addConfigIfNew(getApertureConfigFromPcbCopperText(elm));
    }
  }
  const needsRegionAperture = circuitJson.some((elm) => {
    if (elm.type === "pcb_copper_pour") {
      if (elm.layer !== layer) return false;
      if (isCopperLayer) return true;
      return isSoldermaskLayer && elm.covered_with_solder_mask === false;
    }
    if (elm.type === "pcb_smtpad" && elm.shape === "polygon") {
      if (elm.layer !== layer) return false;
      if (isCopperLayer) return true;
      return isSoldermaskLayer && elm.is_covered_with_solder_mask !== true;
    }
    if (elm.type === "pcb_plated_hole" && elm.shape === "hole_with_polygon_pad") {
      if (!elm.layers.includes(layer)) return false;
      if (isCopperLayer) return true;
      return isSoldermaskLayer && elm.is_covered_with_solder_mask !== true;
    }
    return false;
  });
  if (needsRegionAperture) {
    addConfigIfNew(REGION_APERTURE_CONFIG);
  }
  return configs;
}

// src/gerber/convert-soup-to-gerber-commands/findApertureNumber.ts
var findApertureNumber = (glayer, search_params) => {
  let aperture;
  if ("trace_width" in search_params) {
    const trace_width = search_params.trace_width;
    aperture = glayer.find(
      (command) => "standard_template_code" in command && command.command_code === "ADD" && command.standard_template_code === "C" && command.diameter === trace_width
    );
  } else if ("standard_template_code" in search_params || "macro_name" in search_params) {
    aperture = glayer.find(
      (command) => command.command_code === "ADD" && Object.keys(search_params).every(
        (param_name) => command[param_name] === search_params[param_name]
      )
    );
  }
  if (!aperture) {
    throw new Error(
      `Aperture not found for search params ${JSON.stringify(search_params)}`
    );
  }
  return aperture.aperture_number;
};

// package.json
var package_default = {
  name: "circuit-json-to-gerber",
  version: "0.0.76",
  main: "dist/index.js",
  type: "module",
  scripts: {
    build: "tsup-node src/index.ts src/cli.ts --format esm --dts --sourcemap",
    format: "biome format --write .",
    "format:check": "biome format .",
    start: "bun --bun site/index.html",
    "build:site": "bun build site/index.html --outdir ./site-export"
  },
  files: [
    "dist"
  ],
  bin: {
    "circuit-to-gerber": "./dist/cli.js"
  },
  devDependencies: {
    "@biomejs/biome": "^1.8.3",
    "@types/archiver": "^6.0.3",
    "@types/bun": "^1.1.8",
    "@types/node": "^22.5.2",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.1.5",
    archiver: "^7.0.1",
    "bun-match-svg": "^0.0.13",
    "circuit-json": "^0.0.426",
    commander: "^12.1.0",
    "gerber-to-svg": "^4.2.8",
    gerberts: "^0.0.3",
    jszip: "^3.10.1",
    "pcb-stackup": "^4.2.8",
    react: "^19.2.1",
    "react-dom": "^19.2.1",
    tscircuit: "^0.0.1776",
    tsup: "^8.2.4"
  },
  peerDependencies: {
    typescript: "^5.0.0",
    tscircuit: "*",
    "circuit-json": "*"
  },
  dependencies: {
    "@tscircuit/alphabet": "^0.0.25",
    "fast-json-stable-stringify": "^2.1.0",
    "transformation-matrix": "^3.0.0"
  }
};

// src/gerber/convert-soup-to-gerber-commands/getCommandHeaders.ts
var layerAndTypeToFileFunction = {
  "top-copper": "Copper,L1,Top",
  "top-soldermask": "Soldermask,Top",
  "bottom-soldermask": "Soldermask,Bot",
  "top-silkscreen": "Legend,Top",
  "bottom-silkscreen": "Legend,Bot",
  "top-paste": "Paste,Top",
  "bottom-paste": "Paste,Bot",
  edgecut: "Profile,NP"
};
var getCopperLayerNumber = (layer, total_layer_count) => {
  if (layer === "top") return 1;
  if (layer === "bottom") return total_layer_count;
  return Number(layer.replace("inner", "")) + 1;
};
var getCommandHeaders = (opts) => {
  const total_layer_count = opts.total_layer_count ?? 2;
  let file_function;
  if (opts.layer_type === "copper" && opts.layer !== "edgecut") {
    const layerNumber = getCopperLayerNumber(opts.layer, total_layer_count);
    const layerPosition = opts.layer === "top" ? "Top" : opts.layer === "bottom" ? "Bot" : "Inr";
    file_function = `Copper,L${layerNumber},${layerPosition}`;
  } else {
    file_function = layerAndTypeToFileFunction[opts.layer_type ? `${opts.layer}-${opts.layer_type}` : opts.layer];
  }
  return gerberBuilder().add("add_attribute_on_file", {
    attribute_name: "GenerationSoftware",
    attribute_value: `tscircuit,circuit-json-to-gerber,${package_default.version}`
  }).add("add_attribute_on_file", {
    attribute_name: "CreationDate",
    attribute_value: (/* @__PURE__ */ new Date()).toISOString()
  }).add("add_attribute_on_file", {
    attribute_name: "SameCoordinates",
    attribute_value: "Original"
  }).add("add_attribute_on_file", {
    attribute_name: "FileFunction",
    attribute_value: file_function
  }).$if(
    opts.layer !== "edgecut",
    (gb) => gb.add("add_attribute_on_file", {
      attribute_name: "FilePolarity",
      attribute_value: opts.layer_type === "soldermask" ? "Negative" : "Positive"
    })
  ).add("format_specification", {}).add("set_unit", {
    unit: "MM"
  }).add("comment", {
    comment: "Gerber Fmt 4.6, Leading zero omitted, Abs format (unit mm)"
  }).add("comment", {
    comment: `Created by tscircuit (builder) date ${(/* @__PURE__ */ new Date()).toISOString()}`
  }).add("set_movement_mode_to_linear", {}).add("set_layer_polarity", {
    polarity: "D"
  }).add("create_arc", {}).build();
};

// src/gerber/convert-soup-to-gerber-commands/getGerberLayerName.ts
var layerRefToGerberPrefix = {
  top: "F_",
  bottom: "B_",
  inner1: "In1_",
  inner2: "In2_",
  inner3: "In3_",
  inner4: "In4_",
  inner5: "In5_",
  inner6: "In6_"
};
var layerTypeToGerberSuffix = {
  copper: "Cu",
  silkscreen: "SilkScreen",
  soldermask: "Mask",
  mask: "Mask",
  paste: "Paste"
};
var getGerberLayerName = (layer_ref, layer_type) => {
  if (layer_ref === "edgecut") return "Edge_Cuts";
  if (layer_ref.startsWith("inner") && layer_type !== "copper") {
    throw new Error(`Inner layer ${layer_ref} only supports copper gerbers`);
  }
  return `${layerRefToGerberPrefix[layer_ref]}${layerTypeToGerberSuffix[layer_type]}`;
};

// src/gerber/convert-soup-to-gerber-commands/offsetPolygonOutline.ts
var getSignedPolygonArea = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
};
var getLineIntersection = (lineA, lineB) => {
  const ax = lineA.end.x - lineA.start.x;
  const ay = lineA.end.y - lineA.start.y;
  const bx = lineB.end.x - lineB.start.x;
  const by = lineB.end.y - lineB.start.y;
  const denominator = ax * by - ay * bx;
  if (Math.abs(denominator) < 1e-9) {
    return null;
  }
  const cx = lineB.start.x - lineA.start.x;
  const cy = lineB.start.y - lineA.start.y;
  const t = (cx * by - cy * bx) / denominator;
  return {
    x: lineA.start.x + ax * t,
    y: lineA.start.y + ay * t
  };
};
var offsetPolygonOutline = (points, offset) => {
  if (points.length < 3 || offset === 0) {
    return points;
  }
  const isCounterClockwise = getSignedPolygonArea(points) > 0;
  const shiftedEdges = [];
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1e-9) {
      continue;
    }
    let normalX = -dy / length;
    let normalY = dx / length;
    if (isCounterClockwise) {
      normalX = dy / length;
      normalY = -dx / length;
    }
    shiftedEdges.push({
      start: {
        x: start.x + normalX * offset,
        y: start.y + normalY * offset
      },
      end: {
        x: end.x + normalX * offset,
        y: end.y + normalY * offset
      }
    });
  }
  if (shiftedEdges.length < 3) {
    return points;
  }
  const offsetPoints = [];
  for (let i = 0; i < shiftedEdges.length; i++) {
    const previousEdge = shiftedEdges[(i - 1 + shiftedEdges.length) % shiftedEdges.length];
    const currentEdge = shiftedEdges[i];
    const intersection = getLineIntersection(previousEdge, currentEdge);
    if (intersection) {
      offsetPoints.push(intersection);
    } else {
      offsetPoints.push(currentEdge.start);
    }
  }
  return offsetPoints;
};

// src/gerber/convert-soup-to-gerber-commands/index.ts
import {
  lineAlphabet as defaultLineAlphabet,
  getFont
} from "@tscircuit/alphabet";
import {
  applyToPoint,
  compose,
  identity,
  rotate,
  translate
} from "transformation-matrix";
var getLayerCount2 = (circuitJson) => {
  const board = circuitJson.find((element) => element.type === "pcb_board");
  const numLayers = board?.num_layers ?? 2;
  return Math.max(2, Math.min(8, numLayers));
};
var getInnerLayerRefs = (layerCount) => Array.from({ length: layerCount - 2 }, (_, i) => `inner${i + 1}`);
var getGerberInnerLayerName = (layerRef) => {
  if (!layerRef.startsWith("inner")) {
    throw new Error(`Expected inner layer, got ${layerRef}`);
  }
  return `In${layerRef.replace("inner", "")}_Cu`;
};
var convertSoupToGerberCommands = (circuitJson, opts = {}) => {
  opts.flip_y_axis ??= false;
  const hasPanel = circuitJson.some((e) => e.type === "pcb_panel");
  const layerCount = getLayerCount2(circuitJson);
  const innerLayerRefs = getInnerLayerRefs(layerCount);
  const copperLayerRefs = ["top", ...innerLayerRefs, "bottom"];
  const outerLayerRefs = ["top", "bottom"];
  const glayers = {
    F_Cu: getCommandHeaders({
      layer: "top",
      layer_type: "copper",
      total_layer_count: layerCount
    }),
    F_SilkScreen: getCommandHeaders({
      layer: "top",
      layer_type: "silkscreen"
    }),
    F_Mask: getCommandHeaders({
      layer: "top",
      layer_type: "soldermask"
    }),
    F_Paste: getCommandHeaders({
      layer: "top",
      layer_type: "paste"
    }),
    B_Cu: getCommandHeaders({
      layer: "bottom",
      layer_type: "copper",
      total_layer_count: layerCount
    }),
    B_SilkScreen: getCommandHeaders({
      layer: "bottom",
      layer_type: "silkscreen"
    }),
    B_Mask: getCommandHeaders({
      layer: "bottom",
      layer_type: "soldermask"
    }),
    B_Paste: getCommandHeaders({
      layer: "bottom",
      layer_type: "paste"
    }),
    Edge_Cuts: getCommandHeaders({
      layer: "edgecut"
    })
  };
  for (const innerLayerRef of innerLayerRefs) {
    glayers[getGerberInnerLayerName(innerLayerRef)] = getCommandHeaders({
      layer: innerLayerRef,
      layer_type: "copper",
      total_layer_count: layerCount
    });
  }
  const copperGerberLayerNames = copperLayerRefs.map(
    (layerRef) => getGerberLayerName(layerRef, "copper")
  );
  const outerGerberLayerNames = outerLayerRefs.flatMap((layerRef) => [
    getGerberLayerName(layerRef, "soldermask"),
    getGerberLayerName(layerRef, "paste"),
    getGerberLayerName(layerRef, "silkscreen")
  ]);
  for (const glayer_name of [
    "F_Cu",
    ...copperGerberLayerNames.filter((name) => name !== "F_Cu"),
    ...outerGerberLayerNames
  ]) {
    const glayer = glayers[glayer_name];
    defineCommonMacros(glayer);
    defineAperturesForLayer({
      circuitJson,
      glayer,
      glayer_name
    });
  }
  glayers.Edge_Cuts.push(
    ...gerberBuilder().add("define_aperture_template", {
      aperture_number: 10,
      standard_template_code: "C",
      diameter: 0.05
      //mm
    }).build()
  );
  const mfy = (y) => opts.flip_y_axis ? -y : y;
  const renderPillFlash = ({
    glayer,
    x,
    y,
    width,
    height,
    rotationDegrees = 0
  }) => {
    const circleApertureConfig = {
      standard_template_code: "C",
      diameter: Math.min(width, height)
    };
    const apertureNumber = findApertureNumber(glayer, circleApertureConfig);
    const gb = gerberBuilder().add("select_aperture", {
      aperture_number: apertureNumber
    });
    const offset = Math.abs(width - height) / 2;
    const rotationRadians = rotationDegrees * Math.PI / 180;
    const cosTheta = Math.cos(rotationRadians);
    const sinTheta = Math.sin(rotationRadians);
    const rotateAndTranslate = (dx, dy) => ({
      x: x + dx * cosTheta - dy * sinTheta,
      y: y + dx * sinTheta + dy * cosTheta
    });
    if (offset <= 1e-9) {
      gb.add("flash_operation", { x, y: mfy(y) });
      glayer.push(...gb.build());
      return;
    }
    const isHorizontal = width >= height;
    const startRelative = isHorizontal ? { x: -offset, y: 0 } : { x: 0, y: -offset };
    const endRelative = isHorizontal ? { x: offset, y: 0 } : { x: 0, y: offset };
    const startPoint = rotateAndTranslate(startRelative.x, startRelative.y);
    const endPoint = rotateAndTranslate(endRelative.x, endRelative.y);
    gb.add("flash_operation", {
      x: startPoint.x,
      y: mfy(startPoint.y)
    }).add("move_operation", {
      x: startPoint.x,
      y: mfy(startPoint.y)
    }).add("plot_operation", {
      x: endPoint.x,
      y: mfy(endPoint.y)
    }).add("flash_operation", {
      x: endPoint.x,
      y: mfy(endPoint.y)
    });
    glayer.push(...gb.build());
  };
  const getRegionApertureNumber = (glayer) => findApertureNumber(glayer, REGION_APERTURE_CONFIG);
  const addClosedRegionFromPoints = ({
    target,
    apertureSource,
    points
  }) => {
    if (points.length === 0) return;
    const regionApertureNumber = getRegionApertureNumber(apertureSource);
    const regionBuilder = gerberBuilder().add("select_aperture", {
      aperture_number: regionApertureNumber
    }).add("start_region_statement", {});
    regionBuilder.add("move_operation", {
      x: points[0].x,
      y: mfy(points[0].y)
    });
    for (let i = 1; i < points.length; i++) {
      regionBuilder.add("plot_operation", {
        x: points[i].x,
        y: mfy(points[i].y)
      });
    }
    regionBuilder.add("plot_operation", {
      x: points[0].x,
      y: mfy(points[0].y)
    });
    regionBuilder.add("end_region_statement", {});
    target.push(...regionBuilder.build());
  };
  const renderVectorText = (element, layer, layerType, getApertureConfig) => {
    if (element.layer !== layer) return;
    const CAP_HEIGHT_SCALE = 0.7;
    const glayer = glayers[getGerberLayerName(layer, layerType)];
    const apertureConfig = getApertureConfig(element);
    const gerber = gerberBuilder().add("select_aperture", {
      aperture_number: findApertureNumber(glayer, apertureConfig)
    });
    let initialX = element.anchor_position.x;
    let initialY = element.anchor_position.y;
    const fontName = element.font ?? "tscircuit2024";
    const fontModule = getFont(fontName);
    const lineAlphabet = fontModule.lineAlphabet ?? defaultLineAlphabet;
    const fontSize = element.font_size * CAP_HEIGHT_SCALE;
    const letterSpacing = fontSize * 0.4;
    const spaceWidth = fontSize * 0.5;
    const textWidth = element.text.split("").reduce((width, char) => {
      if (char === " ") {
        return width + spaceWidth + letterSpacing;
      }
      return width + fontSize + letterSpacing;
    }, 0) - letterSpacing;
    const textHeight = fontSize;
    const anchorAlignment = element.anchor_alignment || (() => {
      const side = element.anchor_side;
      if (!side) return void 0;
      switch (side) {
        case "top":
          return "top_center";
        case "bottom":
          return "bottom_center";
        case "left":
          return "center_left";
        case "right":
          return "center_right";
      }
    })() || "center";
    switch (anchorAlignment) {
      case "top_left":
        break;
      case "top_center":
        initialX -= textWidth / 2;
        break;
      case "top_right":
        initialX -= textWidth;
        break;
      case "center_right":
        initialY -= textHeight / 2;
        break;
      case "center_left":
        initialX -= textWidth;
        initialY -= textHeight / 2;
        break;
      case "bottom_left":
        initialY -= textHeight;
        break;
      case "bottom_center":
        initialX -= textWidth / 2;
        initialY -= textHeight;
        break;
      case "bottom_right":
        initialX -= textWidth;
        initialY -= textHeight;
        break;
      default:
        initialX -= textWidth / 2;
        initialY -= textHeight / 2;
        break;
    }
    let anchoredX = initialX;
    const anchoredY = initialY;
    let rotation = element.ccw_rotation || 0;
    const cx = anchoredX + textWidth / 2;
    const cy = anchoredY + textHeight / 2;
    const transforms = [];
    const shouldMirror = element.is_mirrored !== void 0 ? element.is_mirrored : element.layer === "bottom";
    if (shouldMirror) {
      transforms.push(
        translate(cx, cy),
        { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        translate(-cx, -cy)
      );
      rotation = -rotation;
    }
    if (rotation) {
      const rad = rotation * Math.PI / 180;
      transforms.push(translate(cx, cy), rotate(rad), translate(-cx, -cy));
    }
    const transformMatrix = transforms.length > 0 ? compose(...transforms) : void 0;
    const applyTransform = (point) => transformMatrix ? applyToPoint(transformMatrix, point) : point;
    if (layerType === "copper" && element.is_knockout) {
      const padding = element.knockout_padding ?? {
        left: 0.2,
        right: 0.2,
        top: 0.2,
        bottom: 0.2
      };
      const paddedRect = [
        { x: initialX - padding.left, y: initialY - padding.top },
        {
          x: initialX + textWidth + padding.right,
          y: initialY - padding.top
        },
        {
          x: initialX + textWidth + padding.right,
          y: initialY + textHeight + padding.bottom
        },
        {
          x: initialX - padding.left,
          y: initialY + textHeight + padding.bottom
        }
      ].map(applyTransform);
      glayer.push(
        ...gerberBuilder().add("select_aperture", {
          aperture_number: findApertureNumber(glayer, apertureConfig)
        }).add("start_region_statement", {}).add("move_operation", {
          x: paddedRect[0].x,
          y: mfy(paddedRect[0].y)
        }).add("plot_operation", {
          x: paddedRect[1].x,
          y: mfy(paddedRect[1].y)
        }).add("plot_operation", {
          x: paddedRect[2].x,
          y: mfy(paddedRect[2].y)
        }).add("plot_operation", {
          x: paddedRect[3].x,
          y: mfy(paddedRect[3].y)
        }).add("plot_operation", {
          x: paddedRect[0].x,
          y: mfy(paddedRect[0].y)
        }).add("end_region_statement", {}).build()
      );
      glayer.push(
        ...gerberBuilder().add("set_layer_polarity", { polarity: "C" }).build()
      );
    }
    for (const char of element.text.toUpperCase()) {
      if (char === " ") {
        anchoredX += spaceWidth + letterSpacing;
        continue;
      }
      const letterPaths = lineAlphabet[char] || [];
      for (const path of letterPaths) {
        const x1 = anchoredX + path.x1 * fontSize;
        const y1 = anchoredY + path.y1 * fontSize;
        const x2 = anchoredX + path.x2 * fontSize;
        const y2 = anchoredY + path.y2 * fontSize;
        const p1 = applyTransform({ x: x1, y: y1 });
        const p2 = applyTransform({ x: x2, y: y2 });
        gerber.add("move_operation", { x: p1.x, y: mfy(p1.y) });
        gerber.add("plot_operation", { x: p2.x, y: mfy(p2.y) });
      }
      anchoredX += fontSize + letterSpacing;
    }
    glayer.push(...gerber.build());
    if (layerType === "copper" && element.is_knockout) {
      glayer.push(
        ...gerberBuilder().add("set_layer_polarity", { polarity: "D" }).build()
      );
    }
  };
  const drawRingToBuilder = (builder, ring) => {
    if (!ring || ring.vertices.length === 0) return;
    builder.add("move_operation", {
      x: ring.vertices[0].x,
      y: mfy(ring.vertices[0].y)
    });
    const vertices_loop = [...ring.vertices, ring.vertices[0]];
    for (let i = 0; i < vertices_loop.length - 1; i++) {
      const start = vertices_loop[i];
      const end = vertices_loop[i + 1];
      if (start.bulge && Math.abs(start.bulge) > 1e-9) {
        const bulge = (opts.flip_y_axis ? -1 : 1) * start.bulge;
        if (bulge > 0) {
          builder.add("set_movement_mode_to_counterclockwise_circular", {});
        } else {
          builder.add("set_movement_mode_to_clockwise_circular", {});
        }
        const p1 = { x: start.x, y: start.y };
        const p2 = { x: end.x, y: end.y };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-9) {
          builder.add("set_movement_mode_to_linear", {});
          builder.add("plot_operation", {
            x: end.x,
            y: mfy(end.y)
          });
          continue;
        }
        const abs_b = Math.abs(bulge);
        const theta = 4 * Math.atan(abs_b);
        if (Math.abs(Math.sin(theta / 2)) < 1e-9) {
          builder.add("set_movement_mode_to_linear", {});
          builder.add("plot_operation", {
            x: end.x,
            y: mfy(end.y)
          });
          continue;
        }
        const R = d / (2 * Math.sin(theta / 2));
        const alpha = (Math.PI - theta) / 2;
        const phi = Math.atan2(dy, dx);
        const delta_angle = bulge > 0 ? alpha : -alpha;
        const angle_p1_center = phi + delta_angle;
        const Cx = p1.x + R * Math.cos(angle_p1_center);
        const Cy = p1.y + R * Math.sin(angle_p1_center);
        const i_offset = Cx - p1.x;
        const j_offset = Cy - p1.y;
        builder.add("plot_operation", {
          x: end.x,
          y: mfy(end.y),
          i: i_offset,
          j: opts.flip_y_axis ? -j_offset : j_offset
        });
      } else {
        builder.add("set_movement_mode_to_linear", {});
        builder.add("plot_operation", { x: end.x, y: mfy(end.y) });
      }
    }
  };
  const reverseRing = (ring) => {
    const { vertices } = ring;
    if (!vertices || vertices.length === 0) return { vertices: [] };
    const n = vertices.length;
    const reversed_pts = [...vertices].reverse();
    const new_vertices = reversed_pts.map((pt, i) => {
      const bulge_v_idx = (n - 2 - i + n) % n;
      const bulge = vertices[bulge_v_idx].bulge;
      return { ...pt, bulge: bulge ? -bulge : void 0 };
    });
    return { vertices: new_vertices };
  };
  for (const layer of copperLayerRefs) {
    for (const element of circuitJson) {
      if (element.type === "pcb_copper_pour" && layer === element.layer) {
        const copper_glayer = glayers[getGerberLayerName(layer, "copper")];
        const all_pour_commands = [];
        if (element.shape === "brep") {
          const { brep_shape } = element;
          if (!brep_shape) continue;
          const { outer_ring, inner_rings } = brep_shape;
          const regionApertureNumber = getRegionApertureNumber(copper_glayer);
          const outer_builder = gerberBuilder().add("select_aperture", { aperture_number: regionApertureNumber }).add("start_region_statement", {});
          drawRingToBuilder(outer_builder, reverseRing(outer_ring));
          outer_builder.add("end_region_statement", {});
          all_pour_commands.push(...outer_builder.build());
          if (inner_rings && inner_rings.length > 0) {
            all_pour_commands.push(
              ...gerberBuilder().add("set_layer_polarity", { polarity: "C" }).build()
            );
            for (const inner_ring of inner_rings) {
              const inner_builder = gerberBuilder().add("select_aperture", {
                aperture_number: regionApertureNumber
              }).add("start_region_statement", {});
              drawRingToBuilder(inner_builder, inner_ring);
              inner_builder.add("end_region_statement", {});
              all_pour_commands.push(...inner_builder.build());
            }
            all_pour_commands.push(
              ...gerberBuilder().add("set_layer_polarity", { polarity: "D" }).build()
            );
          }
        } else if (element.shape === "rect") {
          const { center, width, height, rotation } = element;
          const w = width / 2;
          const h = height / 2;
          const points = [
            { x: -w, y: h },
            // Top-left
            { x: w, y: h },
            // Top-right
            { x: w, y: -h },
            // Bottom-right
            { x: -w, y: -h }
            // Bottom-left
          ];
          let transformMatrix = identity();
          if (rotation) {
            const angle_rad = rotation * Math.PI / 180;
            transformMatrix = rotate(angle_rad);
          }
          transformMatrix = compose(
            translate(center.x, center.y),
            transformMatrix
          );
          const transformedPoints = points.map(
            (p) => applyToPoint(transformMatrix, p)
          );
          const regionApertureNumber = getRegionApertureNumber(copper_glayer);
          const rect_builder = gerberBuilder().add("select_aperture", { aperture_number: regionApertureNumber }).add("start_region_statement", {});
          rect_builder.add("move_operation", {
            x: transformedPoints[0].x,
            y: mfy(transformedPoints[0].y)
          });
          for (let i = 1; i < transformedPoints.length; i++) {
            rect_builder.add("plot_operation", {
              x: transformedPoints[i].x,
              y: mfy(transformedPoints[i].y)
            });
          }
          rect_builder.add("plot_operation", {
            x: transformedPoints[0].x,
            y: mfy(transformedPoints[0].y)
          });
          rect_builder.add("end_region_statement", {});
          all_pour_commands.push(...rect_builder.build());
        } else if (element.shape === "polygon") {
          const { points } = element;
          addClosedRegionFromPoints({
            target: all_pour_commands,
            apertureSource: copper_glayer,
            points
          });
        }
        copper_glayer.push(...all_pour_commands);
        if (element.covered_with_solder_mask === false) {
          const mask_layer = glayers[getGerberLayerName(layer, "soldermask")];
          mask_layer.push(...all_pour_commands);
        }
      }
    }
  }
  for (const layer of [...copperLayerRefs, "edgecut"]) {
    for (const element of circuitJson) {
      if (element.type === "pcb_trace") {
        if (layer === "edgecut") continue;
        const route = element.route;
        for (const [a, b] of pairs(route)) {
          if (a.route_type === "wire") {
            if (a.layer === layer) {
              let bPoint = null;
              if (b.route_type === "wire" || b.route_type === "via") {
                bPoint = b;
              } else if (b.route_type === "through_pad") {
                if (b.start_layer === layer) {
                  bPoint = b.start;
                } else if (b.end_layer === layer) {
                  bPoint = b.end;
                }
              }
              if (!bPoint) continue;
              const glayer = glayers[getGerberLayerName(layer, "copper")];
              glayer.push(
                ...gerberBuilder().add("select_aperture", {
                  aperture_number: findApertureNumber(glayer, {
                    trace_width: a.width
                  })
                }).add("move_operation", { x: a.x, y: mfy(a.y) }).add("plot_operation", { x: bPoint.x, y: mfy(bPoint.y) }).build()
              );
            }
          } else if (a.route_type === "via" && b.route_type === "wire") {
            if (b.layer === layer) {
              const glayer = glayers[getGerberLayerName(layer, "copper")];
              glayer.push(
                ...gerberBuilder().add("select_aperture", {
                  aperture_number: findApertureNumber(glayer, {
                    trace_width: b.width
                  })
                }).add("move_operation", { x: a.x, y: mfy(a.y) }).add("plot_operation", { x: b.x, y: mfy(b.y) }).build()
              );
            }
          } else if (a.route_type === "through_pad" && b.route_type === "wire") {
            if (b.layer === layer) {
              const aPoint = a.end_layer === layer ? a.end : a.start_layer === layer ? a.start : null;
              if (!aPoint) continue;
              const glayer = glayers[getGerberLayerName(layer, "copper")];
              glayer.push(
                ...gerberBuilder().add("select_aperture", {
                  aperture_number: findApertureNumber(glayer, {
                    trace_width: b.width
                  })
                }).add("move_operation", { x: aPoint.x, y: mfy(aPoint.y) }).add("plot_operation", { x: b.x, y: mfy(b.y) }).build()
              );
            }
          }
        }
        for (const point of route) {
          if (point.route_type === "via" && typeof point.outer_diameter === "number" && (point.from_layer === layer || point.to_layer === layer)) {
            const glayer = glayers[getGerberLayerName(layer, "copper")];
            glayer.push(
              ...gerberBuilder().add("select_aperture", {
                aperture_number: findApertureNumber(
                  glayer,
                  getApertureConfigFromOuterDiameter(point)
                )
              }).add("flash_operation", { x: point.x, y: mfy(point.y) }).build()
            );
          }
        }
      } else if (element.type === "pcb_silkscreen_path" && outerLayerRefs.includes(layer)) {
        if (element.layer === layer) {
          const glayer = glayers[getGerberLayerName(layer, "silkscreen")];
          const apertureConfig = getApertureConfigFromPcbSilkscreenPath(element);
          const gerber = gerberBuilder().add("select_aperture", {
            aperture_number: findApertureNumber(glayer, apertureConfig)
          });
          if (element.route.length > 0) {
            gerber.add("move_operation", {
              x: element.route[0].x,
              y: mfy(element.route[0].y)
            });
          }
          for (let i = 1; i < element.route.length; i++) {
            gerber.add("plot_operation", {
              x: element.route[i].x,
              y: mfy(element.route[i].y)
            });
          }
          glayer.push(...gerber.build());
        }
      } else if (element.type === "pcb_silkscreen_text" && outerLayerRefs.includes(layer)) {
        renderVectorText(
          element,
          layer,
          "silkscreen",
          getApertureConfigFromPcbSilkscreenText
        );
      } else if (element.type === "pcb_copper_text" && layer !== "edgecut") {
        renderVectorText(
          element,
          layer,
          "copper",
          getApertureConfigFromPcbCopperText
        );
      } else if (element.type === "pcb_smtpad" && element.shape !== "polygon") {
        if (element.layer === layer && outerLayerRefs.includes(layer)) {
          if (element.shape === "pill" || element.shape === "rotated_pill") {
            const soldermaskMargin = typeof element.soldermask_margin === "number" ? element.soldermask_margin : 0;
            const rotation2 = element.shape === "rotated_pill" && typeof element.ccw_rotation === "number" ? element.ccw_rotation : 0;
            renderPillFlash({
              glayer: glayers[getGerberLayerName(layer, "copper")],
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
              rotationDegrees: rotation2
            });
            renderPillFlash({
              glayer: glayers[getGerberLayerName(layer, "soldermask")],
              x: element.x,
              y: element.y,
              width: element.width + soldermaskMargin * 2,
              height: element.height + soldermaskMargin * 2,
              rotationDegrees: rotation2
            });
            continue;
          }
          const rotation = element.shape === "rotated_rect" && typeof element.ccw_rotation === "number" ? element.ccw_rotation : 0;
          for (const { glayer, apertureConfig } of [
            {
              glayer: glayers[getGerberLayerName(layer, "copper")],
              apertureConfig: getApertureConfigFromPcbSmtpad(element)
            },
            {
              glayer: glayers[getGerberLayerName(layer, "soldermask")],
              apertureConfig: getApertureConfigFromPcbSmtpadSoldermask(element)
            }
          ]) {
            const apertureNumber = findApertureNumber(glayer, apertureConfig);
            const gb = gerberBuilder().add("select_aperture", {
              aperture_number: apertureNumber
            });
            if (rotation) {
              gb.add("load_rotation", {
                rotation_degrees: rotation
              });
            }
            gb.add("flash_operation", { x: element.x, y: mfy(element.y) });
            if (rotation) {
              gb.add("load_rotation", { rotation_degrees: 0 });
            }
            glayer.push(...gb.build());
          }
        }
      } else if (element.type === "pcb_smtpad" && element.shape === "polygon") {
        if (element.layer === layer && outerLayerRefs.includes(layer)) {
          const layers_to_add_to = [
            glayers[getGerberLayerName(layer, "copper")]
          ];
          if (element.is_covered_with_solder_mask !== true) {
            layers_to_add_to.push(
              glayers[getGerberLayerName(layer, "soldermask")]
            );
          }
          for (const glayer of layers_to_add_to) {
            const { points } = element;
            if (!points) continue;
            addClosedRegionFromPoints({
              target: glayer,
              apertureSource: glayer,
              points
            });
          }
        }
      } else if (element.type === "pcb_solder_paste") {
        if (element.layer === layer && outerLayerRefs.includes(layer)) {
          const glayer = glayers[getGerberLayerName(layer, "paste")];
          let rotation = 0;
          if ("ccw_rotation" in element && typeof element.ccw_rotation === "number") {
            rotation = element.ccw_rotation;
          } else {
            const platedHole = circuitJson.find(
              (candidate) => candidate.type === "pcb_plated_hole" && candidate.x === element.x && candidate.y === element.y && "ccw_rotation" in candidate && typeof candidate.ccw_rotation === "number"
            );
            if (platedHole) {
              rotation = platedHole.ccw_rotation;
            }
          }
          let apertureConfig = getApertureConfigFromPcbSolderPaste(element);
          if (element.shape === "pill" && (rotation === 90 || rotation === 270)) {
            apertureConfig = getApertureConfigFromPcbSolderPaste({
              ...element,
              width: element.height,
              height: element.width
            });
            rotation = 0;
          }
          const aperture_number = findApertureNumber(glayer, apertureConfig);
          const gb = gerberBuilder().add("select_aperture", {
            aperture_number
          });
          if (rotation) {
            gb.add("load_rotation", {
              rotation_degrees: rotation
            });
          }
          gb.add("flash_operation", { x: element.x, y: mfy(element.y) });
          if (rotation) {
            gb.add("load_rotation", { rotation_degrees: 0 });
          }
          glayer.push(...gb.build());
        }
      } else if (element.type === "pcb_plated_hole") {
        if (element.layers.includes(layer)) {
          const layersToAddTo = [
            glayers[getGerberLayerName(layer, "copper")]
          ];
          if (outerLayerRefs.includes(layer) && element.is_covered_with_solder_mask !== true) {
            layersToAddTo.push(glayers[getGerberLayerName(layer, "soldermask")]);
          }
          for (const glayer of layersToAddTo) {
            if (element.shape === "hole_with_polygon_pad") {
              const { pad_outline } = element;
              if (!pad_outline?.length) continue;
              const soldermaskGlayer2 = glayers[getGerberLayerName(layer, "soldermask")];
              let points = pad_outline;
              if (glayer === soldermaskGlayer2 && "soldermask_margin" in element && typeof element.soldermask_margin === "number") {
                points = offsetPolygonOutline(
                  pad_outline,
                  element.soldermask_margin
                );
              }
              const translatedPoints = points.map((point) => ({
                x: point.x + element.x,
                y: point.y + element.y
              }));
              addClosedRegionFromPoints({
                target: glayer,
                apertureSource: glayer,
                points: translatedPoints
              });
              continue;
            }
            const holeW = "hole_width" in element && typeof element.hole_width === "number" ? element.hole_width : 0;
            const holeH = "hole_height" in element && typeof element.hole_height === "number" ? element.hole_height : 0;
            const padWidthCandidates = [holeW];
            if ("outer_width" in element && typeof element.outer_width === "number") {
              padWidthCandidates.push(element.outer_width);
            }
            if ("rect_pad_width" in element && typeof element.rect_pad_width === "number") {
              padWidthCandidates.push(element.rect_pad_width);
            }
            const padW = Math.max(...padWidthCandidates);
            const padHeightCandidates = [holeH];
            if ("outer_height" in element && typeof element.outer_height === "number") {
              padHeightCandidates.push(element.outer_height);
            }
            if ("rect_pad_height" in element && typeof element.rect_pad_height === "number") {
              padHeightCandidates.push(element.rect_pad_height);
            }
            const padH = Math.max(...padHeightCandidates);
            const soldermaskGlayer = glayers[getGerberLayerName(layer, "soldermask")];
            let soldermaskMargin = 0;
            if (glayer === soldermaskGlayer && "soldermask_margin" in element && typeof element.soldermask_margin === "number") {
              soldermaskMargin = element.soldermask_margin;
            }
            const aperturePadW = padW + soldermaskMargin * 2;
            const aperturePadH = padH + soldermaskMargin * 2;
            if (element.shape === "pill") {
              const circleApertureConfig = {
                standard_template_code: "C",
                diameter: Math.min(aperturePadW, aperturePadH)
              };
              let aperture_number;
              try {
                aperture_number = findApertureNumber(
                  glayer,
                  circleApertureConfig
                );
              } catch {
                aperture_number = Math.max(
                  ...glayer.filter((cmd) => "aperture_number" in cmd).map((cmd) => cmd.aperture_number),
                  9
                ) + 1;
                glayer.push(
                  ...gerberBuilder().add("define_aperture_template", {
                    aperture_number,
                    ...circleApertureConfig
                  }).build()
                );
              }
              const gb = gerberBuilder().add("select_aperture", {
                aperture_number
              });
              const rotationRadians = (element.ccw_rotation ?? 0) * Math.PI / 180;
              const cosTheta = Math.cos(rotationRadians);
              const sinTheta = Math.sin(rotationRadians);
              const rotateAndTranslate = (dx, dy) => {
                const rotatedX = dx * cosTheta - dy * sinTheta;
                const rotatedY = dx * sinTheta + dy * cosTheta;
                return {
                  x: element.x + rotatedX,
                  y: element.y + rotatedY
                };
              };
              const isHorizontal = aperturePadW >= aperturePadH;
              const offset = isHorizontal ? (aperturePadW - aperturePadH) / 2 : (aperturePadH - aperturePadW) / 2;
              if (offset <= 0) {
                const center = rotateAndTranslate(0, 0);
                gb.add("flash_operation", { x: center.x, y: mfy(center.y) });
              } else {
                const startRelative = isHorizontal ? { x: -offset, y: 0 } : { x: 0, y: -offset };
                const endRelative = isHorizontal ? { x: offset, y: 0 } : { x: 0, y: offset };
                const startPoint = rotateAndTranslate(
                  startRelative.x,
                  startRelative.y
                );
                const endPoint = rotateAndTranslate(
                  endRelative.x,
                  endRelative.y
                );
                gb.add("flash_operation", {
                  x: startPoint.x,
                  y: mfy(startPoint.y)
                }).add("move_operation", {
                  x: startPoint.x,
                  y: mfy(startPoint.y)
                }).add("plot_operation", {
                  x: endPoint.x,
                  y: mfy(endPoint.y)
                }).add("flash_operation", {
                  x: endPoint.x,
                  y: mfy(endPoint.y)
                });
              }
              glayer.push(...gb.build());
            } else {
              let apertureConfig = getApertureConfigFromPcbPlatedHole({
                ...element,
                ...element.shape !== "circle" ? { outer_width: padW, outer_height: padH } : {}
              });
              if (glayer === soldermaskGlayer) {
                apertureConfig = getApertureConfigFromPcbPlatedHoleSoldermask({
                  ...element,
                  ...element.shape !== "circle" ? { outer_width: padW, outer_height: padH } : {}
                });
              }
              const rotation = "rect_ccw_rotation" in element && typeof element.rect_ccw_rotation === "number" && Math.abs(padW - padH) > 1e-9 ? element.rect_ccw_rotation : void 0;
              const gb = gerberBuilder().add("select_aperture", {
                aperture_number: findApertureNumber(glayer, apertureConfig)
              });
              if (rotation)
                gb.add("load_rotation", { rotation_degrees: rotation });
              gb.add("flash_operation", { x: element.x, y: mfy(element.y) });
              if (rotation) gb.add("load_rotation", { rotation_degrees: 0 });
              glayer.push(...gb.build());
            }
          }
        }
      } else if (element.type === "pcb_hole") {
        if (outerLayerRefs.includes(layer) && element.is_covered_with_solder_mask !== true) {
          for (const glayer of [
            glayers[getGerberLayerName(layer, "soldermask")]
          ]) {
            if (element.hole_shape !== "circle") {
              console.warn(
                "NOT IMPLEMENTED: drawing gerber for non-round holes"
              );
              continue;
            }
            glayer.push(
              ...gerberBuilder().add("select_aperture", {
                aperture_number: findApertureNumber(
                  glayer,
                  getApertureConfigFromCirclePcbHoleSoldermask(element)
                )
              }).add("flash_operation", { x: element.x, y: mfy(element.y) }).build()
            );
          }
        }
      } else if (element.type === "pcb_via") {
        if (element.layers.includes(layer)) {
          const layersToAddTo = [
            glayers[getGerberLayerName(layer, "copper")]
          ];
          if (element.is_tented === false && outerLayerRefs.includes(layer)) {
            layersToAddTo.push(glayers[getGerberLayerName(layer, "soldermask")]);
          }
          for (const glayer of layersToAddTo) {
            glayer.push(
              ...gerberBuilder().add("select_aperture", {
                aperture_number: findApertureNumber(
                  glayer,
                  getApertureConfigFromOuterDiameter(element)
                )
              }).add("flash_operation", { x: element.x, y: mfy(element.y) }).build()
            );
          }
        }
      } else if (element.type === "pcb_board" && layer === "edgecut") {
        if (hasPanel) continue;
        const glayer = glayers.Edge_Cuts;
        const { width, height, center, outline } = element;
        const gerberBuild = gerberBuilder().add("select_aperture", {
          aperture_number: 10
        });
        if (outline && outline.length > 2) {
          const outlinePoints = outline.map((point) => ({
            x: point.x,
            y: mfy(point.y)
          }));
          const firstPoint = outlinePoints[0];
          gerberBuild.add("move_operation", firstPoint);
          for (let i = 1; i < outlinePoints.length; i++) {
            gerberBuild.add("plot_operation", outlinePoints[i]);
          }
          const lastPoint = outlinePoints[outlinePoints.length - 1];
          if (lastPoint.x !== firstPoint.x || lastPoint.y !== firstPoint.y) {
            gerberBuild.add("plot_operation", firstPoint);
          }
        } else {
          gerberBuild.add("move_operation", {
            x: center.x - width / 2,
            y: mfy(center.y - height / 2)
          }).add("plot_operation", {
            x: center.x + width / 2,
            y: mfy(center.y - height / 2)
          }).add("plot_operation", {
            x: center.x + width / 2,
            y: mfy(center.y + height / 2)
          }).add("plot_operation", {
            x: center.x - width / 2,
            y: mfy(center.y + height / 2)
          }).add("plot_operation", {
            x: center.x - width / 2,
            y: mfy(center.y - height / 2)
          });
        }
        glayer.push(...gerberBuild.build());
      } else if (element.type === "pcb_panel" && layer === "edgecut") {
        const glayer = glayers.Edge_Cuts;
        const panel = element;
        const { width, height, center } = panel;
        const gerberBuild = gerberBuilder().add("select_aperture", {
          aperture_number: 10
        }).add("move_operation", {
          x: center.x - width / 2,
          y: mfy(center.y - height / 2)
        }).add("plot_operation", {
          x: center.x + width / 2,
          y: mfy(center.y - height / 2)
        }).add("plot_operation", {
          x: center.x + width / 2,
          y: mfy(center.y + height / 2)
        }).add("plot_operation", {
          x: center.x - width / 2,
          y: mfy(center.y + height / 2)
        }).add("plot_operation", {
          x: center.x - width / 2,
          y: mfy(center.y - height / 2)
        });
        glayer.push(...gerberBuild.build());
      } else if (element.type === "pcb_cutout") {
        if (layer === "edgecut") {
          const ec_layer = glayers.Edge_Cuts;
          const cutout_builder = gerberBuilder().add("select_aperture", {
            aperture_number: 10
          });
          const el = element;
          if (el.shape === "rect") {
            const { center, width, height, rotation, corner_radius } = el;
            const w = width / 2;
            const h = height / 2;
            const r = Math.max(
              0,
              Math.min(corner_radius ?? 0, Math.abs(w), Math.abs(h))
            );
            const makeTransformMatrix = () => {
              let transformMatrix2 = identity();
              if (rotation) {
                const angle_rad = rotation * Math.PI / 180;
                transformMatrix2 = rotate(angle_rad);
              }
              return compose(translate(center.x, center.y), transformMatrix2);
            };
            const transformMatrix = makeTransformMatrix();
            if (r > 0) {
              const startPoint = { x: -w + r, y: h };
              let currentPoint = applyToPoint(transformMatrix, startPoint);
              cutout_builder.add("move_operation", {
                x: currentPoint.x,
                y: mfy(currentPoint.y)
              });
              const addLine = (point) => {
                const transformedPoint = applyToPoint(transformMatrix, point);
                cutout_builder.add("plot_operation", {
                  x: transformedPoint.x,
                  y: mfy(transformedPoint.y)
                });
                currentPoint = transformedPoint;
              };
              const addArc = (options) => {
                const transformedPoint = applyToPoint(
                  transformMatrix,
                  options.point
                );
                const transformedCenter = applyToPoint(
                  transformMatrix,
                  options.center
                );
                cutout_builder.add("set_movement_mode_to_clockwise_circular", {}).add("plot_operation", {
                  x: transformedPoint.x,
                  y: mfy(transformedPoint.y),
                  i: transformedCenter.x - currentPoint.x,
                  j: mfy(transformedCenter.y) - mfy(currentPoint.y)
                }).add("set_movement_mode_to_linear", {});
                currentPoint = transformedPoint;
              };
              addLine({ x: w - r, y: h });
              addArc({
                point: { x: w, y: h - r },
                center: { x: w - r, y: h - r }
              });
              addLine({ x: w, y: -h + r });
              addArc({
                point: { x: w - r, y: -h },
                center: { x: w - r, y: -h + r }
              });
              addLine({ x: -w + r, y: -h });
              addArc({
                point: { x: -w, y: -h + r },
                center: { x: -w + r, y: -h + r }
              });
              addLine({ x: -w, y: h - r });
              addArc({
                point: { x: -w + r, y: h },
                center: { x: -w + r, y: h - r }
              });
            } else {
              const points = [
                { x: -w, y: h },
                // Top-left
                { x: w, y: h },
                // Top-right
                { x: w, y: -h },
                // Bottom-right
                { x: -w, y: -h }
                // Bottom-left
              ];
              const transformedPoints = points.map(
                (p) => applyToPoint(transformMatrix, p)
              );
              cutout_builder.add("move_operation", {
                x: transformedPoints[0].x,
                y: mfy(transformedPoints[0].y)
              });
              for (let i = 1; i < transformedPoints.length; i++) {
                cutout_builder.add("plot_operation", {
                  x: transformedPoints[i].x,
                  y: mfy(transformedPoints[i].y)
                });
              }
              cutout_builder.add("plot_operation", {
                x: transformedPoints[0].x,
                y: mfy(transformedPoints[0].y)
              });
            }
          } else if (el.shape === "circle") {
            const { center, radius } = el;
            const p1 = { x: center.x + radius, y: center.y };
            const p2 = { x: center.x - radius, y: center.y };
            cutout_builder.add("move_operation", {
              x: p1.x,
              y: mfy(p1.y)
            }).add("set_movement_mode_to_counterclockwise_circular", {}).add("plot_operation", {
              x: p2.x,
              y: mfy(p2.y),
              i: -radius,
              j: 0
            }).add("plot_operation", {
              x: p1.x,
              y: mfy(p1.y),
              i: radius,
              j: 0
            }).add("set_movement_mode_to_linear", {});
          } else if (el.shape === "polygon") {
            const { points } = el;
            if (points.length > 0) {
              cutout_builder.add("move_operation", {
                x: points[0].x,
                y: mfy(points[0].y)
              });
              for (let i = 1; i < points.length; i++) {
                cutout_builder.add("plot_operation", {
                  x: points[i].x,
                  y: mfy(points[i].y)
                });
              }
              cutout_builder.add("plot_operation", {
                x: points[0].x,
                y: mfy(points[0].y)
              });
            }
          }
          ec_layer.push(...cutout_builder.build());
        }
      }
    }
  }
  for (const key of Object.keys(glayers)) {
    glayers[key].push(
      ...gerberBuilder().add("end_of_file", {}).build()
    );
  }
  return glayers;
};

export {
  stringifyExcellonDrill,
  excellonDrill,
  convertSoupToExcellonDrillCommands,
  convertSoupToExcellonDrillCommandLayers,
  gerberBuilder,
  stringifyGerberCommand,
  stringifyGerberCommandLayers,
  stringifyGerberCommands,
  convertSoupToGerberCommands
};
//# sourceMappingURL=chunk-LSWAU2V4.js.map
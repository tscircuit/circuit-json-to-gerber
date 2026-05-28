import { AnyZodObject, z } from 'zod';
import { LayerRef, AnyCircuitElement } from 'circuit-json';

interface ExcellonDrillCommandDef<K extends string, T extends AnyZodObject | z.ZodIntersection<any, any>> {
    command_code: K;
    schema: T;
    stringify: (c: z.infer<T>) => string;
}

declare const excellon_drill_command_map: {
    G00: ExcellonDrillCommandDef<"G00", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G00">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G00";
    }, {
        command_code?: "G00" | undefined;
    }>>;
    G01: ExcellonDrillCommandDef<"G01", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G01">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G01";
    }, {
        command_code?: "G01" | undefined;
    }>>;
    G85: ExcellonDrillCommandDef<"G85", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G85">>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "G85";
        x: number;
        y: number;
        width: number;
    }, {
        x: number;
        y: number;
        width: number;
        command_code?: "G85" | undefined;
    }>>;
    M48: ExcellonDrillCommandDef<"M48", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M48">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M48";
    }, {
        command_code?: "M48" | undefined;
    }>>;
    M95: ExcellonDrillCommandDef<"M95", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M95">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M95";
    }, {
        command_code?: "M95" | undefined;
    }>>;
    FMAT: ExcellonDrillCommandDef<"FMAT", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"FMAT">>;
        format: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "FMAT";
        format: number;
    }, {
        format: number;
        command_code?: "FMAT" | undefined;
    }>>;
    unit_format: ExcellonDrillCommandDef<"unit_format", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"unit_format">>;
        unit: z.ZodUnion<[z.ZodLiteral<"INCH">, z.ZodLiteral<"METRIC">]>;
        lz: z.ZodDefault<z.ZodNullable<z.ZodUnion<[z.ZodLiteral<"LZ">, z.ZodLiteral<"TZ">]>>>;
    }, "strip", z.ZodTypeAny, {
        command_code: "unit_format";
        unit: "INCH" | "METRIC";
        lz: "LZ" | "TZ" | null;
    }, {
        unit: "INCH" | "METRIC";
        command_code?: "unit_format" | undefined;
        lz?: "LZ" | "TZ" | null | undefined;
    }>>;
    aper_function_header: ExcellonDrillCommandDef<"aper_function_header", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"aper_function_header">>;
        is_plated: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        command_code: "aper_function_header";
        is_plated: boolean;
    }, {
        is_plated: boolean;
        command_code?: "aper_function_header" | undefined;
    }>>;
    percent_sign: ExcellonDrillCommandDef<"percent_sign", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"percent_sign">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "percent_sign";
    }, {
        command_code?: "percent_sign" | undefined;
    }>>;
    T: ExcellonDrillCommandDef<"define_tool", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"define_tool">>;
        tool_number: z.ZodNumber;
        diameter: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "define_tool";
        tool_number: number;
        diameter: number;
    }, {
        tool_number: number;
        diameter: number;
        command_code?: "define_tool" | undefined;
    }>>;
    define_tool: ExcellonDrillCommandDef<"define_tool", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"define_tool">>;
        tool_number: z.ZodNumber;
        diameter: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "define_tool";
        tool_number: number;
        diameter: number;
    }, {
        tool_number: number;
        diameter: number;
        command_code?: "define_tool" | undefined;
    }>>;
    use_tool: ExcellonDrillCommandDef<"use_tool", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"use_tool">>;
        tool_number: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "use_tool";
        tool_number: number;
    }, {
        tool_number: number;
        command_code?: "use_tool" | undefined;
    }>>;
    G90: ExcellonDrillCommandDef<"G90", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G90">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G90";
    }, {
        command_code?: "G90" | undefined;
    }>>;
    G05: ExcellonDrillCommandDef<"G05", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G05">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G05";
    }, {
        command_code?: "G05" | undefined;
    }>>;
    M15: ExcellonDrillCommandDef<"M15", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M15">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M15";
    }, {
        command_code?: "M15" | undefined;
    }>>;
    M16: ExcellonDrillCommandDef<"M16", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M16">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M16";
    }, {
        command_code?: "M16" | undefined;
    }>>;
    M30: ExcellonDrillCommandDef<"M30", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M30">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M30";
    }, {
        command_code?: "M30" | undefined;
    }>>;
    drill_at: ExcellonDrillCommandDef<"drill_at", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"drill_at">>;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "drill_at";
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
        command_code?: "drill_at" | undefined;
    }>>;
    header_comment: ExcellonDrillCommandDef<"header_comment", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"header_comment">>;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "header_comment";
        text: string;
    }, {
        text: string;
        command_code?: "header_comment" | undefined;
    }>>;
    header_attribute: ExcellonDrillCommandDef<"header_attribute", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"header_attribute">>;
        attribute_name: z.ZodString;
        attribute_value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "header_attribute";
        attribute_name: string;
        attribute_value: string;
    }, {
        attribute_name: string;
        attribute_value: string;
        command_code?: "header_attribute" | undefined;
    }>>;
    rewind: ExcellonDrillCommandDef<"rewind", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"rewind">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "rewind";
    }, {
        command_code?: "rewind" | undefined;
    }>>;
};
type AnyExcellonDrillCommand = z.infer<(typeof excellon_drill_command_map)[keyof typeof excellon_drill_command_map]["schema"]>;

declare const stringifyExcellonDrill: (commands: Array<AnyExcellonDrillCommand>) => string;

type DrillLayerSpan = {
    from_layer: LayerRef;
    to_layer: LayerRef;
};
declare const convertSoupToExcellonDrillCommands: ({ circuitJson, is_plated, flip_y_axis, layer_span, }: {
    circuitJson: Array<AnyCircuitElement>;
    is_plated: boolean;
    flip_y_axis?: boolean;
    layer_span?: DrillLayerSpan;
}) => Array<AnyExcellonDrillCommand>;
declare const convertSoupToExcellonDrillCommandLayers: ({ circuitJson, flip_y_axis, }: {
    circuitJson: Array<AnyCircuitElement>;
    flip_y_axis?: boolean;
}) => Record<string, Array<AnyExcellonDrillCommand>>;

declare class ExcellonDrillBuilder {
    commands: Array<AnyExcellonDrillCommand>;
    constructor();
    add<T extends keyof typeof excellon_drill_command_map>(cmd: T, props: z.input<(typeof excellon_drill_command_map)[T]["schema"]>): ExcellonDrillBuilder;
    build(): Array<AnyExcellonDrillCommand>;
}
declare const excellonDrill: () => ExcellonDrillBuilder;

interface GerberCommandDef<K extends string, T extends AnyZodObject | z.ZodIntersection<any, any>> {
    command_code: K;
    schema: T;
    stringify: (c: z.infer<T>) => string;
}

declare const gerber_command_map: {
    readonly add_attribute_on_aperture: GerberCommandDef<"TA", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"TA">>;
        attribute_name: z.ZodString;
        attribute_value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "TA";
        attribute_name: string;
        attribute_value: string;
    }, {
        attribute_name: string;
        attribute_value: string;
        command_code?: "TA" | undefined;
    }>>;
    readonly add_attribute_on_file: GerberCommandDef<"TF", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"TF">>;
        attribute_name: z.ZodString;
        attribute_value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "TF";
        attribute_name: string;
        attribute_value: string;
    }, {
        attribute_name: string;
        attribute_value: string;
        command_code?: "TF" | undefined;
    }>>;
    readonly add_attribute_on_object: GerberCommandDef<"TO", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"TO">>;
        attribute_name: z.ZodString;
        attribute_value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "TO";
        attribute_name: string;
        attribute_value: string;
    }, {
        attribute_name: string;
        attribute_value: string;
        command_code?: "TO" | undefined;
    }>>;
    readonly aperture_block: GerberCommandDef<"AB", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"AB">>;
        block: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "AB";
        block: string;
    }, {
        block: string;
        command_code?: "AB" | undefined;
    }>>;
    readonly comment: GerberCommandDef<"G04", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G04">>;
        comment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "G04";
        comment: string;
    }, {
        comment: string;
        command_code?: "G04" | undefined;
    }>>;
    readonly create_arc: GerberCommandDef<"G75", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G75">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G75";
    }, {
        command_code?: "G75" | undefined;
    }>>;
    readonly define_aperture: GerberCommandDef<"AD", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"AD">>;
        aperture_code: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "AD";
        aperture_code: string;
    }, {
        aperture_code: string;
        command_code?: "AD" | undefined;
    }>>;
    readonly define_macro_aperture_template: GerberCommandDef<"AM", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"AM">>;
        macro_name: z.ZodString;
        template_code: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        command_code: "AM";
        macro_name: string;
        template_code: string;
    }, {
        macro_name: string;
        template_code: string;
        command_code?: "AM" | undefined;
    }>>;
    readonly delete_attribute: GerberCommandDef<"TD", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"TD">>;
        attribute: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        command_code: "TD";
        attribute?: string | undefined;
    }, {
        command_code?: "TD" | undefined;
        attribute?: string | undefined;
    }>>;
    readonly end_of_file: GerberCommandDef<"M02", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"M02">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "M02";
    }, {
        command_code?: "M02" | undefined;
    }>>;
    readonly move_operation: GerberCommandDef<"D02", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"D02">>;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "D02";
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
        command_code?: "D02" | undefined;
    }>>;
    readonly flash_operation: GerberCommandDef<"D03", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"D03">>;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "D03";
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
        command_code?: "D03" | undefined;
    }>>;
    readonly end_region_statement: GerberCommandDef<"G37", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G37">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G37";
    }, {
        command_code?: "G37" | undefined;
    }>>;
    readonly format_specification: GerberCommandDef<"FS", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"FS">>;
        zero_omission_mode: z.ZodDefault<z.ZodNullable<z.ZodUnion<[z.ZodLiteral<"L">, z.ZodLiteral<"T">]>>>;
        coordinate_notation: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"A">, z.ZodLiteral<"I">]>>;
        x_integer_digits: z.ZodDefault<z.ZodNumber>;
        x_decimal_digits: z.ZodDefault<z.ZodNumber>;
        y_integer_digits: z.ZodDefault<z.ZodNumber>;
        y_decimal_digits: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        command_code: "FS";
        zero_omission_mode: "T" | "L" | null;
        coordinate_notation: "A" | "I";
        x_integer_digits: number;
        x_decimal_digits: number;
        y_integer_digits: number;
        y_decimal_digits: number;
    }, {
        command_code?: "FS" | undefined;
        zero_omission_mode?: "T" | "L" | null | undefined;
        coordinate_notation?: "A" | "I" | undefined;
        x_integer_digits?: number | undefined;
        x_decimal_digits?: number | undefined;
        y_integer_digits?: number | undefined;
        y_decimal_digits?: number | undefined;
    }>>;
    readonly load_rotation: GerberCommandDef<"LR", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"LR">>;
        rotation_degrees: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "LR";
        rotation_degrees: number;
    }, {
        rotation_degrees: number;
        command_code?: "LR" | undefined;
    }>>;
    readonly plot_operation: GerberCommandDef<"D01", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"D01">>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        i: z.ZodOptional<z.ZodNumber>;
        j: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        command_code: "D01";
        x: number;
        y: number;
        i?: number | undefined;
        j?: number | undefined;
    }, {
        x: number;
        y: number;
        command_code?: "D01" | undefined;
        i?: number | undefined;
        j?: number | undefined;
    }>>;
    readonly define_aperture_template: GerberCommandDef<"ADD", z.ZodIntersection<z.ZodUnion<[z.ZodDiscriminatedUnion<"standard_template_code", [z.ZodObject<{
        standard_template_code: z.ZodLiteral<"C">;
        diameter: z.ZodNumber;
        hole_diameter: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        diameter: number;
        standard_template_code: "C";
        hole_diameter?: number | undefined;
    }, {
        diameter: number;
        standard_template_code: "C";
        hole_diameter?: number | undefined;
    }>, z.ZodObject<{
        standard_template_code: z.ZodLiteral<"R">;
        x_size: z.ZodNumber;
        y_size: z.ZodNumber;
        hole_diameter: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        standard_template_code: "R";
        x_size: number;
        y_size: number;
        hole_diameter?: number | undefined;
    }, {
        standard_template_code: "R";
        x_size: number;
        y_size: number;
        hole_diameter?: number | undefined;
    }>, z.ZodObject<{
        standard_template_code: z.ZodLiteral<"O">;
        x_size: z.ZodNumber;
        y_size: z.ZodNumber;
        hole_diameter: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        standard_template_code: "O";
        x_size: number;
        y_size: number;
        hole_diameter?: number | undefined;
    }, {
        standard_template_code: "O";
        x_size: number;
        y_size: number;
        hole_diameter?: number | undefined;
    }>, z.ZodObject<{
        standard_template_code: z.ZodLiteral<"P">;
        outer_diameter: z.ZodNumber;
        number_of_vertices: z.ZodNumber;
        rotation: z.ZodOptional<z.ZodNumber>;
        hole_diameter: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        outer_diameter: number;
        standard_template_code: "P";
        number_of_vertices: number;
        hole_diameter?: number | undefined;
        rotation?: number | undefined;
    }, {
        outer_diameter: number;
        standard_template_code: "P";
        number_of_vertices: number;
        hole_diameter?: number | undefined;
        rotation?: number | undefined;
    }>]>, z.ZodDiscriminatedUnion<"macro_name", [z.ZodObject<{
        macro_name: z.ZodLiteral<"HORZPILL">;
        x_size: z.ZodNumber;
        y_size: z.ZodNumber;
        circle_diameter: z.ZodNumber;
        circle_center_offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        macro_name: "HORZPILL";
        x_size: number;
        y_size: number;
        circle_diameter: number;
        circle_center_offset: number;
    }, {
        macro_name: "HORZPILL";
        x_size: number;
        y_size: number;
        circle_diameter: number;
        circle_center_offset: number;
    }>, z.ZodObject<{
        macro_name: z.ZodLiteral<"VERTPILL">;
        x_size: z.ZodNumber;
        y_size: z.ZodNumber;
        circle_diameter: z.ZodNumber;
        circle_center_offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        macro_name: "VERTPILL";
        x_size: number;
        y_size: number;
        circle_diameter: number;
        circle_center_offset: number;
    }, {
        macro_name: "VERTPILL";
        x_size: number;
        y_size: number;
        circle_diameter: number;
        circle_center_offset: number;
    }>, z.ZodObject<{
        macro_name: z.ZodLiteral<"ROUNDRECT">;
        corner_radius: z.ZodNumber;
        corner_1_x: z.ZodNumber;
        corner_1_y: z.ZodNumber;
        corner_2_x: z.ZodNumber;
        corner_2_y: z.ZodNumber;
        corner_3_x: z.ZodNumber;
        corner_3_y: z.ZodNumber;
        corner_4_x: z.ZodNumber;
        corner_4_y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        macro_name: "ROUNDRECT";
        corner_radius: number;
        corner_1_x: number;
        corner_1_y: number;
        corner_2_x: number;
        corner_2_y: number;
        corner_3_x: number;
        corner_3_y: number;
        corner_4_x: number;
        corner_4_y: number;
    }, {
        macro_name: "ROUNDRECT";
        corner_radius: number;
        corner_1_x: number;
        corner_1_y: number;
        corner_2_x: number;
        corner_2_y: number;
        corner_3_x: number;
        corner_3_y: number;
        corner_4_x: number;
        corner_4_y: number;
    }>]>]>, z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"ADD">>;
        aperture_number: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "ADD";
        aperture_number: number;
    }, {
        aperture_number: number;
        command_code?: "ADD" | undefined;
    }>>>;
    readonly set_movement_mode_to_clockwise_circular: GerberCommandDef<"G02", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G02">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G02";
    }, {
        command_code?: "G02" | undefined;
    }>>;
    readonly set_movement_mode_to_counterclockwise_circular: GerberCommandDef<"G03", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G03">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G03";
    }, {
        command_code?: "G03" | undefined;
    }>>;
    readonly set_movement_mode_to_linear: GerberCommandDef<"G01", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G01">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G01";
    }, {
        command_code?: "G01" | undefined;
    }>>;
    readonly select_aperture: GerberCommandDef<"D", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"D">>;
        aperture_number: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        command_code: "D";
        aperture_number: number;
    }, {
        aperture_number: number;
        command_code?: "D" | undefined;
    }>>;
    readonly set_unit: GerberCommandDef<"MO", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"MO">>;
        unit: z.ZodEnum<["MM", "in"]>;
    }, "strip", z.ZodTypeAny, {
        command_code: "MO";
        unit: "MM" | "in";
    }, {
        unit: "MM" | "in";
        command_code?: "MO" | undefined;
    }>>;
    readonly set_layer_polarity: GerberCommandDef<"LP", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"LP">>;
        polarity: z.ZodEnum<["D", "C"]>;
    }, "strip", z.ZodTypeAny, {
        command_code: "LP";
        polarity: "D" | "C";
    }, {
        polarity: "D" | "C";
        command_code?: "LP" | undefined;
    }>>;
    readonly start_region_statement: GerberCommandDef<"G36", z.ZodObject<{
        command_code: z.ZodDefault<z.ZodLiteral<"G36">>;
    }, "strip", z.ZodTypeAny, {
        command_code: "G36";
    }, {
        command_code?: "G36" | undefined;
    }>>;
};
type AnyGerberCommand = z.infer<(typeof gerber_command_map)[keyof typeof gerber_command_map]["schema"]>;

declare const gerberBuilder: () => GerberBuilder;
declare class GerberBuilder {
    commands: Array<AnyGerberCommand>;
    constructor();
    $if(condition: boolean, fn: (gb: GerberBuilder) => GerberBuilder): GerberBuilder;
    add<T extends keyof typeof gerber_command_map>(cmd: T, props: z.input<(typeof gerber_command_map)[T]["schema"]>): GerberBuilder;
    build(): Array<AnyGerberCommand>;
}

declare const stringifyGerberCommandLayers: (commandLayers: Record<string, AnyGerberCommand[]>) => Record<string, string>;

declare const stringifyGerberCommand: (command: AnyGerberCommand) => string;

declare const stringifyGerberCommands: (commands: AnyGerberCommand[]) => string;

type LayerToGerberCommandsMap = {
    [key: string]: AnyGerberCommand[];
    F_Cu: AnyGerberCommand[];
    F_SilkScreen: AnyGerberCommand[];
    F_Mask: AnyGerberCommand[];
    F_Paste: AnyGerberCommand[];
    B_Cu: AnyGerberCommand[];
    B_SilkScreen: AnyGerberCommand[];
    B_Mask: AnyGerberCommand[];
    B_Paste: AnyGerberCommand[];
    Edge_Cuts: AnyGerberCommand[];
};

/**
 * Converts Circuit JSON to arrays of Gerber commands for each layer
 */
declare const convertSoupToGerberCommands: (circuitJson: AnyCircuitElement[], opts?: {
    flip_y_axis?: boolean;
}) => LayerToGerberCommandsMap;

export { type DrillLayerSpan, convertSoupToExcellonDrillCommandLayers, convertSoupToExcellonDrillCommands, convertSoupToGerberCommands, excellonDrill, gerberBuilder, stringifyExcellonDrill, stringifyGerberCommand, stringifyGerberCommandLayers, stringifyGerberCommands };

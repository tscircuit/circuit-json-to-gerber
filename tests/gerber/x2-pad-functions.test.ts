import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

// Deliberately use identical copper and drill diameters for different functions.
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    num_layers: 4,
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    x: 2,
    y: -2.5,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "inner1", "inner2", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pth",
    shape: "circle",
    x: 3,
    y: 0,
    hole_diameter: 0.3,
    outer_diameter: 0.6,
    layers: ["top", "inner1", "inner2", "bottom"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "smd",
    shape: "circle",
    x: 0,
    y: 0,
    radius: 0.3,
    layer: "top",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route: [
      { route_type: "wire", x: -3, y: 0, layer: "top", width: 0.6 },
      { route_type: "wire", x: -2, y: 0, layer: "top", width: 0.6 },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "route-via",
    route: [
      {
        route_type: "via",
        x: -4,
        y: 2,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 0.3,
        outer_diameter: 0.6,
      },
    ],
  },
  ...[0, 90, 37].map((rotation, i) => ({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: `pill${i}`,
    shape: "pill",
    x: 4 + i * 2,
    y: -1.5,
    hole_width: 0.6,
    hole_height: 1.6,
    outer_width: 1,
    outer_height: 2,
    ccw_rotation: rotation,
    layers: ["top", "bottom"],
  })),
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "smd-pill",
    shape: "rotated_pill",
    x: 0,
    y: 3,
    width: 2,
    height: 1,
    ccw_rotation: 37,
    layer: "top",
    soldermask_margin: 0.05,
  },
] as AnyCircuitElement[]

// Read the serialized X2 dictionary and D-code usage as a CAM consumer would.
const readCopper = (gerber: string) => {
  let apertureFunction: string | undefined
  let selected = ""
  let rotation = 0
  const apertures = new Map<string, { function?: string; definition: string }>()
  const objects: Array<{
    operation: string
    function?: string
    definition?: string
    rotation: number
    line: string
  }> = []
  for (const line of gerber.split("\n")) {
    const attr = line.match(/^%TA\.AperFunction,(.*?)\*%$/)
    if (attr) apertureFunction = attr[1]
    if (line === "%TD*%" || line === "%TD.AperFunction*%")
      apertureFunction = undefined
    const add = line.match(/^%ADD(\d+)(.*?)\*%$/)
    if (add)
      apertures.set(add[1], { function: apertureFunction, definition: add[2] })
    const select = line.match(/^D(\d+)\*$/)
    if (select) selected = select[1]
    const lr = line.match(/^%LR(.*?)\*%$/)
    if (lr) rotation = Number(lr[1])
    const op = line.match(/D0([123])\*$/)
    if (op)
      objects.push({
        operation: op[1],
        ...apertures.get(selected),
        rotation,
        line,
      })
  }
  return { apertures, objects }
}

test("X2 copper functions distinguish equal-size traces, SMT pads, component pads and vias", () => {
  const files = convertCircuitJsonToGerberFiles(circuitJson)
  const { objects, apertures } = readCopper(files["F_Cu.gbr"]!)
  expect(
    new Set(
      [...apertures.values()]
        .filter((a) => a.definition === "C,0.600000")
        .map((a) => a.function),
    ),
  ).toEqual(new Set(["Conductor", "SMDPad,CuDef", "ComponentPad", "ViaPad"]))
  expect(objects.find((o) => o.operation === "1")?.function).toBe("Conductor")
  for (const [coordinate, fn] of [
    ["X002000000Y-02500000", "ViaPad"],
    ["X003000000Y000000000", "ComponentPad"],
    ["X000000000Y000000000", "SMDPad,CuDef"],
    ["X-04000000Y002000000", "ViaPad"],
  ]) {
    expect(
      objects.find((o) => o.operation === "3" && o.line.startsWith(coordinate!))
        ?.function,
    ).toBe(fn)
  }
  for (const layer of ["B_Cu", "In1_Cu", "In2_Cu"]) {
    const { objects } = readCopper(files[`${layer}.gbr`]!)
    expect(
      objects.find(
        (o) => o.operation === "3" && o.line.startsWith("X002000000"),
      )?.function,
    ).toBe("ViaPad")
    expect(
      objects.find(
        (o) => o.operation === "3" && o.line.startsWith("X003000000"),
      )?.function,
    ).toBe("ComponentPad")
  }
  for (const [name, file] of Object.entries(files)) {
    if (!name.endsWith("_Cu.gbr"))
      expect(file).not.toContain("%TA.AperFunction,")
  }
})

test("equal-diameter via and PTH drills use different labelled tools", () => {
  const drill = convertCircuitJsonToGerberFiles(circuitJson)["drill-L1-L4.drl"]!
  expect(drill).toContain(
    "; #@! TA.AperFunction,Plated,PTH,ViaDrill\nT10C0.300000",
  )
  expect(drill).toContain(
    "; #@! TA.AperFunction,Plated,PTH,ComponentDrill\nT11C0.300000",
  )
  const viaDrills = drill.split("T10\n")[1]!.split("T11\n")[0]!
  expect(viaDrills).toContain("X2.0000Y-2.5000")
  expect(viaDrills).toContain("X-4.0000Y2.0000")
  expect(viaDrills).not.toContain("X3.0000Y0.0000")
  expect(drill.split("T11\n")[1]).toContain("X3.0000Y0.0000")
})

for (const flip_y_axis of [false, true]) {
  test(`pill pads use one labelled obround flash with correct rotation (flip=${flip_y_axis})`, () => {
    const files = convertCircuitJsonToGerberFiles(circuitJson, { flip_y_axis })
    for (const layer of ["F_Cu", "B_Cu"]) {
      const { objects } = readCopper(files[`${layer}.gbr`]!)
      const pills = objects.filter((o) => /X00[468]000000Y/.test(o.line))
      expect(pills).toHaveLength(3)
      expect(pills.map((o) => o.operation)).toEqual(["3", "3", "3"])
      expect(pills.map((o) => o.function)).toEqual([
        "ComponentPad",
        "ComponentPad",
        "ComponentPad",
      ])
      expect(pills.map((o) => o.rotation)).toEqual([0, 0, 0])
      expect(pills[0]?.definition).toBe("O,1.000000X2.000000")
      expect(pills[1]?.definition).toBe("O,2.000000X1.000000")
      const params = pills[2]!.definition!.split(",")[1]!.split("X").map(Number)
      expect(params[0]).toBe(1)
      expect(params[1]).toBeCloseTo(-0.5 * Math.sin((37 * Math.PI) / 180), 6)
      expect(params[2]).toBeCloseTo(
        (flip_y_axis ? -1 : 1) * 0.5 * Math.cos((37 * Math.PI) / 180),
        6,
      )
    }
    const smd = readCopper(files["F_Cu.gbr"]!).objects.filter(
      (o) =>
        o.line.startsWith("X000000000Y") &&
        o.function === "SMDPad,CuDef" &&
        o.definition?.startsWith("ROTATEDPILL,"),
    )
    expect(smd).toHaveLength(1)
    expect(smd[0]?.function).toBe("SMDPad,CuDef")
    expect(smd[0]?.rotation).toBe(0)
    expect(smd[0]?.definition).toContain("ROTATEDPILL,1.000000X0.399318X")
    expect(
      readCopper(files["F_Mask.gbr"]!).objects.filter((o) =>
        o.definition?.startsWith("ROTATEDPILL,1.100000X0.399318X"),
      ),
    ).toHaveLength(1)
  })
}

test("a CAM renderer preserves rotated pill bounds for both orientations and Y reflection", async () => {
  const { renderGerberFileSvg } = await import(
    "../fixtures/render-gerber-file-svg"
  )
  for (const [width, height] of [
    [2, 1],
    [1, 2],
  ]) {
    for (const rotation of [0, 37, 90]) {
      for (const flip_y_axis of [false, true]) {
        const pad = {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad",
          layer: "top",
          shape: "rotated_pill",
          x: 3,
          y: 2,
          width,
          height,
          ccw_rotation: rotation,
        } as AnyCircuitElement
        const files = convertCircuitJsonToGerberFiles([circuitJson[0]!, pad], {
          flip_y_axis,
        })
        const { viewBox } = await renderGerberFileSvg(
          files["F_Cu.gbr"]!,
          "pill-bounds",
          "#c83434",
        )
        const diameter = Math.min(width!, height!)
        const length = Math.abs(width! - height!)
        const angle = ((rotation + (width! < height! ? 90 : 0)) * Math.PI) / 180
        const expectedWidth =
          (diameter + length * Math.abs(Math.cos(angle))) * 1000
        const expectedHeight =
          (diameter + length * Math.abs(Math.sin(angle))) * 1000
        expect(viewBox[2]).toBeCloseTo(expectedWidth, 2)
        expect(viewBox[3]).toBeCloseTo(expectedHeight, 2)
        expect(viewBox[0] + viewBox[2] / 2).toBeCloseTo(3000, 2)
        expect(viewBox[1] + viewBox[3] / 2).toBeCloseTo(
          flip_y_axis ? -2000 : 2000,
          2,
        )
      }
    }
  }
})

import { expect, test } from "bun:test"
import { convertCircuitJsonToGerberFiles } from "../../src/index"
import type { AnyCircuitElement } from "circuit-json"

test("exports Gerber X2 TA.AperFunction attributes on copper layer apertures", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { route_type: "wire", x: -5, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 5, y: 0, width: 0.2, layer: "top" },
      ],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "smtpad1",
      shape: "rect",
      x: 0,
      y: 2,
      width: 1,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_via",
      pcb_via_id: "via1",
      x: 2,
      y: 2,
      hole_diameter: 0.3,
      outer_diameter: 0.6,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole1",
      shape: "circle",
      x: -2,
      y: -2,
      hole_diameter: 0.8,
      outer_diameter: 1.6,
      layers: ["top", "bottom"],
    },
  ]

  const files = convertCircuitJsonToGerberFiles(soup)
  const fCu = files["F_Cu.gbr"]
  expect(fCu).toBeDefined()

  // Conductor trace aperture
  expect(fCu).toContain("%TA.AperFunction,Conductor*%")
  expect(fCu).toContain("%ADD10C,0.200000*%")

  // SMDPad aperture
  expect(fCu).toContain("%TA.AperFunction,SMDPad,CuDef*%")
  expect(fCu).toContain("%ADD11R,1.000000X2.000000*%")

  // ViaPad aperture
  expect(fCu).toContain("%TA.AperFunction,ViaPad*%")
  expect(fCu).toContain("%ADD12C,0.600000*%")

  // ComponentPad aperture
  expect(fCu).toContain("%TA.AperFunction,ComponentPad*%")
  expect(fCu).toContain("%ADD13C,1.600000*%")

  // Deletes attributes at end of list
  expect(fCu).toContain("%TD*%")

  // Soldermask layer should not contain Conductor / ViaPad / SMDPad
  const fMask = files["F_Mask.gbr"]
  expect(fMask).toBeDefined()
  expect(fMask).not.toContain("%TA.AperFunction,Conductor*%")
  expect(fMask).not.toContain("%TA.AperFunction,ViaPad*%")
  expect(fMask).not.toContain("%TA.AperFunction,SMDPad,CuDef*%")
})

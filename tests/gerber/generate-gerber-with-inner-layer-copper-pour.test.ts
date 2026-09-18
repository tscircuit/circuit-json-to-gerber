import { expect, test } from "bun:test"
import {
  type AnyCircuitElement,
  type LayerRef,
  type PcbCopperPour,
  pcb_copper_pour,
} from "circuit-json"
import { convertCircuitJsonToGerberFiles } from "src/convert-circuit-json-to-gerber-files"

const pourShapes = ["rect", "polygon", "brep"] as const

const getCopperPour = ({
  shape,
  layer,
  coveredWithSolderMask,
}: {
  shape: PcbCopperPour["shape"]
  layer: LayerRef
  coveredWithSolderMask: boolean
}): PcbCopperPour => {
  const pour = {
    type: "pcb_copper_pour" as const,
    pcb_copper_pour_id: `pour_${layer}`,
    layer,
    covered_with_solder_mask: coveredWithSolderMask,
  }
  const points = [
    { x: 1, y: 1 },
    { x: 1, y: 3 },
    { x: 5, y: 3 },
    { x: 5, y: 1 },
  ]

  if (shape === "rect") {
    return {
      ...pour,
      shape,
      center: { x: 3, y: 2 },
      width: 4,
      height: 2,
    }
  }
  if (shape === "polygon") {
    return { ...pour, shape, points }
  }
  return {
    ...pour,
    shape,
    brep_shape: { outer_ring: { vertices: points }, inner_rings: [] },
  }
}

const getFourLayerCircuit = (pour: PcbCopperPour): AnyCircuitElement[] => [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    material: "fr4",
    num_layers: 4,
    thickness: 1.6,
  },
  // The mask flag is valid in Circuit JSON even for an inner-layer pour.
  pcb_copper_pour.parse(pour),
]

for (const shape of pourShapes) {
  for (const layer of ["inner1", "inner2"] as const) {
    for (const flipYAxis of [false, true]) {
      test(`${shape} pour on ${layer} exports copper without inner soldermask (flip=${flipYAxis})`, async () => {
        const circuitJson = getFourLayerCircuit(
          getCopperPour({ shape, layer, coveredWithSolderMask: false }),
        )
        const files = convertCircuitJsonToGerberFiles(circuitJson, {
          flip_y_axis: flipYAxis,
        })
        const copperFile = layer === "inner1" ? "In1_Cu.gbr" : "In2_Cu.gbr"

        expect(files[copperFile]).toContain("G36*")
        expect(files[copperFile]).toContain("G37*")
        const copperYCoordinates = Array.from(
          files[copperFile].matchAll(/X-?\d+Y(-?\d+)D0[12]\*/g),
          (coordinateMatch) => Number(coordinateMatch[1]),
        )
        expect(Math.min(...copperYCoordinates)).toBe(
          flipYAxis ? -3_000_000 : 1_000_000,
        )
        expect(Math.max(...copperYCoordinates)).toBe(
          flipYAxis ? -1_000_000 : 3_000_000,
        )
        expect(files["F_Mask.gbr"]).not.toContain("G36*")
        expect(files["B_Mask.gbr"]).not.toContain("G36*")
        expect(
          Object.keys(files).filter((name) => name.includes("Mask")),
        ).toEqual(["F_Mask.gbr", "B_Mask.gbr"])

        if (layer === "inner1" && !flipYAxis) {
          await expect({
            In1_Cu: files[copperFile],
          }).toMatchGerberLayerSnapshots(
            import.meta.path,
            `inner-${shape}-pour`,
            ["In1_Cu"],
          )
        }
      })
    }
  }

  for (const layer of ["top", "bottom"] as const) {
    for (const coveredWithSolderMask of [false, true]) {
      test(`${shape} pour on ${layer} preserves outer soldermask behavior (covered=${coveredWithSolderMask})`, () => {
        const circuitJson = getFourLayerCircuit(
          getCopperPour({ shape, layer, coveredWithSolderMask }),
        )
        const files = convertCircuitJsonToGerberFiles(circuitJson)
        const copperFile = layer === "top" ? "F_Cu.gbr" : "B_Cu.gbr"
        const maskFile = layer === "top" ? "F_Mask.gbr" : "B_Mask.gbr"

        expect(files[copperFile]).toContain("G36*")
        expect(files[maskFile].includes("G36*")).toBe(!coveredWithSolderMask)
      })
    }
  }
}

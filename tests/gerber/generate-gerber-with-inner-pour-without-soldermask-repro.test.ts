import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"

// Issue #127: a copper pour on an inner layer with covered_with_solder_mask
// false asks for a soldermask layer that inner layers do not have.
const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    num_layers: 4,
    thickness: 1.6,
    material: "fr4",
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pcb_copper_pour_inner1",
    layer: "inner1",
    shape: "rect",
    center: { x: 0, y: 0 },
    width: 12,
    height: 8,
    covered_with_solder_mask: false,
  },
]

test("repro: inner-layer copper pour without soldermask exports gerbers", async () => {
  await expect(circuitJson).toMatchGerberLayersOrErrorSnapshot(
    import.meta.path,
    "inner-pour-without-soldermask-repro",
    ["In1_Cu"],
  )
})

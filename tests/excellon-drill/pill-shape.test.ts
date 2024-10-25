import { test, expect } from "bun:test"
import { excellonDrill } from "src/excellon-drill"
import { stringifyExcellonDrill } from "src/excellon-drill"

test("test that we can create pill shaped holes", async () => {
  const output_commands = excellonDrill()
    .add("M48", {})
    .add("header_comment", {
      text: "DRILL file {tscircuit} date 2024-04-09T20:34:41-0700",
    })
    .add("FMAT", { format: 2 })
    .add("unit_format", { unit: "METRIC" })
    .add("define_tool", { 
      tool_number: 1,
      width: 1.5,
      height: 2.5,
      shape: "pill" 
    })
    .add("rewind", {})
    .add("G90", {})
    .add("G05", {})
    .add("use_tool", { tool_number: 1 })
    .add("drill_at", { x: 4.9197, y: -2.9724 })
    .add("M30", {})
    .build()

  const output_text = stringifyExcellonDrill(output_commands)

  expect(output_text).toContain("T1C1.500000")
  expect(output_text).toContain("X4.9197Y-2.9724")
})

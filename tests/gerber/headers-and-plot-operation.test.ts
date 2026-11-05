import { expect, test } from "bun:test"
import { plot_operation } from "src/gerber/commands/plot_operation"
import { getCommandHeaders } from "src/gerber/convert-soup-to-gerber-commands/getCommandHeaders"
import { getGerberLayerName } from "src/gerber/convert-soup-to-gerber-commands/getGerberLayerName"
import { getGerberCoordinateWithPadding } from "src/gerber/stringify-gerber/get-gerber-coordinate-with-padding"

test("getCommandHeaders sets Profile,NP for edgecut even when layer_type is provided", () => {
  const headers = getCommandHeaders({
    layer: "edgecut",
    layer_type: "fabrication",
  })
  const fileFunction = headers.find(
    (cmd) => cmd.command_code === "TF" && cmd.attribute_name === "FileFunction",
  )
  expect(fileFunction).toBeDefined()
  if (fileFunction && "attribute_value" in fileFunction) {
    expect(fileFunction.attribute_value).toBe("Profile,NP")
  }
})

test("getCommandHeaders clamps bottom copper layer number to at least L2", () => {
  const headers = getCommandHeaders({
    layer: "bottom",
    layer_type: "copper",
    total_layer_count: 1,
  })
  const fileFunction = headers.find(
    (cmd) => cmd.command_code === "TF" && cmd.attribute_name === "FileFunction",
  )
  expect(fileFunction).toBeDefined()
  if (fileFunction && "attribute_value" in fileFunction) {
    expect(fileFunction.attribute_value).toBe("Copper,L2,Bot")
  }
})

test("getGerberLayerName supports mask alias for soldermask", () => {
  expect(getGerberLayerName("top", "mask")).toBe("F_Mask")
  expect(getGerberLayerName("bottom", "mask")).toBe("B_Mask")
})

test("plot_operation preserves single-axis arc offset when only i or j is provided", () => {
  const onlyI = plot_operation.stringify({
    command_code: "D01",
    x: 1,
    y: 2,
    i: 0.5,
  })
  expect(onlyI).toContain("I000500000J000000000D01*")

  const onlyJ = plot_operation.stringify({
    command_code: "D01",
    x: 1,
    y: 2,
    j: -0.5,
  })
  expect(onlyJ).toContain("I000000000J-00500000D01*")
})

test("getGerberCoordinateWithPadding avoids negative zero for sub-nanometer negative values", () => {
  expect(getGerberCoordinateWithPadding(-1e-9)).toBe("000000000")
  expect(getGerberCoordinateWithPadding(-0)).toBe("000000000")
})

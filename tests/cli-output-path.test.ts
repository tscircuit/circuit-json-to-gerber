import { expect, test } from "bun:test"

test("cli default output path derives correct gerbers zip path", () => {
  const getOutputPath = (input: string, options: { output?: string } = {}) => {
    return (
      options.output ||
      `${input.replace(/(?:\.circuit)?\.json$/i, "")}.gerbers.zip`
    )
  }

  expect(getOutputPath("board.circuit.json")).toBe("board.gerbers.zip")
  expect(getOutputPath("board.json")).toBe("board.gerbers.zip")
  expect(getOutputPath("board")).toBe("board.gerbers.zip")
  expect(getOutputPath("path/to/project.circuit.json/board.json")).toBe(
    "path/to/project.circuit.json/board.gerbers.zip",
  )
  expect(getOutputPath("board.circuit.json", { output: "custom.zip" })).toBe(
    "custom.zip",
  )
})

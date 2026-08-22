import { expect, test } from "bun:test"
import {
  convertCircuitJsonToExcellonDrillCommandLayers,
  convertCircuitJsonToExcellonDrillCommands,
  convertCircuitJsonToGerberCommands,
  convertSoupToExcellonDrillCommandLayers,
  convertSoupToExcellonDrillCommands,
  convertSoupToGerberCommands,
} from "../src"

test("deprecated convertSoup exports remain compatible aliases", () => {
  expect(convertSoupToGerberCommands).toBe(convertCircuitJsonToGerberCommands)
  expect(convertSoupToExcellonDrillCommands).toBe(
    convertCircuitJsonToExcellonDrillCommands,
  )
  expect(convertSoupToExcellonDrillCommandLayers).toBe(
    convertCircuitJsonToExcellonDrillCommandLayers,
  )
})

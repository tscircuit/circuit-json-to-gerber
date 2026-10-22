import { expect, test } from "bun:test"
import packageJson from "../package.json"

test("package.json does not declare tscircuit as a peerDependency", () => {
  // Consumers should be able to convert Circuit JSON to Gerbers without
  // npm automatically pulling the full tscircuit toolchain or React (#200)
  const peerDeps = (packageJson as any).peerDependencies ?? {}
  expect(peerDeps.tscircuit).toBeUndefined()
  expect(peerDeps["circuit-json"]).toBeDefined()
})

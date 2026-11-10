import { expect, test } from "bun:test"
import pkgJson from "../package.json"

test("package.json does not require tscircuit as a peer dependency", () => {
  expect(pkgJson.peerDependencies).not.toHaveProperty("tscircuit")
  expect(pkgJson.devDependencies).toHaveProperty("tscircuit")
})

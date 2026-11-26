import { test } from "bun:test"
import { expectExplicitRectPasteRotation } from "tests/fixtures/legacy-rect-paste-rotation"

test("explicit rect rotation overrides the plated hole, top, flip=true", () => {
  expectExplicitRectPasteRotation({ layer: "top", flip_y_axis: true })
})

import { test } from "bun:test"
import { expectExplicitRectPasteRotation } from "tests/fixtures/legacy-rect-paste-rotation"

test("explicit rect rotation overrides the plated hole, bottom, flip=false", () => {
  expectExplicitRectPasteRotation({ layer: "bottom", flip_y_axis: false })
})

import { test } from "bun:test"
import { expectLegacyRectPasteRotation } from "tests/fixtures/legacy-rect-paste-rotation"

test("legacy rect inherits 30 degrees, top, flip=false, 2.4 x 1.1 without LR", async () => {
  await expectLegacyRectPasteRotation({
    layer: "top",
    flip_y_axis: false,
    rotation: 30,
    width: 2.4,
    height: 1.1,
  })
})

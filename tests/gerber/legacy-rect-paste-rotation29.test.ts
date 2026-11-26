import { test } from "bun:test"
import { expectLegacyRectPasteRotation } from "tests/fixtures/legacy-rect-paste-rotation"

test("legacy rect inherits -45 degrees, bottom, flip=true, 2.4 x 1.1 without LR", async () => {
  await expectLegacyRectPasteRotation({
    layer: "bottom",
    flip_y_axis: true,
    rotation: -45,
    width: 2.4,
    height: 1.1,
  })
})

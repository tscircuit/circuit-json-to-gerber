import { test } from "bun:test"
import { expectLegacyRectPasteSnapshot } from "tests/fixtures/legacy-rect-paste-rotation"

test("legacy rect paste over copper: top, flip=false", async () => {
  await expectLegacyRectPasteSnapshot(import.meta.path, {
    layer: "top",
    flip_y_axis: false,
  })
})

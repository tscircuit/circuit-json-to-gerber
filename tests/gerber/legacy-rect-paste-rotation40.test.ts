import { test } from "bun:test"
import { expectLegacyRectPasteSnapshot } from "tests/fixtures/legacy-rect-paste-rotation"

test("legacy rect paste over copper: bottom, flip=true", async () => {
  await expectLegacyRectPasteSnapshot(import.meta.path, {
    layer: "bottom",
    flip_y_axis: true,
  })
})

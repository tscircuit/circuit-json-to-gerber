import { test } from "bun:test"
import { expectLegacyRectPasteRotation } from "tests/fixtures/legacy-rect-paste-rotation"

test.failing(
  "legacy rect inherits -45 degrees, top, flip=true, 1.1 x 2.4 without LR",
  async () => {
    await expectLegacyRectPasteRotation({
      layer: "top",
      flip_y_axis: true,
      rotation: -45,
      width: 1.1,
      height: 2.4,
    })
  },
)

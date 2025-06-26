import { test, expect } from "bun:test";
import { getAnchoredTextStart } from "src/gerber/convert-soup-to-gerber-commands";

test("compute anchored text start for each alignment", () => {
  const anchor = { x: 10, y: 20 };
  const width = 6;
  const height = 2;
  expect(getAnchoredTextStart(anchor, "center", width, height)).toEqual({
    x: 7,
    y: 19,
  });
  expect(getAnchoredTextStart(anchor, "top_left", width, height)).toEqual({
    x: 10,
    y: 18,
  });
  expect(getAnchoredTextStart(anchor, "top_right", width, height)).toEqual({
    x: 4,
    y: 18,
  });
  expect(getAnchoredTextStart(anchor, "bottom_left", width, height)).toEqual({
    x: 10,
    y: 20,
  });
  expect(
    getAnchoredTextStart(anchor, "bottom_right", width, height),
  ).toEqual({
    x: 4,
    y: 20,
  });
});

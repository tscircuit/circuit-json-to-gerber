# Physical via layer precedence snapshots

The fixture in `../generate-gerber-with-physical-via-layer-precedence.test.ts`
has three physically through-board vias on a four-layer board. From left to
right, their deprecated endpoints describe top–inner1, inner1–inner2, and
top–bottom transitions. The rightmost via is an unchanged control.

Both images overlay the actual exported bottom copper (gold) with only the
through-board Excellon drill file (dark holes), using the repository's
`toMatchGerberLayerOverlaySnapshot` matcher. The same fixture, rendering helper,
and dependencies were used for both images.

- `physical-via-layer-precedence-bottom-before.svg` is a frozen diagnostic
  captured with the exporter source restored to baseline commit `8af19f5`.
  Its three drill files were L1–L2, L2–L3, and L1–L4. Only the control via
  appeared in the through-board drill file; the other two bottom pads have
  no through holes. This is historical evidence, not a passing test expectation.
- `../__snapshots__/physical-via-layer-precedence-bottom.snap.svg` is the
  regression expectation for the fixed exporter. All three holes appear in
  the sole L1–L4 drill file.

Run the snapshot regression with:

```sh
bun test tests/gerber/generate-gerber-with-physical-via-layer-precedence.test.ts
```

The matcher runs before the drill-span assertions so the same test can capture
the baseline image with `BUN_UPDATE_SNAPSHOTS=1`; its subsequent assertions
correctly fail on the unpatched exporter. The fixed exporter also fails the
visual comparison against that baseline image. The checked-in expectation was
then regenerated with the fix restored and verified without snapshot updates.

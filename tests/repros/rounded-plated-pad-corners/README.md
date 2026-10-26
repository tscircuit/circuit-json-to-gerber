# Rounded plated-pad corner loss

Run the reproduction from the repository root:

```sh
bun install
bun test tests/gerber/rounded-plated-pad-corners-repro.test.ts
```

The fixture uses three plated-hole shapes: a circular hole with a rectangular
pad, a pill hole with a rectangular pad, and a rotated pill hole with a
rectangular pad. Every pad is 3.6 × 2.4 mm with `rect_border_radius: 0.6`, a
0.2 mm soldermask margin, and copper on both faces. The last pad is rotated
30 degrees.

Expected: the copper pads retain their rounded corners, and the enlarged
soldermask openings also retain rounded corners.

Actual: all three shapes have sharp copper and mask corners. The renderer
produces exactly the same geometry when the corner radius is changed to zero.
The top and bottom snapshots compare the Circuit JSON view with the current
Gerber output, including the Excellon drill layers so the plated holes and slots
remain visible.

The twelve `test.failing` cases express the expected behavior for each shape
on F_Cu, B_Cu, F_Mask, and B_Mask. They compare independently parsed and rasterized
Gerber geometry, so timestamps and unused aperture definitions cannot make the
comparison pass. Conversion, parsing, and rasterization happen in `beforeAll`;
errors there fail the suite normally. Only the known geometry mismatch is marked
as expected to fail.

This change records the reproduction without modifying exporter behavior.
When fixing the exporter, remove `.failing` and update the two snapshots.

# AM3352 SBC solder-mask reproduction

The native Circuit JSON is downloaded from
[astra/am3352-sbc@0.1.26](https://tscircuit.com/astra/am3352-sbc?version=0.1.26).
This is the 221-component board revision preceding the JST connector update.
The linked project now publishes version 0.1.27; its native JSON also explicitly
requests uncovered outer copper pours.

Pinned download URL:

https://api.tscircuit.com/package_files/download?package_name_with_version=astra%2Fam3352-sbc%400.1.26&file_path=am3352-sbc.circuit.json

`am3352-sbc-v0.1.26.circuit.json.gz` is a lossless gzip of the entire download,
with a zero gzip timestamp. No JSON records or properties were modified. The
uncompressed file is 13,933,017 bytes, with SHA-256:

```text
50ef25b9c11cee983e3fde1113d07907515c20b562f1f0b0bb3159fee11e224c
```

## Reproduce

```sh
bun install
bun test tests/gerber/generate-gerber-with-am3352-sbc-soldermask-repro.test.ts
```

The test decompresses and checks the native file's hash. It omits only inner-layer
copper pours for test runtime; all outer copper, pads, traces, holes, solder-mask
properties and silkscreen are retained. The original and comparison top/bottom
Gerber stackups are committed as SVG snapshots.

For a full export with every inner pour retained:

```sh
gunzip -c tests/gerber/assets/am3352-sbc/am3352-sbc-v0.1.26.circuit.json.gz > /tmp/am3352-sbc.circuit.json
bun src/cli.ts /tmp/am3352-sbc.circuit.json -o /tmp/am3352-sbc.gerbers.zip
```

## Finding

The board has `solder_mask_color: "green"`, but **22 top pours and 17 bottom pours**
have `covered_with_solder_mask: false`. Both solder-mask Gerbers correctly have
`FileFunction,Soldermask` and `FilePolarity,Negative`. The exporter copies those
uncovered pour regions into the corresponding mask-opening files. Large ground
pours therefore expose much of the board's copper; green mask remains over the
protected traces and other copper. This reproduces the reported spatial pattern,
with exposed copper shown in gold by Tracespace instead of JLCPCB's pink.

The comparison changes only copper-pour `covered_with_solder_mask` to `true` in
memory. This removes the large pour openings and restores the green surface while
preserving pad openings, copper and drills. It does not alter the native fixture
or implement an exporter fix. The test checks region counts and unchanged copper
and drill output in addition to the visual snapshots.

## Upstream cause

This is introduced by the project's custom repour scripts, rather than the TSX
props, core conversion, or Gerber exporter. The pinned project's
`routing-source/design/power-planes.tsx` omits `coveredWithSolderMask` for Top
power pours and Bottom GND. Its pinned `@tscircuit/props@0.0.689` schema defaults
that option to `true`. A minimal core render of Top and Bottom pours with the
option omitted also emits `covered_with_solder_mask: true` on both faces.

However, `routing-source/work/repour-branch-stitches-official.v8.ts`, line 56,
constructs new `pcb_copper_pour` records with:

```ts
covered_with_solder_mask: def.layer.startsWith('inner')
```

`routing-source/completion/repour-native.ts` contains the same assignment. It
forces Top and Bottom pours to be uncovered while marking inner pours covered,
without carrying through the TSX's resolved coverage. All 154 native pour records
in this fixture satisfy that rule and have `branch-repour:` IDs matching the
branch repour script's output.

The downloaded `power-planes.tsx.txt` and
`repour-branch-stitches-official.v8.ts.txt` retain the exact upstream source bytes
as evidence; the `.txt` suffix prevents executing or typechecking project-specific
imports in this repository. Both were downloaded from the same pinned version
with `file_path=routing-source/design/power-planes.tsx` and
`file_path=routing-source/work/repour-branch-stitches-official.v8.ts`, respectively.

The source producer should retain the resolved pour coverage instead of deriving
it from whether the layer is internal. This PR is an exporter reproduction and
visual record of that upstream problem, not a proposed core or exporter fix.
It is not a fabrication signoff for the board.

The exported four-layer via fixture passes independent verification in standalone
**gerbv**, using Debian's `gerbv_2.10.0-1+b1_amd64.deb`. No Gerber-generation bug
was found for this fixture. The generator already puts copper and drills on the
correct physical layers; this PR adds coverage and verification evidence.

The `files/` directory contains untouched output from
`convertCircuitJsonToGerberFiles(circuit)` at source commit
`404970b1b3d364df6e045ea53edda8c414f5d594`, using the shared
`tests/fixtures/via-layer-visibility.ts` fixture. Only its four copper files,
board outline, and four Excellon files are included. No coordinates, tools,
metadata, or zero-suppression settings were rewritten for gerbv.

`renders/` contains gerbv's PNG exports. `gerbv-verification.png` adds labels
and stacks those PNGs; it adds no PCB geometry. `verification.json` records
independent pixel checks and SHA-256 hashes of the gerbv binary, input files,
and output images. The checks use explicit expected positions rather than the
generator's layer helpers or an internal renderer.

The five copper views have these occupied positions (left to right: through,
top blind, buried, bottom blind):

- Top: through, top blind.
- Inner1: through, top blind, buried.
- Inner2: all four.
- Bottom: through, bottom blind.
- Overview: all four.

Each drill file was also opened and rendered separately in gerbv, with exactly
one drill in the correct position: L1–L4 through, L1–L3 top blind, L2–L3 buried,
and L3–L4 bottom blind. This avoids conflating a correct composite image with
correct individual manufacturing files.

To reproduce with gerbv and Python/Pillow installed:

```sh
python3 tests/gerber/assets/via-layer-visibility-gerbv/verify.py --gerbv gerbv
```

The script uses a fixed 800×300 viewport at 1270 DPI (50 pixels/mm) and an
origin of −8 mm, −3 mm, expressed in inches for gerbv. Gerbv's default layer
opacity accounts for the colors differing slightly from the Tracespace snapshot.
Gerbv reports unsupported X2 `%TF`/`%TD` file metadata; the script allows only
those messages and rejects other parser warnings. Those attributes do not
change copper or drill geometry. The package's `gerbv -V` string omits its
version, so the package version is recorded here and the binary hash is in the
report.

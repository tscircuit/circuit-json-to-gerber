"""Verify untouched exported files using standalone gerbv, with no tscircuit renderer.

Requires gerbv and Pillow. Run: python3 verify.py --gerbv /path/to/gerbv
Set LD_LIBRARY_PATH if gerbv was unpacked from a package rather than installed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--gerbv", default="gerbv")
args = parser.parse_args()
root = Path(__file__).resolve().parent
files = root / "files"
renders = root / "renders"
renders.mkdir(exist_ok=True)

# Independent expected visibility for the four positions in the original fixture.
# These expectations do not read Circuit JSON or use the generator's layer helpers.
positions = [175, 325, 475, 625]
drills = ["drill-L1-L4.drl", "drill-L1-L3.drl", "drill-L2-L3.drl", "drill-L3-L4.drl"]
views = [
    ("top", [0, 1], [(drills[0], "#ff26e2"), (drills[1], "#ff26e2"), ("F_Cu.gbr", "#c83434")]),
    ("inner1", [0, 1, 2], [(drills[i], "#ff26e2") for i in [0, 1, 2]] + [("In1_Cu.gbr", "#7fc97f")]),
    ("inner2", [0, 1, 2, 3], [(name, "#ff26e2") for name in drills] + [("In2_Cu.gbr", "#ce7d2c")]),
    ("bottom", [0, 3], [(drills[i], "#ff26e2") for i in [0, 3]] + [("B_Cu.gbr", "#4d7fc4")]),
    ("overview", [0, 1, 2, 3], [(name, "#ff26e2") for name in drills] + [("F_Cu.gbr", "#c83434"), ("In1_Cu.gbr", "#7fc97f"), ("In2_Cu.gbr", "#ce7d2c"), ("B_Cu.gbr", "#4d7fc4")]),
]
results = []
logs = []

def render(name, layers):
    output = renders / f"{name}.png"
    command = [args.gerbv, "-x", "png", "-a", "-B", "0", "-D", "1270", "-w", "800x300", "--origin=-0.314961;-0.118110", "-b", "#000000"]
    for _, color in layers:
        command += ["-f", color]
    command += ["-o", str(output)] + [str(files / filename) for filename, _ in layers]
    run = subprocess.run(command, capture_output=True, text=True, check=True)
    messages = [line for line in run.stderr.splitlines() if line.strip()]
    # gerbv 2.10 ignores X2 file metadata. No unsupported geometry is accepted.
    assert all(re.search(r"Unknown RS-274X extension found %(TF|TD)%", line) for line in messages), run.stderr
    logs.append({"view": name, "metadata_warnings": len(messages)})
    image = Image.open(output).convert("RGB")
    assert image.size == (800, 300)
    return image

for name, expected, layers in views:
    image = render(name, layers + [("Edge_Cuts.gbr", "#888888")])
    for i, x in enumerate(positions):
        ring = image.getpixel((x + 19, 150))
        center = image.getpixel((x, 150))
        visible = max(ring) > 20
        hole = center[0] > center[1] + 50 and center[2] > center[1] + 50
        assert visible == (i in expected), (name, i, "copper", ring)
        assert hole == (i in expected), (name, i, "drill", center)
    results.append({"view": name, "visible_positions": expected, "copper_and_drills": "PASS"})

for i, filename in enumerate(drills):
    name = filename.removesuffix(".drl")
    image = render(name, [(filename, "#ff26e2")])
    found = [index for index, x in enumerate(positions) if max(image.getpixel((x, 150))) > 20]
    assert found == [i], (filename, found)
    results.append({"view": name, "visible_positions": found, "drill_span": "PASS"})

# This sheet only labels and combines the unmodified gerbv PNGs.
sheet = Image.new("RGB", (800, 9 * 340 + 90), "#000000")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("DejaVuSans.ttf", 20)
draw.text((20, 15), "Standalone gerbv: copper layers and separate drill spans — PASS", font=font, fill="#4ade80")
draw.text((20, 50), "Left to right: through / top blind / buried / bottom blind", font=font, fill="white")
for index, result in enumerate(results):
    y = 90 + index * 340
    draw.text((20, y + 8), result["view"], font=font, fill="white")
    sheet.paste(Image.open(renders / f'{result["view"]}.png'), (0, y + 40))
sheet.save(root / "gerbv-verification.png")
sha256 = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
binary = Path(shutil.which(args.gerbv) or args.gerbv)
report = {
    "renderer": "Standalone gerbv",
    "gerbv_binary_sha256": sha256(binary),
    "generator_source_commit": "404970b1b3d364df6e045ea53edda8c414f5d594",
    "result": "PASS",
    "scope": "Four-layer through, top-blind, buried, bottom-blind fixture; no tscircuit renderer used",
    "positions": positions,
    "views": results,
    "parser_messages": logs,
    "input_sha256": {p.name: sha256(p) for p in sorted(files.iterdir())},
    "render_sha256": {p.name: sha256(p) for p in sorted(renders.glob("*.png"))},
}
(root / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"result": "PASS", "copper_views": 5, "separate_drill_files": 4}))

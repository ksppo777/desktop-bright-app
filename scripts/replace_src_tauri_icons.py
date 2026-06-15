from pathlib import Path
from PIL import Image

root = Path(r"C:\Users\HAPPYDAY\Desktop\Python Project\App Develop\Apps\latest\icons")
public_icon = Path(r"C:\Users\HAPPYDAY\Desktop\Python Project\App Develop\Apps\latest\public\icon.png")
target = Path(r"C:\Users\HAPPYDAY\Desktop\Python Project\App Develop\Apps\latest\src-tauri\icons")

# Prefer public/icon.png, otherwise use root/icon.ico, otherwise root/icon-512.webp
if public_icon.exists():
    src = public_icon
elif (root / "icon.ico").exists():
    src = root / "icon.ico"
elif (root / "icon-512.webp").exists():
    src = root / "icon-512.webp"
else:
    raise FileNotFoundError("No source icon found in public or root icons folder")

if not target.exists():
    target.mkdir(parents=True)

print(f"Using source icon: {src}")
img = Image.open(src)
img = img.convert("RGBA")

# Generate files from the root icon source
outputs = {
    "icon.ico": None,
    "icon.png": (512, 512),
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "Square30x30Logo.png": (30, 30),
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square89x89Logo.png": (89, 89),
    "Square107x107Logo.png": (107, 107),
    "Square142x142Logo.png": (142, 142),
    "Square150x150Logo.png": (150, 150),
    "Square284x284Logo.png": (284, 284),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
    "icon.icns": None,
}

# Copy or generate icon.ico
if src.suffix.lower() == ".ico":
    (target / "icon.ico").write_bytes(src.read_bytes())
else:
    img.save(target / "icon.ico", format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])

# Generate PNGs
for name, size in outputs.items():
    if name in ["icon.ico", "icon.icns"]:
        continue
    out_path = target / name
    resized = img.resize(size, Image.LANCZOS)
    resized.save(out_path, format="PNG")
    print(f"Created {out_path}")

# Generate icon.icns from the source image
try:
    img.save(target / "icon.icns", format="ICNS")
    print(f"Created {target / 'icon.icns'}")
except Exception as e:
    print(f"Could not create ICNS: {e}")

print("Icon replacement complete.")

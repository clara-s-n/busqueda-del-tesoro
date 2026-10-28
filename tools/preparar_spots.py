"""Crop real spot photos without recreating letters, symbols or wall texture.

Only writes a staging directory. It never replaces the published target assets.
Use --patio PHOTO --capilla PHOTO --output-dir DIR, then inspect the crops before
generating their NFT datasets with generar_nft.cjs.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument('--patio', type=Path, required=True)
parser.add_argument('--capilla', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
args.output_dir.mkdir(parents=True, exist_ok=True)
if (args.output_dir / 'references.json').exists():
    raise SystemExit('Refusing to overwrite an existing reference manifest')

# Bounding boxes on the 1368 x 1824 previews supplied in chat. Coordinates scale
# to the original files after EXIF orientation. Keep real imperfections intact.
cases = [
    ('patio', args.patio, (390, 250, 930, 830), 720,
     'Cartel azul de accesibilidad', 'Saliendo al patio'),
    ('capilla', args.capilla, (100, 550, 1320, 900), 900,
     'Capilla del Encuentro', 'Segundo piso, pasando la sala Bauzá'),
]
manifest = {}
for target, source, crop, maximum, title, location in cases:
    for suffix in ['.jpg', '.png']:
        destination = args.output_dir / (target + suffix)
        if destination.exists():
            raise SystemExit(f'Refusing to overwrite {destination}')
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    x = image.width / 1368
    y = image.height / 1824
    box = tuple(round(value * (x if index % 2 == 0 else y)) for index, value in enumerate(crop))
    reference = image.crop(box)
    reference.thumbnail((maximum, maximum), Image.Resampling.LANCZOS)
    reference.save(args.output_dir / (target + '.png'), dpi=(72, 72))
    reference.save(args.output_dir / (target + '.jpg'), quality=95, dpi=(72, 72))
    manifest[target] = dict(name=title, location=location, width=reference.width,
                            height=reference.height, dpi=72, crop_box=list(box),
                            source_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
(args.output_dir / 'references.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(manifest, ensure_ascii=False, indent=2))

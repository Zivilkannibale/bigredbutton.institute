from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


VARIANTS = {
    "classic": {},
    "sand": {
        (248, 247, 255, 255): (244, 237, 224, 255),
        (175, 170, 189, 255): (192, 180, 159, 255),
        (118, 109, 124, 255): (140, 126, 109, 255),
        (53, 50, 65, 255): (78, 69, 58, 255),
        (194, 61, 74, 255): (170, 117, 69, 255),
        (137, 25, 49, 255): (126, 84, 47, 255),
        (91, 0, 36, 255): (84, 53, 28, 255),
        (150, 205, 249, 255): (145, 214, 232, 255),
        (99, 141, 224, 255): (92, 170, 196, 255),
        (70, 74, 189, 255): (55, 108, 142, 255),
    },
    "plum": {
        (248, 247, 255, 255): (245, 239, 247, 255),
        (175, 170, 189, 255): (192, 174, 195, 255),
        (118, 109, 124, 255): (134, 112, 138, 255),
        (53, 50, 65, 255): (67, 55, 82, 255),
        (194, 61, 74, 255): (156, 96, 149, 255),
        (137, 25, 49, 255): (111, 67, 108, 255),
        (91, 0, 36, 255): (72, 40, 81, 255),
        (150, 205, 249, 255): (164, 214, 245, 255),
        (99, 141, 224, 255): (123, 165, 222, 255),
        (70, 74, 189, 255): (91, 98, 178, 255),
    },
    "slate": {
        (248, 247, 255, 255): (231, 236, 242, 255),
        (175, 170, 189, 255): (171, 181, 196, 255),
        (118, 109, 124, 255): (109, 125, 147, 255),
        (53, 50, 65, 255): (58, 68, 89, 255),
        (194, 61, 74, 255): (88, 115, 147, 255),
        (137, 25, 49, 255): (61, 80, 116, 255),
        (91, 0, 36, 255): (35, 48, 82, 255),
        (150, 205, 249, 255): (171, 214, 242, 255),
        (99, 141, 224, 255): (119, 164, 214, 255),
        (70, 74, 189, 255): (77, 101, 170, 255),
    },
}


def build_variant(source: Image.Image, variant_name: str, output_dir: Path) -> None:
    color_map = VARIANTS[variant_name]
    image = source.copy()
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            rgba = pixels[x, y]
            if rgba in color_map:
                pixels[x, y] = color_map[rgba]
    image.save(output_dir / f"palette-{variant_name}.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    source = Image.open(args.source).convert("RGBA")
    for variant in VARIANTS:
        build_variant(source, variant, output_dir)


if __name__ == "__main__":
    main()

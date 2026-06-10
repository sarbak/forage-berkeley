#!/usr/bin/env python3
"""Generate og.png (1200x630) and apple-touch-icon.png for Forage Berkeley."""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PAPER = (244, 236, 224)
PAPER2 = (236, 224, 207)
INK = (43, 33, 24)
INK_SOFT = (107, 92, 73)
RUST = (168, 66, 31)
SAGE = (94, 107, 67)

SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIF_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
MONO = "/System/Library/Fonts/Menlo.ttc"


def F(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def leaf(d, cx, cy, s, color):
    d.polygon([(cx, cy + s), (cx + s * .55, cy - s * .2),
               (cx, cy - s), (cx - s * .55, cy - s * .2)], fill=color)
    d.line([(cx, cy + s * .8), (cx, cy - s * .8)], fill=INK, width=max(2, s // 16))


def og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    # soft texture blocks
    for i in range(0, W, 60):
        d.line([(i, 0), (i - 200, H)], fill=PAPER2, width=1)
    # accent bar
    d.rectangle([0, 0, 16, H], fill=SAGE)
    leaf(d, 150, 150, 60, SAGE)

    d.text((100, 250), "WILD PLANT FIELD GUIDE", font=F(MONO, 26), fill=RUST)
    d.text((96, 290), "Forage Berkeley", font=F(SERIF_B, 96), fill=INK)
    d.text((100, 420), "A flash-card guide to forageable plants", font=F(SERIF, 40), fill=INK_SOFT)
    d.text((100, 470), "of Berkeley & the East Bay.", font=F(SERIF, 40), fill=INK_SOFT)
    d.text((100, 552), "A learning aid, not a safety authority.", font=F(SERIF, 28), fill=RUST)
    img.save(os.path.join(ROOT, "og.png"), "PNG")
    print("wrote og.png")


def icon():
    S = 180
    img = Image.new("RGB", (S, S), PAPER)
    d = ImageDraw.Draw(img)
    leaf(d, S // 2, S // 2 + 10, 58, SAGE)
    d.ellipse([S // 2 - 14, 26, S // 2 + 14, 54], fill=RUST)
    img.save(os.path.join(ROOT, "apple-touch-icon.png"), "PNG")
    print("wrote apple-touch-icon.png")


if __name__ == "__main__":
    og()
    icon()

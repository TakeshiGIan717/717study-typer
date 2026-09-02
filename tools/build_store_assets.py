"""Generate deterministic Chrome Web Store brand assets."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "chrome-extension" / "icons"
STORE_DIR = ROOT / "store-assets" / "images"
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/segoeui.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
]
RESAMPLE = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS


def font(size: int, bold: bool = False):
    candidates = ([Path("C:/Windows/Fonts/msyhbd.ttc")] if bold else []) + FONT_CANDIDATES
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded_rect(draw, box, radius, fill, outline=None):
    left, top, right, bottom = box
    draw.rectangle((left + radius, top, right - radius, bottom), fill=fill)
    draw.rectangle((left, top + radius, right, bottom - radius), fill=fill)
    draw.pieslice((left, top, left + radius * 2, top + radius * 2), 180, 270, fill=fill)
    draw.pieslice((right - radius * 2, top, right, top + radius * 2), 270, 360, fill=fill)
    draw.pieslice((left, bottom - radius * 2, left + radius * 2, bottom), 90, 180, fill=fill)
    draw.pieslice((right - radius * 2, bottom - radius * 2, right, bottom), 0, 90, fill=fill)
    if outline:
        draw.line((left + radius, top, right - radius, top), fill=outline, width=1)
        draw.line((left + radius, bottom, right - radius, bottom), fill=outline, width=1)
        draw.line((left, top + radius, left, bottom - radius), fill=outline, width=1)
        draw.line((right, top + radius, right, bottom - radius), fill=outline, width=1)


def rounded_gradient(size, top=(37, 99, 235), bottom=(29, 78, 216), radius=24):
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    gradient = Image.new("RGBA", size)
    pixels = gradient.load()
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        for x in range(size[0]): pixels[x, y] = color
    mask = Image.new("L", size, 0)
    rounded_rect(ImageDraw.Draw(mask), (0, 0, size[0] - 1, size[1] - 1), radius, 255)
    image.paste(gradient, (0, 0), mask)
    return image


def build_icon():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    tile = rounded_gradient((96, 96), radius=22)
    canvas.alpha_composite(tile, (16, 16))
    draw = ImageDraw.Draw(canvas)
    f = font(34, bold=True)
    text = "717"
    if hasattr(draw, "textbbox"):
        box = draw.textbbox((0, 0), text, font=f)
        text_width = box[2] - box[0]
    else:
        text_width, _ = draw.textsize(text, font=f)
    draw.text(((128 - text_width)/2, 41), text, font=f, fill="white")
    rounded_rect(draw, (38, 83, 90, 89), 3, (191, 219, 254, 255))
    canvas.save(ICON_DIR / "icon-128.png")
    for size in (16, 32, 48):
        canvas.resize((size, size), RESAMPLE).save(ICON_DIR / f"icon-{size}.png")
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(STORE_DIR / "icon-128.png")


def build_promo(width, height, name):
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (width, height), (12, 30, 72))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t=y/max(1,height-1); color=(round(12+18*t),round(30+40*t),round(72+90*t))
        draw.line((0,y,width,y),fill=color)
    margin=max(30,width//18); icon_size=min(height-70,width//5)
    icon=Image.open(ICON_DIR/"icon-128.png").resize((icon_size,icon_size),RESAMPLE)
    rounded_rect(draw, (margin,margin,width-margin,height-margin), max(18,height//14), (30,57,110), (96,165,250))
    image.paste(icon,(margin+18,(height-icon_size)//2),icon)
    x=margin+icon_size+(28 if width <= 500 else 42)
    title_size=max(24,min(54,width//20)); sub_size=max(15,min(26,width//38))
    draw.text((x,height*.34),"717study.com 打字机",font=font(title_size,True),fill="white")
    draw.text((x,height*.55),"本地文档 · 可配置节奏 · 当前网页输入",font=font(sub_size),fill=(191,219,254))
    image.save(STORE_DIR/name,quality=95)


if __name__ == "__main__":
    build_icon()
    build_promo(440, 280, "promo-small-440x280.png")
    build_promo(1400, 560, "promo-marquee-1400x560.png")
    print(f"Generated assets in {ICON_DIR} and {STORE_DIR}")

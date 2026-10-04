"""NoteTree 로고(후보 85번 '책 새싹')를 PNG로 그린다. 모양의 원본은 public/favicon.svg와 같다.

    python design/logo/make_icon.py        # 아래 OUT의 파일을 전부 다시 만든다

SVG를 PNG로 바꾸는 도구가 이 PC에 없어서 PIL로 직접 그린다. 4배로 크게 그린 뒤 줄여 가장자리를 부드럽게 한다.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

BG, FG, AC = '#4f46e5', '#ffffff', '#c7d2fe'
SS = 4  # 크게 그렸다가 줄이는 배수
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def bezier(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def leaf(x, y, rot, length, wid):
    """밑동 (x, y)에서 위로 length만큼 뻗고 rot도 돌린 잎 (후보 페이지의 lf와 같다)."""
    pts = (bezier((0, 0), (-wid, -length * 0.3), (-wid, -length * 0.75), (0, -length))
           + bezier((0, -length), (wid, -length * 0.75), (wid, -length * 0.3), (0, 0)))
    a = math.radians(rot)
    return [(x + px * math.cos(a) - py * math.sin(a), y + px * math.sin(a) + py * math.cos(a)) for px, py in pts]


BOOK = (bezier((64, 112), (40, 100), (24, 100), (14, 104)) + [(14, 70)]
        + bezier((14, 70), (24, 66), (40, 66), (64, 78))
        + bezier((64, 78), (88, 66), (104, 66), (114, 70)) + [(114, 104)]
        + bezier((114, 104), (104, 100), (88, 100), (64, 112)))


def draw_mark(d, ox, oy, k):
    """128×128 좌표의 그림을 (ox, oy)에서 k배로 그린다."""
    P = lambda pts: [(ox + x * k, oy + y * k) for x, y in pts]

    def stroke(a, b, width, color):
        (x1, y1), (x2, y2) = P([a, b])
        r = width * k / 2
        d.line((x1, y1, x2, y2), fill=color, width=round(width * k))
        for x, y in ((x1, y1), (x2, y2)):  # 둥근 끝
            d.ellipse((x - r, y - r, x + r, y + r), fill=color)

    d.polygon(P(BOOK), fill=FG)
    stroke((64, 80), (64, 110), 4, BG)   # 책등
    stroke((64, 78), (64, 44), 6, AC)    # 줄기
    d.polygon(P(leaf(64, 56, -50, 34, 13)), fill=AC)
    d.polygon(P(leaf(64, 48, 46, 36, 13)), fill=AC)


def icon(size):
    img = Image.new('RGB', (size * SS, size * SS), BG)
    draw_mark(ImageDraw.Draw(img), 0, 0, size * SS / 128)
    return img.resize((size, size), Image.LANCZOS)


def og():
    """링크를 메신저에 붙였을 때 보이는 미리보기 (1200×630)."""
    w, h = 1200 * SS, 630 * SS
    img = Image.new('RGB', (w, h), BG)
    d = ImageDraw.Draw(img)
    draw_mark(d, 130 * SS, 165 * SS, 300 * SS / 128)
    fonts = 'C:/Windows/Fonts/'
    d.text((470 * SS, 215 * SS), 'NoteTree', font=ImageFont.truetype(fonts + 'segoeuib.ttf', 120 * SS), fill=FG)
    d.text((476 * SS, 375 * SS), '노트가 달린 마인드맵', font=ImageFont.truetype(fonts + 'malgunbd.ttf', 46 * SS), fill=AC)
    return img.resize((1200, 630), Image.LANCZOS)


OUT = {
    'public/apple-touch-icon.png': lambda: icon(180),
    'public/og.png': og,
    'design/logo/notetree-icon-128.png': lambda: icon(128),
    'design/logo/notetree-icon-256.png': lambda: icon(256),
    'design/logo/notetree-icon-512.png': lambda: icon(512),
}

if __name__ == '__main__':
    for path, make in OUT.items():
        make().save(os.path.join(ROOT, path), optimize=True)
        print(path)

"""Génère le logotype ECONOM. en tracés vectoriels (aucune dépendance à une police à l'affichage).
Usage : python3 scripts/build-brand.py <Archivo-Italic[wdth,wght].ttf> <dossier de sortie>
Police source : Archivo (SIL Open Font License) — les contours sont convertis en tracés puis retravaillés."""
import json, math, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

src, out = sys.argv[1], sys.argv[2]
VIOLET, LIME, IVORY, INK = "#5638F5", "#D8FF55", "#F8F8F2", "#171529"
font = instantiateVariableFont(TTFont(src), {"wght": 900, "wdth": 92})
gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
cap = font["OS/2"].sCapHeight
slant = math.tan(math.radians(-font["post"].italicAngle))
TRACK = -34  # resserrage optique du mot

def glyph_path(ch, x):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, cap)))
    bp = BoundsPen(gs); gs[name].draw(bp)
    return pen.getCommands(), hmtx[name][0], bp.bounds

x, parts, right = 0, [], 0
for ch in "ECONOM":
    d, adv, b = glyph_path(ch, x)
    parts.append(d); right = x + b[2]; x += adv + TRACK
word = " ".join(parts)

# Point final : carré incliné comme l'italique, coins arrondis — signature de la marque.
ds = cap * 0.30; gap = cap * 0.075; r = ds * 0.24
dx0 = right + gap
def dot_path(x0, y_bottom, s, rad):
    # parallélogramme arrondi (inclinaison = pente de l'italique), tracé dans le sens horaire
    k = slant
    P = [(x0 + k * s, y_bottom - s), (x0 + s + k * s, y_bottom - s), (x0 + s, y_bottom), (x0, y_bottom)]
    def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    d = []
    for i in range(4):
        p0, p1, p2 = P[i - 1], P[i], P[(i + 1) % 4]
        l1 = math.dist(p0, p1); l2 = math.dist(p1, p2)
        a = lerp(p1, p0, rad / l1); b = lerp(p1, p2, rad / l2)
        d.append(("M" if i == 0 else "L") + "%.1f %.1f" % a + "Q%.1f %.1f %.1f %.1f" % (p1[0], p1[1], b[0], b[1]))
    return "".join(d) + "Z"
dot = dot_path(dx0, cap, ds, r)
W = dx0 + ds + slant * ds; H = cap
pad = 0

def svg(w, h, body, vb=None, label="ECONOM."):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb or f"0 0 {w:.0f} {h:.0f}"}" role="img" aria-label="{label}">{body}</svg>\n'

def wordmark(fill, dotfill):
    return svg(W, H, f'<path fill="{fill}" d="{word}"/><path fill="{dotfill}" d="{dot}"/>')

# Symbole : « E » en trois barres inclinées + point. Lisible dès 16 px.
def symbol_paths(size=512):
    k = slant; u = size / 512
    bar_h, gap_y = 78 * u, 40 * u
    top = (size - (3 * bar_h + 2 * gap_y)) / 2
    x0 = 108 * u; widths = [262 * u, 196 * u, 180 * u]
    bars = []
    for i, w in enumerate(widths):
        y = top + i * (bar_h + gap_y)
        shift = (size / 2 - (y + bar_h / 2)) * k  # aligne les barres sur l'axe incliné
        xa = x0 + shift
        bars.append(dot_path(xa, y + bar_h, bar_h, 14 * u).replace("M", "M", 1) if False else
                    bar(xa, y, w, bar_h, k, 16 * u))
    yb = top + 2 * (bar_h + gap_y)
    shift = (size / 2 - (yb + bar_h / 2)) * k
    d = dot_path(x0 + shift + widths[2] + 30 * u, yb + bar_h, bar_h, 18 * u)
    return " ".join(bars), d
def bar(x, y, w, h, k, rad):
    P = [(x + k * h, y), (x + w + k * h, y), (x + w, y + h), (x, y + h)]
    def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    d = []
    for i in range(4):
        p0, p1, p2 = P[i - 1], P[i], P[(i + 1) % 4]
        a = lerp(p1, p0, rad / math.dist(p0, p1)); b = lerp(p1, p2, rad / math.dist(p1, p2))
        d.append(("M" if i == 0 else "L") + "%.1f %.1f" % a + "Q%.1f %.1f %.1f %.1f" % (p1[0], p1[1], b[0], b[1]))
    return "".join(d) + "Z"

bars, sdot = symbol_paths()
def icon(bg, fg, dotc, radius=116, maskable=False):
    inner = f'<path fill="{fg}" d="{bars}"/><path fill="{dotc}" d="{sdot}"/>'
    if maskable:  # zone de sécurité 80 %
        return svg(512, 512, f'<rect width="512" height="512" fill="{bg}"/><g transform="translate(64 64) scale(.75)">{inner}</g>')
    return svg(512, 512, f'<rect width="512" height="512" rx="{radius}" fill="{bg}"/>{inner}')

files = {
    "econom-wordmark.svg": wordmark(INK, VIOLET),
    "econom-wordmark-on-violet.svg": wordmark(IVORY, LIME),
    "econom-wordmark-on-dark.svg": wordmark(IVORY, LIME),
    "econom-wordmark-mono.svg": wordmark(INK, INK),
    "econom-symbol.svg": svg(512, 512, f'<path fill="{VIOLET}" d="{bars}"/><path fill="{LIME}" d="{sdot}"/>'),
    "econom-icon.svg": icon(VIOLET, IVORY, LIME),
    "econom-icon-dark.svg": icon(INK, IVORY, LIME),
    "econom-icon-maskable.svg": icon(VIOLET, IVORY, LIME, maskable=True),
    "econom-wordmark-mint.svg": wordmark("#0E2F28", "#3DBE82"),
    "econom-wordmark-signal.svg": wordmark("#0B3DFF", "#FF6A3D"),
}
for name, content in files.items():
    open(f"{out}/{name}", "w").write(content)
json.dump({"viewBox": [round(W), round(H)], "word": word, "dot": dot, "bars": bars, "symbolDot": sdot}, open(f"{out}/paths.json", "w"))
print("ok", round(W), round(H), "slant", round(slant, 3))

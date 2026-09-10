#!/usr/bin/env python3
"""
EGGWORKS - the game's typeface, drawn as pixels and packed into a TrueType file.

Every glyph is a little grid of on/off cells, exactly as it would be drawn on a
sprite sheet. This script turns each row of on-cells into a rectangle, packs the
rectangles into TrueType contours and writes a font. Because one cell is a whole
number of font units (128 of 1024 to the em, so ten cells to the em box), the
face renders with hard pixel edges at any font-size that is a multiple of 8.

The bold weight is the same skeleton dilated one cell to the right, on a wider
advance, so both weights come from one set of drawings.

    python3 tools/mkfont.py           # writes tools/eggworks.css

The stylesheet it writes carries both weights as base64 @font-face rules, ready
to paste into style.css.
"""
import struct, base64, os

UPEM = 1024
CELL = 128            # font units per drawn cell: ten cells to the em
BASE = 8              # cells above the baseline (row BASE sits on it)
ADV  = 6              # cells of advance for a normal glyph

# ---------------------------------------------------------------- the drawings
# Each entry is (first row the drawing occupies, the rows themselves).
# Row 1 is the cap line, row 7 rests on the baseline, rows 8-9 are descender.
G = {}
def g(ch, top, *rows): G[ch] = (top, list(rows))

# ---- capitals: five cells wide, seven tall, flat terminals ----
g('A', 1, '.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')
g('B', 1, '####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.')
g('C', 1, '.####', '#....', '#....', '#....', '#....', '#....', '.####')
g('D', 1, '####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.')
g('E', 1, '#####', '#....', '#....', '####.', '#....', '#....', '#####')
g('F', 1, '#####', '#....', '#....', '####.', '#....', '#....', '#....')
g('G', 1, '.####', '#....', '#....', '#..##', '#...#', '#...#', '.####')
g('H', 1, '#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')
g('I', 1, '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####')
g('J', 1, '..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..')
g('K', 1, '#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#')
g('L', 1, '#....', '#....', '#....', '#....', '#....', '#....', '#####')
g('M', 1, '#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#')
g('N', 1, '#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#')
g('O', 1, '.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('P', 1, '####.', '#...#', '#...#', '####.', '#....', '#....', '#....')
g('Q', 1, '.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#')
g('R', 1, '####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#')
g('S', 1, '.####', '#....', '#....', '.###.', '....#', '....#', '####.')
g('T', 1, '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..')
g('U', 1, '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('V', 1, '#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..')
g('W', 1, '#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#')
g('X', 1, '#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#')
g('Y', 1, '#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..')
g('Z', 1, '#####', '....#', '...#.', '..#..', '.#...', '#....', '#####')

# ---- figures: same weight as the capitals, so tables line up ----
g('0', 1, '.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.')
g('1', 1, '..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####')
g('2', 1, '.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####')
g('3', 1, '####.', '....#', '....#', '.###.', '....#', '....#', '####.')
g('4', 1, '...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.')
g('5', 1, '#####', '#....', '#....', '####.', '....#', '....#', '####.')
g('6', 1, '..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.')
g('7', 1, '#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...')
g('8', 1, '.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.')
g('9', 1, '.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..')

# ---- lower case: x-height of five, ascenders and descenders of two ----
g('a', 3, '.###.', '....#', '.####', '#...#', '.####')
g('b', 1, '#....', '#....', '####.', '#...#', '#...#', '#...#', '####.')
g('c', 3, '.####', '#....', '#....', '#....', '.####')
g('d', 1, '....#', '....#', '.####', '#...#', '#...#', '#...#', '.####')
g('e', 3, '.###.', '#...#', '#####', '#....', '.####')
g('f', 1, '..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...')
g('g', 3, '.####', '#...#', '#...#', '.####', '....#', '....#', '####.')
g('h', 1, '#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#')
g('i', 1, '..#..', '.....', '.###.', '..#..', '..#..', '..#..', '.###.')
g('j', 1, '...#.', '.....', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..')
g('k', 1, '#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.')
g('l', 1, '.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.')
g('m', 3, '#####', '#.#.#', '#.#.#', '#.#.#', '#.#.#')
g('n', 3, '####.', '#...#', '#...#', '#...#', '#...#')
g('o', 3, '.###.', '#...#', '#...#', '#...#', '.###.')
g('p', 3, '####.', '#...#', '#...#', '####.', '#....', '#....', '#....')
g('q', 3, '.####', '#...#', '#...#', '.####', '....#', '....#', '....#')
g('r', 3, '#.##.', '##...', '#....', '#....', '#....')
g('s', 3, '.####', '#....', '.###.', '....#', '####.')
g('t', 1, '.#...', '.#...', '####.', '.#...', '.#...', '.#...', '.###.')
g('u', 3, '#...#', '#...#', '#...#', '#...#', '.####')
g('v', 3, '#...#', '#...#', '#...#', '.#.#.', '..#..')
g('w', 3, '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.')
g('x', 3, '#...#', '.#.#.', '..#..', '.#.#.', '#...#')
g('y', 3, '#...#', '#...#', '#...#', '.####', '....#', '....#', '####.')
g('z', 3, '#####', '...#.', '..#..', '.#...', '#####')

# ---- punctuation and marks ----
g('!', 1, '..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..')
g('"', 1, '.#.#.', '.#.#.')
g('#', 2, '.#.#.', '#####', '.#.#.', '#####', '.#.#.')
g('$', 1, '..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..')
g('%', 1, '##..#', '##.#.', '..#..', '.#...', '#.##.', '..##.', '.....')
g('&', 1, '.##..', '#..#.', '#..#.', '.##..', '#.#.#', '#..#.', '.##.#')
g("'", 1, '..#..', '..#..')
g('(', 1, '...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.')
g(')', 1, '.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...')
g('*', 1, '..#..', '#.#.#', '.###.', '#.#.#', '..#..')
g('+', 3, '..#..', '..#..', '#####', '..#..', '..#..')
g(',', 7, '..#..', '.#...')
g('-', 5, '.###.')
g('.', 7, '..#..')
g('/', 1, '....#', '....#', '...#.', '..#..', '.#...', '#....', '#....')
g(':', 4, '..#..', '.....', '..#..')
g(';', 4, '..#..', '.....', '..#..', '.#...')
g('<', 3, '...#.', '..#..', '.#...', '..#..', '...#.')
g('=', 4, '.###.', '.....', '.###.')
g('>', 3, '.#...', '..#..', '...#.', '..#..', '.#...')
g('?', 1, '.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..')
g('@', 1, '.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.####')
g('[', 1, '.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.')
g('\\', 1, '#....', '#....', '.#...', '..#..', '...#.', '....#', '....#')
g(']', 1, '.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.')
g('^', 1, '..#..', '.#.#.', '#...#')
g('_', 8, '#####')
g('`', 1, '.#...', '..#..')
g('{', 1, '..##.', '..#..', '..#..', '.##..', '..#..', '..#..', '..##.')
g('|', 1, '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..')
g('}', 1, '.##..', '..#..', '..#..', '..##.', '..#..', '..#..', '.##..')
g('~', 4, '.#..#', '#.#.#', '#..#.')
g('‘', 1, '..#..', '.#...')
g('’', 1, '..#..', '..#..')
g('“', 1, '.#.#.', '#.#..')
g('”', 1, '.#.#.', '.#.#.')
g('–', 5, '#####')
g('—', 5, '#####')
g('…', 7, '#.#.#')
g('°', 1, '.##..', '#..#.', '.##..')
g('×', 3, '#...#', '.#.#.', '..#..', '.#.#.', '#...#')
g('•', 4, '.###.', '.###.', '.###.')

SPACE_ADV = ADV

# ------------------------------------------------------------- pixels to rects
def rects(top, rows, dilate=0):
    """Horizontal runs of on-cells, as (x0, y0, x1, y1) in font units."""
    out = []
    for i, row in enumerate(rows):
        r = top + i
        on = [c == '#' for c in row]
        at = lambda c: 0 <= c < len(on) and on[c]
        if dilate:
            # Bold smears every run one cell to the right, under one rule:
            # never close a one-cell counter - a gap with ink on both sides
            # stays a gap. Bars grow with the stems they meet, so the apex of
            # 'A' still lands on its right stem. Letterforms that the smear
            # cannot survive are listed in NO_DILATE instead.
            cells = [at(c) or (at(c - 1) and not at(c + 1))
                     for c in range(len(on) + dilate)]
        else:
            cells = on
        c = 0
        while c < len(cells):
            if not cells[c]:
                c += 1
                continue
            s = c
            while c < len(cells) and cells[c]:
                c += 1
            out.append((s * CELL, (BASE - r - 1) * CELL, c * CELL, (BASE - r) * CELL))
    return out

# --------------------------------------------------------------- TrueType bits
def glyf_glyph(rs):
    if not rs:
        return b''
    xs = [v for r in rs for v in (r[0], r[2])]
    ys = [v for r in rs for v in (r[1], r[3])]
    pts, ends = [], []
    for (x0, y0, x1, y1) in rs:                      # clockwise, y up
        pts += [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]
        ends.append(len(pts) - 1)
    d = struct.pack('>hhhhh', len(ends), min(xs), min(ys), max(xs), max(ys))
    d += b''.join(struct.pack('>H', e) for e in ends)
    d += struct.pack('>H', 0)                        # no instructions
    d += bytes([0x01]) * len(pts)                    # every point on-curve
    px = py = 0
    xb = yb = b''
    for (x, y) in pts:
        xb += struct.pack('>h', x - px); px = x
        yb += struct.pack('>h', y - py); py = y
    d += xb + yb
    return d + (b'\0' * (-len(d) % 4))

def table_dir(tables):
    tags = sorted(tables)
    n = len(tags)
    sr = (2 ** (n.bit_length() - 1)) * 16
    head = struct.pack('>IHHHH', 0x00010000, n, sr, n.bit_length() - 1, n * 16 - sr)
    off = len(head) + 16 * n
    recs, body = b'', b''
    for t in tags:
        d = tables[t]
        pad = d + b'\0' * (-len(d) % 4)
        recs += t.encode('ascii').ljust(4)[:4] + struct.pack('>III', csum(d), off, len(d))
        body += pad
        off += len(pad)
    return head + recs + body

def csum(d):
    d = d + b'\0' * (-len(d) % 4)
    return sum(struct.unpack('>%dI' % (len(d) // 4), d)) & 0xFFFFFFFF

def name_table(family, sub, ps):
    strings = [(1, family), (2, sub), (3, 'Eggworks:' + sub), (4, family + ' ' + sub),
               (5, 'Version 1.000'), (6, ps)]
    recs, store = b'', b''
    for nid, s in strings:
        b = s.encode('utf-16-be')
        recs += struct.pack('>HHHHHH', 3, 1, 0x409, nid, len(b), len(store))
        store += b
    return struct.pack('>HHH', 0, len(strings), 6 + 12 * len(strings)) + recs + store

# 'W' and 'M' are the shapes six cells cannot hold in bold: two stems two
# cells wide leave only two columns in the middle, so the inner strokes either
# merge with a stem or jog a column and the letter reads as an 'N'. A slightly
# lighter stroke beats an illegible one, so these keep the thin skeleton.
NO_DILATE = set('WwMm')


def build(weight, dilate, adv_cells, path_family='Eggworks'):
    chars = sorted(G)
    order = [None] + [' '] + chars                   # .notdef, space, then the drawings
    advance = {}
    outlines = {}
    for i, ch in enumerate(order):
        if ch is None:
            outlines[i] = []
            advance[i] = adv_cells * CELL
        elif ch == ' ':
            outlines[i] = []
            advance[i] = adv_cells * CELL
        else:
            top, rows = G[ch]
            outlines[i] = rects(top, rows, 0 if ch in NO_DILATE else dilate)
            advance[i] = adv_cells * CELL
    nglyphs = len(order)

    glyf, loca = b'', [0]
    for i in range(nglyphs):
        glyf += glyf_glyph(outlines[i])
        loca.append(len(glyf))
    allr = [r for i in range(nglyphs) for r in outlines[i]]
    xmin = min([r[0] for r in allr] or [0]); xmax = max([r[2] for r in allr] or [0])
    ymin = min([r[1] for r in allr] or [0]); ymax = max([r[3] for r in allr] or [0])

    asc, desc = BASE * CELL, (10 - BASE) * CELL
    t = {}
    t['head'] = struct.pack('>IIIIHHqqhhhhHHhhh', 0x00010000, 0x00010000, 0,
                            0x5F0F3CF5, 0x000B, UPEM, 0, 0, xmin, ymin, xmax, ymax,
                            0x0020 if weight > 400 else 0, 8, 2, 1, 0)
    t['hhea'] = struct.pack('>IhhhHhhhhhhhhhhhH', 0x00010000, asc, -desc, 0,
                            adv_cells * CELL, xmin, 0, xmax, 1, 0, 0, 0, 0, 0, 0, 0, nglyphs)
    t['maxp'] = struct.pack('>IH', 0x00010000, nglyphs) + struct.pack('>13H',
                            max(len(o) * 4 for o in outlines.values()) or 4,
                            max(len(o) for o in outlines.values()) or 1,
                            0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)
    t['hmtx'] = b''.join(struct.pack('>Hh', advance[i], 0) for i in range(nglyphs))
    t['loca'] = b''.join(struct.pack('>I', v) for v in loca)
    t['glyf'] = glyf
    t['post'] = struct.pack('>IIhhIIIII', 0x00030000, 0, -CELL, CELL, 1, 0, 0, 0, 0)
    t['name'] = name_table(path_family, 'Bold' if weight > 400 else 'Regular',
                           path_family + ('-Bold' if weight > 400 else '-Regular'))

    # cmap format 4, one segment per run of consecutive code points
    cps = sorted((ord(c), i) for i, c in enumerate(order) if c not in (None, ' '))
    cps.insert(0, (32, 1))
    segs = []
    for cp, gi in cps:
        if segs and cp == segs[-1][1] + 1 and gi == segs[-1][2] + (segs[-1][1] - segs[-1][0]) + 1:
            segs[-1][1] = cp
        else:
            segs.append([cp, cp, gi])
    segs.append([0xFFFF, 0xFFFF, 0])
    n = len(segs)
    sub = struct.pack('>HHHHHHH', 4, 16 + 8 * n, 0, n * 2,
                      2 ** (n.bit_length() - 1) * 2, n.bit_length() - 1,
                      n * 2 - 2 ** (n.bit_length() - 1) * 2)
    sub += b''.join(struct.pack('>H', s[1]) for s in segs) + struct.pack('>H', 0)
    sub += b''.join(struct.pack('>H', s[0]) for s in segs)
    sub += b''.join(struct.pack('>H', ((s[2] - s[0]) & 0xFFFF) if s[0] != 0xFFFF else 1) for s in segs)
    sub += b''.join(struct.pack('>H', 0) for s in segs)
    t['cmap'] = struct.pack('>HHHHI', 0, 1, 3, 1, 12) + sub

    t['OS/2'] = struct.pack('>HhHHHhhhhhhhhhhh', 4, adv_cells * CELL, weight, 5, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    t['OS/2'] += bytes([2, 0, 9 if weight > 400 else 6, 9, 2, 1, 1, 1, 1, 1])
    t['OS/2'] += struct.pack('>IIII', 0x8000003F, 0, 0, 0) + b'EGGW'
    t['OS/2'] += struct.pack('>HHHhhhHHIIhhHHH', 0x0020 if weight > 400 else 0x0040,
                             32, 0x2026, asc, -desc, 0, asc, desc, 1, 0,
                             5 * CELL, 7 * CELL, 32, 32, 4)

    font = table_dir(t)
    # head.checkSumAdjustment, patched in place once the whole file exists
    total = csum(font)
    adj = (0xB1B0AFBA - total) & 0xFFFFFFFF
    i = font.index(b'head')
    off = struct.unpack('>I', font[i + 8:i + 12])[0]
    return font[:off + 8] + struct.pack('>I', adj) + font[off + 12:]

here = os.path.dirname(os.path.abspath(__file__))
css = ["/* EGGWORKS - the game's own pixel typeface. Built by tools/mkfont.py;",
       "   one drawn cell is 128 of 1024 units, so any font-size that is a",
       "   multiple of 8 lands on whole pixels and renders with hard edges. */"]
for weight, dilate, adv in ((400, 0, ADV), (700, 1, ADV + 1)):
    data = build(weight, dilate, adv)
    open(os.path.join(here, 'eggworks-%d.ttf' % weight), 'wb').write(data)
    b64 = base64.b64encode(data).decode('ascii')
    css.append("@font-face{font-family:'Eggworks';font-style:normal;font-weight:%d;"
               "font-display:block;src:url(data:font/ttf;base64,%s) format('truetype');}"
               % (weight, b64))
    print('weight %d: %d bytes ttf, %d bytes base64' % (weight, len(data), len(b64)))
open(os.path.join(here, 'eggworks.css'), 'w').write('\n'.join(css) + '\n')
print('glyphs:', len(G) + 2, '-> tools/eggworks.css')

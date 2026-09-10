/* ============================================================
   INF EGG CO. — procedural pixel art engine
   Everything here is generated in code: no images, no emoji.
   - seeded RNG so every tree/bush/rock is unique but stable
   - blob masks + automatic light/shade/outline passes
   - a 3x5 pixel font
   - icon set, chickens, eggs, foliage, machines, hexes
   ============================================================ */
'use strict';

const SPR = (() => {

  /* ---------- color helpers ---------- */
  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function darken(hex, f) { const [r, g, b] = hexRgb(hex); return rgbHex(r * (1 - f), g * (1 - f), b * (1 - f)); }
  function lighten(hex, f) { const [r, g, b] = hexRgb(hex); return rgbHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); }
  function lum(hex) { const [r, g, b] = hexRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  /* push a color toward a hue-ish tint (warm sunlight / cool shade) */
  function warm(hex, f) { const [r, g, b] = hexRgb(hex); return rgbHex(r + 30 * f, g + 16 * f, b - 10 * f); }
  function cool(hex, f) { const [r, g, b] = hexRgb(hex); return rgbHex(r - 18 * f, g - 8 * f, b + 22 * f); }

  /* ---------- seeded rng ---------- */
  function mulberry(seed) {
    let a = (seed | 0) + 0x6D2B79F5;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const cache = new Map();
  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  }
  function px(ctx, x, y, k, col) { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, k, k); }
  function drawGrid(ctx, rows, pal, ox, oy, k) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x * k, oy + y * k, k, k);
      }
    }
  }

  /* ============================================================
     3x5 PIXEL FONT
     Three columns cannot hold a diagonal, so 'M', 'H' and 'W' are
     told apart by where their crossbar sits - top, middle, bottom.
     Two full rows in a row read as a solid blob at sign size, which
     is how 'WORK' used to come out as 'NORK'.
     ============================================================ */
  const FONT = {
    A: [' # ', '# #', '###', '# #', '# #'],
    B: ['## ', '# #', '## ', '# #', '## '],
    C: [' ##', '#  ', '#  ', '#  ', ' ##'],
    D: ['## ', '# #', '# #', '# #', '## '],
    E: ['###', '#  ', '## ', '#  ', '###'],
    F: ['###', '#  ', '## ', '#  ', '#  '],
    G: [' ##', '#  ', '# #', '# #', ' ##'],
    H: ['# #', '# #', '###', '# #', '# #'],
    I: ['###', ' # ', ' # ', ' # ', '###'],
    J: ['  #', '  #', '  #', '# #', ' # '],
    K: ['# #', '# #', '## ', '# #', '# #'],
    L: ['#  ', '#  ', '#  ', '#  ', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    N: ['## ', '# #', '# #', '# #', '# #'],
    O: [' # ', '# #', '# #', '# #', ' # '],
    P: ['## ', '# #', '## ', '#  ', '#  '],
    Q: [' # ', '# #', '# #', ' # ', '  #'],
    R: ['## ', '# #', '## ', '# #', '# #'],
    S: [' ##', '#  ', ' # ', '  #', '## '],
    T: ['###', ' # ', ' # ', ' # ', ' # '],
    U: ['# #', '# #', '# #', '# #', ' ##'],
    V: ['# #', '# #', '# #', '# #', ' # '],
    W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['# #', '# #', ' # ', '# #', '# #'],
    Y: ['# #', '# #', ' # ', ' # ', ' # '],
    Z: ['###', '  #', ' # ', '#  ', '###'],
    0: ['###', '# #', '# #', '# #', '###'],
    1: [' # ', '## ', ' # ', ' # ', '###'],
    2: ['## ', '  #', ' # ', '#  ', '###'],
    3: ['###', '  #', ' ##', '  #', '###'],
    4: ['# #', '# #', '###', '  #', '  #'],
    5: ['###', '#  ', '## ', '  #', '## '],
    6: [' ##', '#  ', '###', '# #', '###'],
    7: ['###', '  #', ' # ', ' # ', ' # '],
    8: ['###', '# #', '###', '# #', '###'],
    9: ['###', '# #', '###', '  #', '## '],
    '/': ['  #', '  #', ' # ', '#  ', '#  '],
    '-': ['   ', '   ', '###', '   ', '   '],
    '+': ['   ', ' # ', '###', ' # ', '   '],
    '!': [' # ', ' # ', ' # ', '   ', ' # '],
    '?': ['## ', '  #', ' # ', '   ', ' # '],
    '.': ['   ', '   ', '   ', '   ', ' # '],
    ',': ['   ', '   ', '   ', ' # ', '#  '],
    ':': ['   ', ' # ', '   ', ' # ', '   '],
    "'": [' # ', ' # ', '   ', '   ', '   '],
    '%': ['# #', '  #', ' # ', '#  ', '# #'],
    '(': ['  #', ' # ', ' # ', ' # ', '  #'],
    ')': ['#  ', ' # ', ' # ', ' # ', '#  '],
    '*': ['# #', ' # ', '# #', '   ', '   '],
    '=': ['   ', '###', '   ', '###', '   '],
    '>': ['#  ', ' # ', '  #', ' # ', '#  '],
    '<': ['  #', ' # ', '#  ', ' # ', '  #'],
    ' ': ['   ', '   ', '   ', '   ', '   '],
  };
  /* nearly every letter is three cells wide, so the advance is four; the two
     that carry a diagonal are drawn five wide and paid for at the cursor.
     Everything that lays tiny text out measures it with tinyW, so a wider
     glyph moves the whole line along rather than overlapping its neighbour. */
  const tinyGlyphW = ch => { const g = FONT[ch]; return (g ? g[0].length : 3) + 1; };
  function tinyW(str, k) {
    k = k || 1;
    str = String(str).toUpperCase();
    let w = 0;
    for (let i = 0; i < str.length; i++) w += tinyGlyphW(str[i]);
    return w * k - k;
  }
  function drawTiny(ctx, str, x, y, col, k, shadow) {
    k = k || 1;
    str = String(str).toUpperCase();
    if (shadow) {
      ctx.fillStyle = shadow;
      let cx = 0;
      for (let i = 0; i < str.length; i++) {
        const g = FONT[str[i]];
        if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++)
          if (g[r][c] === '#') ctx.fillRect(x + (cx + c) * k, y + (r + 1) * k, k, k);
        cx += tinyGlyphW(str[i]);
      }
    }
    ctx.fillStyle = col;
    let cx = 0;
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++)
        if (g[r][c] === '#') ctx.fillRect(x + (cx + c) * k, y + r * k, k, k);
      cx += tinyGlyphW(str[i]);
    }
  }

  /* ============================================================
     EGGTYPE - the display font: 5 wide, 6 tall caps, 6px advance
     ============================================================ */
  const FONT5 = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#'],
    B: ['####.', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.####', '#....', '#....', '#....', '#....', '.####'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#....', '#....', '#..##', '#...#', '.###.'],
    H: ['#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '#####'],
    J: ['..###', '....#', '....#', '....#', '#...#', '.###.'],
    K: ['#...#', '#..#.', '###..', '#..#.', '#...#', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#..#.', '#...#'],
    S: ['.####', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '.#.#.', '..#..', '..#..', '.#.#.', '#...#'],
    Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#####'],
    0: ['.###.', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '#####'],
    2: ['.###.', '#...#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '.###.', '....#', '....#', '####.'],
    4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '..#..', '..#..'],
    8: ['.###.', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '.###.'],
    '.': ['.....', '.....', '.....', '.....', '.##..', '.##..'],
    ',': ['.....', '.....', '.....', '.##..', '.##..', '.#...'],
    ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..'],
    '!': ['..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
    '/': ['....#', '...#.', '..#..', '.#...', '#....', '.....'],
    '-': ['.....', '.....', '#####', '.....', '.....', '.....'],
    '+': ['.....', '..#..', '#####', '..#..', '.....', '.....'],
    "'": ['..#..', '..#..', '.....', '.....', '.....', '.....'],
    '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
    '(': ['...#.', '..#..', '..#..', '..#..', '..#..', '...#.'],
    ')': ['.#...', '..#..', '..#..', '..#..', '..#..', '.#...'],
    '%': ['##..#', '##.#.', '..#..', '.#.##', '#..##', '.....'],
    '*': ['#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '=': ['.....', '#####', '.....', '#####', '.....', '.....'],
    '>': ['#....', '.#...', '..#..', '..#..', '.#...', '#....'],
    '<': ['....#', '...#.', '..#..', '..#..', '...#.', '....#'],
    '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....'],
  };
  function textW(str, k) { k = k || 1; return String(str).length * 6 * k - k; }
  function drawText(ctx, str, x, y, col, k, shadow) {
    k = k || 1;
    str = String(str).toUpperCase();
    const stamp = (dx, dy, c) => {
      ctx.fillStyle = c;
      for (let i = 0; i < str.length; i++) {
        const g = FONT5[str[i]]; if (!g) continue;
        for (let r = 0; r < 6; r++) for (let cc = 0; cc < 5; cc++)
          if (g[r][cc] === '#') ctx.fillRect(x + (i * 6 + cc) * k + dx, y + r * k + dy, k, k);
      }
    };
    if (shadow) stamp(0, k, shadow);
    stamp(0, 0, col);
  }
  /* chunky outlined title lettering */
  function drawTitle(ctx, str, x, y, col, outline, k) {
    k = k || 1;
    [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, -k], [-k, k], [k, k]]
      .forEach(([dx, dy]) => drawText(ctx, str, x + dx, y + dy, outline, k));
    drawText(ctx, str, x, y, col, k);
  }

  /* ============================================================
     PROCEDURAL BLOB RENDERER
     mask -> pixels with outline, top light, bottom shade, dither
     ============================================================ */
  function newMask(w, h) { return { w, h, d: new Uint8Array(w * h) }; }
  function mGet(m, x, y) { return x >= 0 && y >= 0 && x < m.w && y < m.h ? m.d[y * m.w + x] : 0; }
  function mSet(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.d[y * m.w + x] = v; }
  function mCircle(m, cx, cy, r, squash) {
    squash = squash || 1;
    for (let y = Math.floor(cy - r * squash) - 1; y <= cy + r * squash + 1; y++)
      for (let x = Math.floor(cx - r) - 1; x <= cx + r + 1; x++) {
        const dx = (x - cx) / r, dy = (y - cy) / (r * squash);
        if (dx * dx + dy * dy <= 1) mSet(m, x, y, 1);
      }
  }
  function mRect(m, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) mSet(m, x, y, 1);
  }

  /* render a mask with automatic volume shading */
  function renderMask(ctx, m, k, ox, oy, pal, seed, opts) {
    opts = opts || {};
    const rnd = mulberry(seed || 1);
    /* per column: first and last filled row (for top-light / bottom-shade) */
    const top = new Int16Array(m.w).fill(-1), bot = new Int16Array(m.w).fill(-1);
    for (let x = 0; x < m.w; x++)
      for (let y = 0; y < m.h; y++)
        if (mGet(m, x, y)) { if (top[x] < 0) top[x] = y; bot[x] = y; }
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (!mGet(m, x, y)) continue;
        const edge = !mGet(m, x - 1, y) || !mGet(m, x + 1, y) || !mGet(m, x, y - 1) || !mGet(m, x, y + 1);
        let col;
        if (edge && pal.out) col = pal.out;
        else {
          const depthTop = y - top[x], depthBot = bot[x] - y;
          const lightSide = !mGet(m, x - 1, y - 1);
          if (depthTop <= (opts.lightBand || 1) || (lightSide && depthTop <= 2)) col = pal.light;
          else if (depthBot <= (opts.shadeBand || 2)) col = pal.dark;
          else col = pal.base;
          const n = rnd();
          if (opts.speckle && n < opts.speckle) col = pal.light;
          else if (opts.grain && n > 1 - opts.grain) col = pal.dark;
        }
        ctx.fillStyle = col;
        ctx.fillRect(ox + x * k, oy + y * k, k, k);
      }
    }
  }

  /* ============================================================
     FOLIAGE & SCENERY (procedural, seeded variants)
     ============================================================ */
  function leafPal(hue) {
    /* hue 0 = normal green, +/- shifts */
    const base = hue === 'pine' ? '#3f8a44' : hue === 'dark' ? '#4f9b3f' : '#63b048';
    return { base, light: lighten(base, 0.30), dark: darken(base, 0.30), out: darken(base, 0.58) };
  }
  const BARK = { base: '#8a5e2a', light: '#a8783f', dark: '#5e3d18', out: '#3e2810' };

  function treeSprite(kind, seed, k) {
    const key = 'tree_' + kind + '_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 31 + 7);
    const W = kind === 'pine' ? 26 : 30, H = kind === 'pine' ? 40 : 36;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const trunkH = 10 + Math.floor(rnd() * 4);
    const cw = W / 2;

    /* trunk mask */
    const tm = newMask(W, H);
    const tw = kind === 'pine' ? 4 : 5;
    mRect(tm, Math.floor(cw - tw / 2), H - trunkH, tw, trunkH);
    /* roots flare */
    mRect(tm, Math.floor(cw - tw / 2) - 1, H - 2, tw + 2, 2);
    renderMask(ctx, tm, k, 0, 0, BARK, seed, { lightBand: 1, shadeBand: 1 });
    /* bark lines */
    ctx.fillStyle = BARK.dark;
    for (let i = 0; i < 3; i++) {
      const bx = Math.floor(cw - tw / 2) + 1 + Math.floor(rnd() * (tw - 2));
      const by = H - trunkH + 2 + Math.floor(rnd() * (trunkH - 4));
      ctx.fillRect(bx * k, by * k, k, 2 * k);
    }

    /* canopy mask */
    const m = newMask(W, H);
    if (kind === 'pine') {
      /* stacked triangles */
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const yTop = 2 + t * 7;
        const half = 4 + t * 3.2;
        const hgt = 9;
        for (let y = 0; y < hgt; y++) {
          const wHalf = Math.round(half * (y / hgt));
          for (let x = -wHalf; x <= wHalf; x++) mSet(m, Math.round(cw + x), yTop + y, 1);
        }
      }
    } else {
      const blobs = 5 + Math.floor(rnd() * 3);
      const baseR = 7 + rnd() * 2;
      mCircle(m, cw, 13, baseR + 1.5, 0.92);
      for (let i = 0; i < blobs; i++) {
        const a = (i / blobs) * Math.PI * 2 + rnd();
        mCircle(m, cw + Math.cos(a) * (5 + rnd() * 3), 12 + Math.sin(a) * (4 + rnd() * 2), 4 + rnd() * 2.5, 0.95);
      }
    }
    const pal = leafPal(kind === 'pine' ? 'pine' : (rnd() < 0.4 ? 'dark' : 0));
    renderMask(ctx, m, k, 0, 0, pal, seed + 5, { lightBand: 2, shadeBand: 3, speckle: 0.10, grain: 0.10 });

    /* fruit */
    if (kind === 'apple') {
      const fruits = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < fruits; i++) {
        let fx, fy, tries = 0;
        do { fx = Math.floor(rnd() * W); fy = 4 + Math.floor(rnd() * 16); tries++; }
        while (tries < 30 && (!mGet(m, fx, fy) || !mGet(m, fx + 1, fy + 1)));
        if (!mGet(m, fx, fy)) continue;
        px(ctx, fx, fy, k, '#d63a2f');
        px(ctx, fx + 1, fy, k, '#a82a22');
        px(ctx, fx, fy + 1, k, '#a82a22');
        px(ctx, fx, fy, k, '#e8542f');
      }
    }
    cache.set(key, c);
    return c;
  }

  function bushSprite(seed, k) {
    const key = 'bush_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 17 + 3);
    const W = 18, H = 14;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mCircle(m, 9, 9, 6, 0.7);
    for (let i = 0; i < 4; i++) mCircle(m, 3 + rnd() * 12, 6 + rnd() * 5, 2.5 + rnd() * 2, 0.8);
    const pal = leafPal(rnd() < 0.5 ? 'dark' : 0);
    renderMask(ctx, m, k, 0, 0, pal, seed + 2, { lightBand: 2, shadeBand: 2, speckle: 0.1, grain: 0.08 });
    /* berries */
    if (rnd() < 0.6) {
      const bc = rnd() < 0.5 ? '#e8547a' : '#c94fd0';
      for (let i = 0; i < 4; i++) {
        const bx = 3 + Math.floor(rnd() * 12), by = 5 + Math.floor(rnd() * 6);
        if (mGet(m, bx, by)) { px(ctx, bx, by, k, bc); px(ctx, bx, by - 1, k, lighten(bc, 0.35)); }
      }
    }
    cache.set(key, c);
    return c;
  }

  function rockSprite(seed, k) {
    const key = 'rock_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 13 + 11);
    const W = 14, H = 10;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mCircle(m, 7, 7, 5 + rnd() * 1.5, 0.62);
    mCircle(m, 4 + rnd() * 6, 5, 2.5 + rnd(), 0.7);
    const base = rnd() < 0.5 ? '#9b9b90' : '#8f8f9c';
    renderMask(ctx, m, k, 0, 0,
      { base, light: lighten(base, 0.34), dark: darken(base, 0.3), out: darken(base, 0.55) },
      seed + 9, { lightBand: 2, shadeBand: 2, grain: 0.12 });
    /* moss */
    if (rnd() < 0.5) { px(ctx, 4, 8, k, '#6ab04c'); px(ctx, 5, 8, k, '#5a9b40'); }
    cache.set(key, c);
    return c;
  }

  function flowerSprite(seed, k) {
    const key = 'flow_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 7 + 5);
    const W = 12, H = 12;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const cols = ['#ff8ab5', '#fff5e8', '#ffd23f', '#c9a8f0', '#ff9f6b', '#8fd6ff'];
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const fx = 2 + Math.floor(rnd() * 8), fy = 2 + Math.floor(rnd() * 5);
      const col = cols[Math.floor(rnd() * cols.length)];
      /* stem */
      ctx.fillStyle = '#4f9b3f';
      ctx.fillRect(fx * k, (fy + 2) * k, k, (H - fy - 3) * k);
      ctx.fillStyle = '#3f7d32';
      ctx.fillRect((fx - 1) * k, (fy + 4) * k, k, k);
      /* petals */
      px(ctx, fx, fy - 1, k, col); px(ctx, fx - 1, fy, k, col);
      px(ctx, fx + 1, fy, k, col); px(ctx, fx, fy + 1, k, col);
      px(ctx, fx, fy, k, '#ffd23f');
      px(ctx, fx - 1, fy - 1, k, lighten(col, 0.4));
    }
    cache.set(key, c);
    return c;
  }

  function tuftSprite(seed, k) {
    const key = 'tuft_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 5 + 2);
    const W = 10, H = 7;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const bx = 1 + Math.floor(rnd() * 8);
      const bh = 3 + Math.floor(rnd() * 4);
      const lean = rnd() < 0.5 ? -1 : 1;
      const col = rnd() < 0.4 ? '#7cc44a' : '#5da33a';
      for (let y = 0; y < bh; y++) {
        px(ctx, bx + (y > bh - 2 ? lean : 0), H - 1 - y, k, y === bh - 1 ? lighten(col, 0.25) : col);
      }
    }
    cache.set(key, c);
    return c;
  }

  function shroomSprite(seed, k) {
    const key = 'shroom_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 23 + 4);
    const W = 12, H = 12;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const capCol = rnd() < 0.5 ? '#e8542f' : (rnd() < 0.5 ? '#c96be0' : '#e8a52f');
    const n = 1 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const bx = 2 + i * 5, by = 4 + i * 2;
      /* stem */
      const sm = newMask(W, H);
      mRect(sm, bx + 1, by + 3, 3, 5 - i);
      renderMask(ctx, sm, k, 0, 0, { base: '#f0e2c8', light: '#fffaf0', dark: '#c9b896', out: '#8a7a5e' }, seed, {});
      /* cap */
      const cm = newMask(W, H);
      mCircle(cm, bx + 2.5, by + 3, 3.2, 0.75);
      for (let y = by + 4; y < H; y++) for (let x = 0; x < W; x++) mSet(cm, x, y, 0);
      renderMask(ctx, cm, k, 0, 0,
        { base: capCol, light: lighten(capCol, 0.3), dark: darken(capCol, 0.3), out: darken(capCol, 0.55) },
        seed + 1, { lightBand: 1, shadeBand: 1 });
      /* spots */
      px(ctx, bx + 1, by + 1, k, '#fff8ee');
      px(ctx, bx + 3, by + 2, k, '#fff8ee');
    }
    cache.set(key, c);
    return c;
  }

  function stumpSprite(seed, k) {
    const key = 'stump_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const W = 12, H = 10;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mRect(m, 2, 3, 8, 7);
    mCircle(m, 6, 3.5, 4.2, 0.5);
    renderMask(ctx, m, k, 0, 0, BARK, seed, { lightBand: 1, shadeBand: 2, grain: 0.1 });
    /* rings on top */
    ctx.fillStyle = '#c9924f';
    ctx.fillRect(3 * k, 2 * k, 6 * k, 3 * k);
    ctx.fillStyle = '#a8783f';
    ctx.fillRect(4 * k, 3 * k, 4 * k, 1 * k);
    ctx.fillStyle = '#8a5e2a';
    ctx.fillRect(5 * k, 3 * k, 2 * k, 1 * k);
    cache.set(key, c);
    return c;
  }

  function reedSprite(seed, k) {
    const key = 'reed_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 3 + 8);
    const W = 8, H = 14;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 3; i++) {
      const bx = 1 + Math.floor(rnd() * 5), bh = 7 + Math.floor(rnd() * 6);
      ctx.fillStyle = '#4f9b3f';
      ctx.fillRect(bx * k, (H - bh) * k, k, bh * k);
      ctx.fillStyle = '#6e4a20';
      ctx.fillRect(bx * k, (H - bh) * k, k, 3 * k);
      ctx.fillStyle = '#8a5e2a';
      ctx.fillRect(bx * k, (H - bh) * k, k, k);
    }
    cache.set(key, c);
    return c;
  }

  function sunflowerSprite(seed, k) {
    const key = 'sunf_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 11 + 6);
    const W = 11, H = 20;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const cx = 5, cy = 5;
    ctx.fillStyle = '#3f7d32'; ctx.fillRect(cx * k, (cy + 3) * k, k, (H - cy - 3) * k);
    ctx.fillStyle = '#4f9b3f';
    ctx.fillRect((cx - 2) * k, (cy + 7) * k, 2 * k, k);
    ctx.fillRect((cx + 1) * k, (cy + 10) * k, 2 * k, k);
    const m = newMask(W, H);
    mCircle(m, cx, cy, 4, 1);
    renderMask(ctx, m, k, 0, 0,
      { base: '#ffc72f', light: '#ffe27a', dark: '#e09a12', out: '#a86a12' }, seed, { lightBand: 1, shadeBand: 1 });
    const dm = newMask(W, H);
    mCircle(dm, cx, cy, 2, 1);
    renderMask(ctx, dm, k, 0, 0,
      { base: '#7a4a20', light: '#a8683a', dark: '#5e3512', out: '#3e2810' }, seed + 3, { grain: 0.3 });
    cache.set(key, c);
    return c;
  }

  function lavenderSprite(seed, k) {
    const key = 'lav_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 19 + 1);
    const W = 9, H = 14;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 3; i++) {
      const bx = 1 + Math.floor(rnd() * 6), bh = 8 + Math.floor(rnd() * 4);
      ctx.fillStyle = '#5a8f4a';
      ctx.fillRect(bx * k, (H - bh) * k, k, bh * k);
      const col = rnd() < 0.5 ? '#a58ae0' : '#8f6fd0';
      for (let y = 0; y < 4; y++) {
        px(ctx, bx, H - bh + y, k, y === 0 ? lighten(col, 0.3) : col);
        if (y % 2) { px(ctx, bx - 1, H - bh + y, k, col); px(ctx, bx + 1, H - bh + y, k, darken(col, 0.15)); }
      }
    }
    cache.set(key, c);
    return c;
  }

  function cloverSprite(seed, k) {
    const key = 'clov_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 29 + 2);
    const W = 9, H = 7;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 3; i++) {
      const bx = 1 + Math.floor(rnd() * 6), by = 2 + Math.floor(rnd() * 3);
      const col = rnd() < 0.5 ? '#7cc44a' : '#63b048';
      px(ctx, bx, by, k, col); px(ctx, bx + 1, by, k, darken(col, 0.15));
      px(ctx, bx, by + 1, k, darken(col, 0.15));
      px(ctx, bx, by - 1, k, lighten(col, 0.25));
    }
    cache.set(key, c);
    return c;
  }

  function daisySprite(seed, k) {
    const key = 'daisy_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 37 + 5);
    const W = 12, H = 11;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const fx = 2 + Math.floor(rnd() * 8), fy = 2 + Math.floor(rnd() * 4);
      ctx.fillStyle = '#4f9b3f';
      ctx.fillRect(fx * k, (fy + 1) * k, k, (H - fy - 2) * k);
      const petal = '#fff8ee';
      px(ctx, fx, fy - 1, k, petal); px(ctx, fx - 1, fy, k, petal);
      px(ctx, fx + 1, fy, k, petal); px(ctx, fx, fy + 1, k, petal);
      px(ctx, fx - 1, fy - 1, k, petal); px(ctx, fx + 1, fy - 1, k, petal);
      px(ctx, fx - 1, fy + 1, k, petal); px(ctx, fx + 1, fy + 1, k, petal);
      px(ctx, fx, fy, k, '#ffd23f');
    }
    cache.set(key, c);
    return c;
  }

  function poppySprite(seed, k) {
    const key = 'poppy_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 41 + 9);
    const W = 12, H = 13;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const fx = 2 + Math.floor(rnd() * 8), fy = 2 + Math.floor(rnd() * 5);
      ctx.fillStyle = '#4f9b3f';
      ctx.fillRect(fx * k, (fy + 2) * k, k, (H - fy - 3) * k);
      const col = '#e8402f';
      px(ctx, fx, fy - 1, k, col); px(ctx, fx - 1, fy, k, col);
      px(ctx, fx + 1, fy, k, col); px(ctx, fx, fy + 1, k, col);
      px(ctx, fx - 1, fy - 1, k, lighten(col, 0.25)); px(ctx, fx + 1, fy - 1, k, darken(col, 0.15));
      px(ctx, fx, fy, k, '#2e2216');
    }
    cache.set(key, c);
    return c;
  }

  function dandelionSprite(seed, k) {
    const key = 'dande_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 43 + 13);
    const W = 11, H = 13;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const fx = 2 + Math.floor(rnd() * 7), fy = 2 + Math.floor(rnd() * 5);
      ctx.fillStyle = '#5da33a';
      ctx.fillRect(fx * k, (fy + 2) * k, k, (H - fy - 3) * k);
      const puff = rnd() < 0.5;
      const m = newMask(W, H);
      mCircle(m, fx, fy, 2, 0.9);
      const pal = puff
        ? { base: '#fff8ee', light: '#ffffff', dark: '#e8dcc0', out: null }
        : { base: '#ffd23f', light: '#ffe98a', dark: '#e0a416', out: null };
      renderMask(ctx, m, k, 0, 0, pal, seed, { lightBand: 1, shadeBand: 1 });
    }
    cache.set(key, c);
    return c;
  }

  function tulipSprite(seed, k) {
    const key = 'tulip_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 47 + 17);
    const W = 12, H = 16;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const cols = ['#e8547a', '#ffd23f', '#ff9f6b', '#c9a8f0', '#fff5e8'];
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const fx = 2 + Math.floor(rnd() * 8), fy = 2 + Math.floor(rnd() * 4);
      const stemH = H - fy - 4;
      ctx.fillStyle = '#3f7d32';
      ctx.fillRect(fx * k, (fy + 4) * k, k, stemH * k);
      ctx.fillStyle = '#4f9b3f';
      ctx.fillRect((fx - 1) * k, (fy + Math.floor(stemH / 2)) * k, k, k);
      const col = cols[Math.floor(rnd() * cols.length)];
      /* the closed cup, a little wider at the base */
      ctx.fillStyle = darken(col, 0.15); ctx.fillRect((fx - 1) * k, (fy + 3) * k, 3 * k, k);
      ctx.fillStyle = col; ctx.fillRect((fx - 1) * k, (fy + 1) * k, 3 * k, 2 * k);
      ctx.fillStyle = lighten(col, 0.3); ctx.fillRect(fx * k, fy * k, k, k);
    }
    cache.set(key, c);
    return c;
  }

  function rosebushSprite(seed, k) {
    const key = 'rosebush_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 53 + 21);
    const W = 18, H = 14;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mCircle(m, 9, 9, 6, 0.7);
    for (let i = 0; i < 4; i++) mCircle(m, 3 + rnd() * 12, 6 + rnd() * 5, 2.5 + rnd() * 2, 0.8);
    const pal = leafPal(rnd() < 0.5 ? 'dark' : 0);
    renderMask(ctx, m, k, 0, 0, pal, seed + 2, { lightBand: 2, shadeBand: 2, speckle: 0.1, grain: 0.08 });
    /* roses: a bloom of three shaded pixels, not a single berry dot */
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const bx = 3 + Math.floor(rnd() * 12), by = 4 + Math.floor(rnd() * 6);
      if (!mGet(m, bx, by)) continue;
      px(ctx, bx, by, k, '#e8324a'); px(ctx, bx + 1, by, k, '#c41f38');
      px(ctx, bx, by - 1, k, lighten('#e8324a', 0.35));
    }
    cache.set(key, c);
    return c;
  }

  function fernSprite(seed, k) {
    const key = 'fern_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 59 + 25);
    const W = 14, H = 15;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const bx = 2 + Math.floor(rnd() * 9), frondH = 6 + Math.floor(rnd() * 5);
      const col = rnd() < 0.5 ? '#5da33a' : '#4f9b3f';
      for (let y = 0; y < frondH; y++) {
        const yy = H - 1 - y;
        px(ctx, bx, yy, k, y === frondH - 1 ? darken(col, 0.15) : col);
        const leafletW = Math.max(1, Math.round((frondH - y) / 3));
        if (y % 2 === 0 && y < frondH - 1) {
          for (let s = 1; s <= leafletW; s++) { px(ctx, bx - s, yy, k, col); px(ctx, bx + s, yy, k, col); }
        }
      }
    }
    cache.set(key, c);
    return c;
  }

  function ivySprite(seed, k) {
    const key = 'ivy_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 61 + 29);
    const W = 16, H = 8;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mCircle(m, 8, 6, 7, 0.45);
    mCircle(m, 3, 6, 3, 0.5);
    mCircle(m, 13, 6, 3, 0.5);
    const pal = leafPal('dark');
    renderMask(ctx, m, k, 0, 0, pal, seed + 4, { lightBand: 1, shadeBand: 1, speckle: 0.14, grain: 0.1 });
    /* tiny white flowers scattered through it */
    const nf = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < nf; i++) {
      const fx = 2 + Math.floor(rnd() * 12), fy = 3 + Math.floor(rnd() * 4);
      if (mGet(m, fx, fy)) px(ctx, fx, fy, k, '#fff8ee');
    }
    cache.set(key, c);
    return c;
  }

  function cactusSprite(seed, k) {
    const key = 'cactus_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 67 + 33);
    const W = 14, H = 20;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const bodyH = 13 + Math.floor(rnd() * 4);
    const m = newMask(W, H);
    mRect(m, 5, H - bodyH, 4, bodyH);
    mCircle(m, 7, H - bodyH, 2.2, 0.7);
    const arm = rnd() < 0.7;
    if (arm) {
      const ay = H - bodyH + 4 + Math.floor(rnd() * 3);
      mRect(m, 9, ay, 3, 6);
      mRect(m, 9, ay - 4, 2, 5);
    }
    const base = '#4f9b5a';
    renderMask(ctx, m, k, 0, 0,
      { base, light: lighten(base, 0.28), dark: darken(base, 0.28), out: darken(base, 0.55) },
      seed, { lightBand: 1, shadeBand: 2, grain: 0.08 });
    /* spine flecks */
    ctx.fillStyle = '#dff0d8';
    for (let y = H - bodyH + 2; y < H - 1; y += 2) { px(ctx, 5, y, k, '#dff0d8'); px(ctx, 8, y + 1, k, '#dff0d8'); }
    /* a little flower on top, half the time */
    if (rnd() < 0.5) { px(ctx, 6, H - bodyH - 1, k, '#ff8ab5'); px(ctx, 7, H - bodyH - 1, k, '#ffd23f'); }
    /* a pot beneath it, since this one is not planted loose in the ground */
    ctx.fillStyle = '#2e2216'; ctx.fillRect(3 * k, (H - 3) * k, 8 * k, 3 * k);
    ctx.fillStyle = '#c9924f'; ctx.fillRect(4 * k, (H - 3) * k, 6 * k, 2 * k);
    ctx.fillStyle = '#e0bd82'; ctx.fillRect(4 * k, (H - 3) * k, 6 * k, 1 * k);
    cache.set(key, c);
    return c;
  }

  function bambooSprite(seed, k) {
    const key = 'bamboo_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 71 + 37);
    const W = 14, H = 26;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const bx = 1 + Math.floor(rnd() * (W - 3)), bh = 16 + Math.floor(rnd() * 8);
      const top = H - bh;
      ctx.fillStyle = '#7cc44a'; ctx.fillRect(bx * k, top * k, 2 * k, bh * k);
      ctx.fillStyle = '#5da33a'; ctx.fillRect((bx + 1) * k, top * k, k, bh * k);
      /* dark rings between segments */
      ctx.fillStyle = '#3f7d32';
      for (let y = top + 3; y < H; y += 4) ctx.fillRect(bx * k, y * k, 2 * k, k);
      /* a tuft of leaves at the top */
      ctx.fillStyle = '#5da33a';
      ctx.fillRect((bx - 2) * k, (top - 1) * k, 2 * k, k);
      ctx.fillRect((bx + 2) * k, top * k, 2 * k, k);
      ctx.fillRect((bx - 1) * k, (top - 2) * k, 2 * k, k);
    }
    cache.set(key, c);
    return c;
  }

  function mossSprite(seed, k) {
    const key = 'moss_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 73 + 41);
    const W = 14, H = 8;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const m = newMask(W, H);
    mCircle(m, 7, 5, 6, 0.42);
    const base = '#5a9b40';
    renderMask(ctx, m, k, 0, 0,
      { base, light: lighten(base, 0.22), dark: darken(base, 0.25), out: null },
      seed, { lightBand: 1, shadeBand: 1, speckle: 0.16, grain: 0.14 });
    /* a couple of little lichen flecks */
    if (rnd() < 0.6) { px(ctx, 4, 4, k, '#c9d68a'); px(ctx, 10, 5, k, '#c9d68a'); }
    cache.set(key, c);
    return c;
  }

  /* dispatcher used by the world builder */
  function decoSprite(kind, k, seed) {
    seed = seed || 1;
    switch (kind) {
      case 'tree': return treeSprite('tree', seed, k);
      case 'apple': return treeSprite('apple', seed, k);
      case 'pine': return treeSprite('pine', seed, k);
      case 'bush': return bushSprite(seed, k);
      case 'rock': return rockSprite(seed, k);
      case 'flower': return flowerSprite(seed, k);
      case 'tuft': return tuftSprite(seed, k);
      case 'shroom': return shroomSprite(seed, k);
      case 'stump': return stumpSprite(seed, k);
      case 'reed': return reedSprite(seed, k);
      case 'sunflower': return sunflowerSprite(seed, k);
      case 'lavender': return lavenderSprite(seed, k);
      case 'clover': return cloverSprite(seed, k);
      case 'daisy': return daisySprite(seed, k);
      case 'poppy': return poppySprite(seed, k);
      case 'dandelion': return dandelionSprite(seed, k);
      case 'tulip': return tulipSprite(seed, k);
      case 'rosebush': return rosebushSprite(seed, k);
      case 'fern': return fernSprite(seed, k);
      case 'ivy': return ivySprite(seed, k);
      case 'cactus': return cactusSprite(seed, k);
      case 'bamboo': return bambooSprite(seed, k);
      case 'moss': return mossSprite(seed, k);
      case 'bench': case 'lamp': case 'barrel': case 'birdbath': case 'scarecrow':
      case 'mailbox': case 'hay': case 'planter':
        return furnitureSprite(kind, seed, k);
      default: return tuftSprite(seed, k);
    }
  }

  /* things you buy at the furniture counter: all small, all wooden or stone */
  function furnitureSprite(kind, seed, k) {
    const key = 'furn_' + kind + '_' + (seed % 6) + '_' + k;
    if (cache.has(key)) return cache.get(key);
    const rnd = mulberry(seed * 31 + 7);
    const dims = { bench: [16, 10], lamp: [8, 22], barrel: [10, 12], birdbath: [14, 16], scarecrow: [16, 24],
                   mailbox: [10, 18], hay: [14, 10], planter: [14, 11] }[kind];
    const c = newCanvas(dims[0] * k, dims[1] * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const O = '#2e2216', WOOD = '#c9924f', WOODL = '#e0bd82', WOODD = '#8a5e2a', IRON = '#3a3a4a', STONE = '#9b9b90';
    if (kind === 'bench') {
      R(1, 2, 14, 3, O); R(2, 3, 12, 1, WOODL); R(2, 4, 12, 1, WOOD);
      R(1, 6, 14, 2, O); R(2, 6, 12, 1, WOOD);
      R(2, 5, 2, 5, O); R(12, 5, 2, 5, O); R(3, 8, 1, 1, WOODD); R(12, 8, 1, 1, WOODD);
      R(3, 0, 10, 2, O); R(4, 0, 8, 1, WOODL);
    } else if (kind === 'lamp') {
      R(3, 6, 2, 16, O); R(3, 6, 1, 15, IRON);
      R(1, 20, 6, 2, O); R(2, 20, 4, 1, IRON);
      R(1, 0, 6, 7, O); R(2, 1, 4, 5, '#fff3c4'); R(3, 2, 2, 3, '#ffd23f'); R(2, 1, 1, 1, '#ffffff');
      R(3, 0, 2, 1, IRON);
    } else if (kind === 'barrel') {
      R(1, 1, 8, 10, O); R(2, 2, 6, 8, WOOD); R(3, 2, 1, 8, WOODL); R(6, 2, 1, 8, WOODD);
      R(2, 3, 6, 1, IRON); R(2, 8, 6, 1, IRON);
      R(3, 0, 4, 2, O); R(4, 1, 2, 1, WOODD);
    } else if (kind === 'birdbath') {
      R(1, 3, 12, 5, O); R(2, 4, 10, 3, STONE); R(2, 4, 10, 1, lighten(STONE, 0.3));
      R(3, 4, 8, 2, '#5fa8e8'); R(4, 4, 3, 1, '#b5e0f5');
      R(5, 8, 4, 6, O); R(6, 8, 2, 6, STONE);
      R(3, 14, 8, 2, O); R(4, 14, 6, 1, STONE);
      if (rnd() < 0.5) { R(8, 1, 3, 3, O); R(9, 2, 1, 1, '#e8542f'); R(10, 2, 1, 1, '#ffd23f'); }
    } else if (kind === 'scarecrow') {
      R(7, 6, 2, 18, O); R(7, 6, 1, 17, WOODD);
      R(1, 9, 14, 2, O); R(2, 9, 12, 1, WOODD);
      /* shirt and straw hands */
      R(4, 8, 8, 8, O); R(5, 9, 6, 6, '#3fa7d6'); R(5, 9, 6, 1, '#7fc4e8'); R(8, 9, 1, 6, '#2f5f9e');
      R(0, 9, 2, 2, '#ffd23f'); R(14, 9, 2, 2, '#ffd23f');
      /* sack head and straw hat */
      R(4, 1, 8, 8, O); R(5, 2, 6, 6, '#e0bd82'); R(6, 4, 1, 1, O); R(9, 4, 1, 1, O); R(7, 6, 2, 1, O);
      R(2, 1, 12, 2, O); R(3, 1, 10, 1, '#ffd23f'); R(5, 0, 6, 1, O);
    } else if (kind === 'mailbox') {
      R(4, 8, 2, 10, O); R(4, 8, 1, 9, WOODD);
      R(1, 1, 8, 8, O); R(2, 2, 6, 6, '#3fa7d6'); R(2, 2, 6, 1, '#7fc4e8'); R(2, 7, 6, 1, '#2f5f9e');
      R(2, 4, 1, 3, IRON); R(8, 0, 1, 4, '#e8542f'); R(7, 1, 2, 1, '#e8542f');
    } else if (kind === 'hay') {
      const round = rnd() < 0.5;
      R(1, 1, 12, 8, O);
      R(2, 2, 10, 6, '#e8c458'); R(2, 2, 10, 1, '#f5dd8a'); R(2, 7, 10, 1, '#c9a035');
      if (round) { ctx.clearRect(1 * k, 1 * k, k, k); ctx.clearRect(12 * k, 1 * k, k, k); R(6, 3, 2, 4, '#c9a035'); R(4, 4, 6, 2, '#e8c458'); }
      else { R(4, 2, 1, 6, '#8a5e2a'); R(9, 2, 1, 6, '#8a5e2a'); }
      for (let i = 0; i < 6; i++) R(2 + Math.floor(rnd() * 10), 2 + Math.floor(rnd() * 6), 1, 1, '#f5dd8a');
    } else {
      /* planter box with a row of blooms */
      R(1, 5, 12, 6, O); R(2, 6, 10, 4, WOOD); R(2, 6, 10, 1, WOODL); R(5, 6, 1, 4, WOODD); R(8, 6, 1, 4, WOODD);
      const cols = ['#ff8ab5', '#ffd23f', '#ff9f6b', '#c9a8f0', '#fff5e8'];
      for (let i = 0; i < 4; i++) {
        const x = 2 + i * 3;
        R(x + 1, 3, 1, 3, '#3a7d3a'); R(x, 1, 3, 2, O); R(x, 1, 3, 1, cols[(i + seed) % cols.length]); R(x + 1, 0, 1, 1, cols[(i + seed) % cols.length]);
      }
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     CHICKENS
     ============================================================ */
  /* Four breeds, all drawn in side profile the way a real bird stands:
     comb and wattle on the head, an arched neck, a folded wing with
     feather partings laid on the flank, sickle tail feathers off the
     back and scaly shanks with toes underneath. 20x18 in a 20x20 cell. */
  const SHAPES = {
    chick: {
      rows: [
        '....................',
        '..............C.C...',
        '.............CCCC...',
        '....OO.......OBBO...',
        '...OTTO.....OOLBKK..',
        '...OTTTOOOOOOLBEKO..',
        '....OTTBLLLLLLBCO...',
        '....OOBBBLLLLBBBO...',
        '.....OBBWWWWWWBBO...',
        '.....OBWwWwWwWBBO...',
        '.....OBWwWwWwWDBO...',
        '.....OBDWWWWWDDBO...',
        '......ODDDDDDDDO....',
        '.......OODDDDOO.....',
        '.........F..F.......',
        '.........F..F.......',
        '........FFF.FFF.....',
        '....................',
      ],
      eyeL: [15, 5], eyeR: [15, 5], beak: [16, 4],
      blushY: 6, blushL: 13, blushR: 16,
      headTop: [15, 2], bellyC: [10, 11], wattle: true, wing: [8, 10],
    },
    hen: {
      rows: [
        '..............C.C...',
        '.............CCCCC..',
        '..OO..........OBBO..',
        '.OTTO........OLLBKK.',
        '.OTTTO.......OLBEKO.',
        'OTTTTTOOOOOOOLBBKO..',
        'OTTTTTBLLLLLLLBCCO..',
        '.OTTTBBBLLLLLBBBO...',
        '..OOBBWWWWWWWBBBO...',
        '...OBBWwWwWwWWBBO...',
        '...OBBWwWwWwwWBBO...',
        '...OBDWwWwWwWDDBO...',
        '....ODDDWWWDDDDO....',
        '.....OODDDDDOO......',
        '.......F...F........',
        '.......F...F........',
        '......FFFF.FFFF.....',
        '....................',
      ],
      eyeL: [15, 4], eyeR: [15, 4], beak: [17, 3],
      blushY: 5, blushL: 13, blushR: 16,
      headTop: [15, 1], bellyC: [10, 11], wattle: true, wing: [8, 10],
    },
    fluff: {
      rows: [
        '....................',
        '.............C.C....',
        '............CCCCC...',
        '...OOO.......OBBO...',
        '..OTTTO.....OOLLBKK.',
        '.OTTTTOOOOOOOLBEKO..',
        '.OTTTBBLLLLLLLBCO...',
        '.OOBBBBLLLLLLBBCO...',
        'OBBBBWWWWWWWWWBBBO..',
        'OBBBWwWwWwWwWWBBBO..',
        'OBBBWwWwWwWwwWBBBO..',
        'OBBDWwWwWwWwWDDBO...',
        '.OBDDDWWWWWWDDDDO...',
        '.ODDDDDDDDDDDDDO....',
        '..OODDDDDDDDDOO.....',
        '.....OOOOOOOOO......',
        '.......F...F........',
        '......FFF..FFF......',
      ],
      eyeL: [15, 5], eyeR: [15, 5], beak: [17, 4],
      blushY: 6, blushL: 13, blushR: 16,
      headTop: [15, 2], bellyC: [10, 11], wattle: true, wing: [8, 10],
    },
    tall: {
      rows: [
        '.............C.C.C..',
        '............CCCCCC..',
        '.OO.........OOBBBO..',
        'OTTO.......OOLLBKKK.',
        'OTTTO......OLLBEKKO.',
        'OTTTTO.....OLBBBKO..',
        '.OTTTO.....OLBBCCO..',
        '.OTTTOOOOOOOLBBCO...',
        '..OTTBLLLLLLLLBBO...',
        '..OOBBWWWWWWWBBBO...',
        '...OBBWwWwWwWWBBO...',
        '...OBBWwWwWwwWBBO...',
        '....OBDWwWwWWDDBO...',
        '....ODDDWWWDDDDO....',
        '.....OODDDDDOO......',
        '.......F...F........',
        '.......F...F........',
        '......FFFF.FFFF.....',
      ],
      eyeL: [15, 4], eyeR: [15, 4], beak: [17, 3],
      blushY: 5, blushL: 13, blushR: 16,
      headTop: [15, 1], bellyC: [10, 11], wattle: true, wing: [8, 10],
    },
    /* the dinosaur: a long tail sweeping off to the left, a heavy body on
       two big legs, and a jaw that means business. Feathered, of course. */
    dino: {
      rows: [
        '.............OOOOO..',
        '............OBBBBBO.',
        '...........OBLLBBEBO',
        '...........OBLBBBBKK',
        '.........OOOBBBBBOOO',
        '.OO.....OBBBBBBBOOO.',
        'OTTOO..OBBBBBBBBO...',
        'OTTTTOOBBWWWWBBBO...',
        '.OTTTTBBBWwWwWBBO...',
        '..OTTBBBBWwWwWBBO...',
        '...OOBBBBWWWWWBBO...',
        '....OBBDDDDDDDBBO...',
        '.....ODDDDDDDDDO....',
        '......OODDDOODDO....',
        '........OFO..OFO....',
        '........OFO..OFO....',
        '.......OFFFO.OFFFO..',
        '....................',
      ],
      eyeL: [17, 2], eyeR: [17, 2], beak: [18, 3],
      blushY: 3, blushL: 14, blushR: 16,
      headTop: [15, 1], bellyC: [10, 11], wattle: false, wing: [10, 8],
    },
  };

  /* Mama Hen: a big, fat grandma of a bird. Bonnet and shawl on top,
     an apron over a belly you could rest a teacup on, and spectacles
     drawn in over the eyes further down. 34x30, drawn at 1x in world. */
  /* Mama Hen: a big, fat grandma of a bird. Bonnet and shawl on top, an
     apron over a belly you could rest a teacup on, and spectacles drawn
     in over the eyes further down. 34x30, drawn at 1x in the world. */
  /* Mama Hen: a big, fat grandma of a bird. Bonnet and shawl on top, an
     apron down the front, and spectacles drawn in over the eyes further
     down. 34x30, drawn at 1x in the world. */
  /* Mama Hen: a big fat grandma of a bird, and a hen rather than a blob -
     tail feathers sweeping off one flank, a folded wing inked onto the
     other, a bonnet and shawl on top and an apron down the front.
     34x32, drawn at 1x in the world. */
  /* Mama Hen: a big fat grandma of a bird, and a hen rather than a blob -
     tail feathers sweeping off one flank, a folded wing inked onto the
     other, a bonnet and shawl on top and an apron down the front.
     34x33, drawn at 1x in the world. */
  /* Mama Hen: a big fat grandma of a bird, and a hen rather than a blob -
     tail feathers sweeping off one flank, a folded wing inked onto the
     other, a bonnet and shawl on top and a stitched pinafore down the
     front. 34x33, drawn at 1x in the world. */
  /* Mama Hen: a big broody hen settled low over her nest. Serrated comb,
     short beak, wattles under the chin, an arched neck, feather partings
     across a folded wing and sickle tail feathers off the back. Her legs
     are tucked under her, the way a sitting hen's are. 34x26. */
  const MAMA_ROWS = [
    '..................................',
    '..................................',
    '.........................COC......',
    '.OO.....................CCCCCC....',
    '.OTO....................OLLBBO....',
    '..OTO...................OLLBBO....',
    'OOTTTOO................OLLEBBK....',
    'OTTTTTTO..............OLLLLBBK....',
    'OTTTTTOO..............OLLLLBCC....',
    '.OTTTO...........OOOOOLLLLLBC.....',
    '..OTTTO.....OOOOOLLLLLLLLLLO......',
    '...OTTO..OOOLLLLLLLLLLLLLLO.......',
    '....OTO.OBBBBBBWWWWWWBBBBBBO......',
    '.....OTOBBBBBwwwwwwWWWWBBBBBO.....',
    '......OBBBBBWWWWWWWwwwwwBBBBO.....',
    '......OBBBBwwWWWWWWWWWWWWBBBO.....',
    '......OBBBWWWwwwwwwWWWWWWBBBO.....',
    '......OBBBWWWWWWWWWwwwwwBBBBO.....',
    '......OBBBBwwWWWWWWWWWWWBBBBO.....',
    '.......ODDDWWwwwwwwWWWWDDDDO......',
    '........ODDDDWWWWWWwwDDDDDO.......',
    '.........OOODDDDDDDDDDDOOO........',
    '............OOOOODOOOOO...........',
    '..................................',
    '..................................',
    '..................................',
  ];
  const MAMA = {
    rows: MAMA_ROWS, eyeL: [26, 6], eyeR: [26, 6], beak: [29, 6], blushY: 8,
    blushL: 24, blushR: 28, headTop: [26, 1], wattle: true, w: 34, h: 26,
  };
  const MAMA_TIER = [
    ['#e8d9bd', '#e8542f'], ['#bfe6a8', '#e8542f'], ['#a8d8f0', '#e8542f'],
    ['#d5b3ef', '#b03ee0'], ['#ffcf7d', '#e8542f'], ['#ff9db5', '#c42f5e'],
    ['#8f86e8', '#ffd23f'], ['#ffe9a8', '#f0b429'],
  ];

  const EGG_ROWS = [
    '...OOOO...',
    '..OBBBBO..',
    '.OBBBBBBO.',
    '.OBBBBBBO.',
    'OBBBBBBBBO',
    'OBBBBBBBBO',
    'OBBBBBBBBO',
    'OBBBBBBBBO',
    '.OBBBBBBO.',
    '.OBBBBBBO.',
    '..OBBBBO..',
    '...OOOO...',
  ];

  const NEST_ROWS = [
    's.dddddddddddddddd.s',
    '.sSsSsSsSsSsSsSsSss.',
    'sSsSsSsSsSsSsSsSsSsS',
    'SsSsSsSsSsSsSsSsSsSs',
    '.oSsSsSsSsSsSsSsSo..',
    '..ooSsSsSsSsSsSoo...',
    '....oooooooooo......',
  ];

  const ACC = {
    bow:    { g: ['pp.pp', 'ppPpp', 'pp.pp'], pal: { p: '#ff5f9e', P: '#c42f6e' }, dx: 4, dy: -1 },
    tophat: { g: ['.ttttt.', '.ttttt.', '.trrrt.', 'ttttttt'], pal: { t: '#2e2e38', r: '#e8542f' }, dx: 0, dy: -2 },
    crown:  { g: ['g.g.g', 'gGgGg', 'ggggg'], pal: { g: '#ffd23f', G: '#e8542f' }, dx: 0, dy: -1 },
    halo:   { g: ['.hhhh.', 'h....h'], pal: { h: '#ffd23f' }, dx: 0, dy: -4 },
    flower: { g: ['.p.', 'pyp', '.p.'], pal: { p: '#ff8ab5', y: '#ffd23f' }, dx: 4, dy: -1 },
    sprout: { g: ['l.l', 'glg', '.g.'], pal: { g: '#5da33a', l: '#8fd14f' }, dx: 0, dy: -2 },
    wizard: { g: ['...w...', '..www..', '..wsw..', '.wwwww.', 'wwwwwww'], pal: { w: '#7a5fd0', s: '#ffd23f' }, dx: 0, dy: -3 },
    ninja:  { g: ['nnnnnnnnn', '........n'], pal: { n: '#3a3a4a' }, dx: 0, dy: 3 },
    cowboy: { g: ['...ccc...', '...ccc...', 'ccccccccc'], pal: { c: '#a8663a' }, dx: 0, dy: -1 },
    antenna:{ g: ['a.....a', 's.....s', 's.....s'], pal: { s: '#4a4a4a', a: '#ffd23f' }, dx: 0, dy: -2 },
    horns:  { g: ['h.....h', 'h.....h', '.h...h.'], pal: { h: '#f0e2c8' }, dx: 0, dy: -1 },
    tiara:  { g: ['..p..', 's.s.s', 'sssss'], pal: { s: '#e8e8f5', p: '#ff8ab5' }, dx: 0, dy: -1 },
    /* what the dinosaurs wear: a crest on the head, or plates, spikes and a sail down the back */
    crest:  { g: ['c.c.c', '.ccc.'], pal: { c: '#e8542f' }, dx: 0, dy: -1 },
    plates: { g: ['p.p.p.p', 'ppppppp'], pal: { p: '#3fa7d6' }, dx: -6, dy: 6 },
    sail:   { g: ['...s...', '..sss..', '.sssss.', 'sssssss'], pal: { s: '#c98fe0' }, dx: -6, dy: 7 },
    spikes: { g: ['s.s.s.s', '.s.s.s.'], pal: { s: '#f0e2c8' }, dx: -6, dy: 6 },
  };

  const EYE = '#2e2216', SHINE = '#ffffff', BLUSH = '#ff9eb5';

  function drawEyes(ctx, style, ex, ey, k, eyeCol, big) {
    const col = eyeCol || EYE;
    if (style === 'sleepy') {
      px(ctx, ex, ey + 1, k, col); px(ctx, ex + 1, ey + 1, k, col);
      px(ctx, ex - 1, ey + 1, k, lighten(col, 0.3));
    } else if (style === 'happy') {
      px(ctx, ex, ey + 1, k, col); px(ctx, ex + 1, ey, k, col); px(ctx, ex + 2, ey + 1, k, col);
    } else {
      /* round bead: white sclera + dark pupil + shine */
      px(ctx, ex, ey, k, '#ffffff'); px(ctx, ex + 1, ey, k, col);
      px(ctx, ex, ey + 1, k, col); px(ctx, ex + 1, ey + 1, k, col);
      px(ctx, ex, ey, k, SHINE);
      if (big) px(ctx, ex + 1, ey + 2, k, lighten(col, 0.55));
    }
  }

  function applyPattern(ctx, sp, grid, ox, oy, k) {
    const acc = sp.accent;
    if (sp.pattern === 'solid') return;
    if (sp.pattern === 'stripes') {
      for (let y = 0; y < grid.length; y++) {
        if (y % 3 !== 1) continue;
        for (let x = 0; x < grid[y].length; x++)
          if (grid[y][x] === 'B') {
            px(ctx, ox + x, oy + y, k, acc);
            if (grid[y + 1] && grid[y + 1][x] === 'B') px(ctx, ox + x, oy + y + 1, k, darken(acc, 0.2));
          }
      }
    } else if (sp.pattern === 'spots') {
      const rnd = mulberry(sp.id * 7 + 13);
      const cells = [];
      for (let y = 0; y < grid.length; y++)
        for (let x = 0; x < grid[y].length; x++)
          if (grid[y][x] === 'B' && y >= 4) cells.push([x, y]);
      for (let i = 0; i < 5 && cells.length; i++) {
        const [x, y] = cells.splice(Math.floor(rnd() * cells.length), 1)[0];
        px(ctx, ox + x, oy + y, k, acc);
        if (grid[y] && grid[y][x + 1] === 'B') px(ctx, ox + x + 1, oy + y, k, darken(acc, 0.18));
        if (grid[y + 1] && grid[y + 1][x] === 'B') px(ctx, ox + x, oy + y + 1, k, darken(acc, 0.3));
      }
    } else if (sp.pattern === 'star') {
      const shape = SHAPES[sp.shape];
      const [cx, cy] = shape ? shape.bellyC : [8, 10];
      px(ctx, ox + cx, oy + cy - 1, k, acc);
      px(ctx, ox + cx - 1, oy + cy, k, acc);
      px(ctx, ox + cx, oy + cy, k, lighten(acc, 0.4));
      px(ctx, ox + cx + 1, oy + cy, k, acc);
      px(ctx, ox + cx, oy + cy + 1, k, darken(acc, 0.2));
    }
  }

  function stampAcc(ctx, accId, headTop, ox, oy, k) {
    const a = ACC[accId];
    if (!a) return;
    const w = a.g[0].length, h = a.g.length;
    const gx = ox + headTop[0] - Math.floor(w / 2) + (a.dx || 0);
    const gy = oy + headTop[1] + (a.dy || 0) - (h - 1);
    drawGrid(ctx, a.g, a.pal, gx * k, gy * k, k);
  }

  const CELL = 20, OFF_X = 0, OFF_Y = 2;

  function paletteFor(sp) {
    const body = sp.body;
    const dark = lum(body) < 0.22 ? '#14141c' : darken(body, 0.52);
    return {
      O: dark, B: body,
      L: lighten(body, 0.34),        /* the lit line along the back and neck */
      D: darken(body, 0.26),         /* the underside, in its own shadow */
      W: darken(body, 0.12),         /* the folded wing */
      w: darken(body, 0.32),         /* the partings between its feathers */
      T: darken(sp.accent, 0.10),    /* tail sickles take the accent colour */
      t: darken(sp.accent, 0.34),
      U: sp.accent,
      C: '#cf3226',                  /* comb and wattle */
      K: '#f0a422',                  /* beak */
      F: '#e8a53f',                  /* scaly shanks and toes */
      E: '#14100c',                  /* eye */
    };
  }

  /* volume pass: light from upper-left, shade lower-right, plus rim */
  function shadeBody(ctx, rows, ox, oy, k, body) {
    const isB = (x, y) => rows[y] && 'BLWwD'.indexOf(rows[y][x]) >= 0;
    const light = lighten(body, 0.30), dark = darken(body, 0.22), deep = darken(body, 0.36);
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== 'B') continue;
        /* upper-left rim highlight */
        if (!isB(x - 1, y) && !isB(x, y - 1)) px(ctx, ox + x, oy + y, k, light);
        else if (!isB(x, y - 1) && y < 7) px(ctx, ox + x, oy + y, k, lighten(body, 0.18));
        /* lower-right shade */
        else if (!isB(x + 1, y) && !isB(x, y + 1)) px(ctx, ox + x, oy + y, k, deep);
        else if (!isB(x + 1, y)) px(ctx, ox + x, oy + y, k, dark);
        else if (!isB(x, y + 1)) px(ctx, ox + x, oy + y, k, dark);
      }
    }
  }

  function chickenSprite(sp, scale, silhouette) {
    const key = sp.id + '_' + scale + (silhouette ? '_s' : '');
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = newCanvas(CELL * k, CELL * k);
    const ctx = c.getContext('2d');

    const shape = SHAPES[sp.shape] || SHAPES.chick;
    const pal = paletteFor(sp);
    drawGrid(ctx, shape.rows, pal, OFF_X * k, OFF_Y * k, k);
    shadeBody(ctx, shape.rows, OFF_X, OFF_Y, k, sp.body);
    applyPattern(ctx, sp, shape.rows, OFF_X, OFF_Y, k);

    /* the comb, beak, wattle and shanks are drawn into the grid itself.
       What is left is the modelling a flat grid cannot carry: a catchlight
       in the eye, a darker underside to each shank, and the little pale
       ear patch real hens have behind the eye. */
    const exL = OFF_X + shape.eyeL[0], eyL = OFF_Y + shape.eyeL[1];
    const exR = exL, eyR = eyL;
    px(ctx, exL, eyL - 1, k, lighten(sp.body, 0.55));
    px(ctx, exL - 1, eyL, k, lighten(sp.body, 0.30));
    ctx.globalAlpha = 0.7;
    px(ctx, exL, eyL, k, '#5a5040');            /* a highlight in the eye */
    ctx.globalAlpha = 1;
    /* shade the shanks so they read as round */
    for (let y = 0; y < shape.rows.length; y++)
      for (let x = 0; x < shape.rows[y].length; x++)
        if (shape.rows[y][x] === 'F' && shape.rows[y][x + 1] !== 'F')
          px(ctx, OFF_X + x, OFF_Y + y, k, '#c9822c');

    /* accessory */
    if (sp.acc === 'eyepatch') {
      ctx.fillStyle = '#23232e';
      ctx.fillRect((exR - 1) * k, (eyR - 1) * k, 4 * k, 3 * k);
      ctx.fillRect((exL) * k, (eyR - 1) * k, (exR - exL) * k, k);
      px(ctx, exR, eyR - 1, k, '#3a3a4a');
    } else if (sp.acc === 'glasses') {
      ctx.fillStyle = '#23232e';
      ctx.fillRect((exL - 1) * k, (eyL - 1) * k, 4 * k, k);
      ctx.fillRect((exR - 1) * k, (eyR - 1) * k, 4 * k, k);
      ctx.fillRect((exL + 3) * k, (eyL) * k, (exR - exL - 4) * k, k);
      px(ctx, exL, eyL - 1, k, '#8fd6ff');
    } else if (sp.acc && sp.acc !== 'none') {
      stampAcc(ctx, sp.acc, shape.headTop, OFF_X, OFF_Y, k);
    }

    if (silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#7d6a4d';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    cache.set(key, c);
    return c;
  }

  /* ---------- eggs ---------- */
  function eggSprite(tier, scale, rainbow, phase) {
    const key = 'egg' + tier + '_' + scale + (rainbow ? '_r' + (phase || 0) : '');
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = newCanvas(10 * k, 12 * k);
    const ctx = c.getContext('2d');
    const shell = EGG_SHELL[tier], tc = TIERS[tier].c;
    drawGrid(ctx, EGG_ROWS, { O: darken(shell, 0.42), B: shell }, 0, 0, k);
    /* volume: light top-left, shade bottom-right */
    const isB = (x, y) => EGG_ROWS[y] && EGG_ROWS[y][x] === 'B';
    for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) {
      if (!isB(x, y)) continue;
      if (!isB(x - 1, y) || !isB(x, y - 1)) px(ctx, x, y, k, lighten(shell, 0.55));
      else if (!isB(x + 1, y) || !isB(x, y + 1)) px(ctx, x, y, k, darken(shell, 0.18));
      else if (y > 7) px(ctx, x, y, k, darken(shell, 0.10));
    }
    /* specular highlight */
    px(ctx, 3, 3, k, '#ffffff'); px(ctx, 2, 4, k, '#ffffff');
    px(ctx, 3, 4, k, lighten(shell, 0.8));
    /* tier decoration */
    if (tier >= 1 && tier <= 5) {
      const rnd = mulberry(tier * 13 + 1);
      const spots = [[3, 6], [6, 4], [5, 8], [7, 7], [2, 7]].slice(0, 1 + Math.min(tier, 4));
      spots.forEach(([x, y]) => {
        px(ctx, x, y, k, tc);
        if (rnd() < 0.6) px(ctx, x + 1, y, k, darken(tc, 0.2));
      });
    } else if (tier === 9) {
      /* a fossil egg: stone, hairline cracks, a fleck of amber */
      const crk = darken(shell, 0.45);
      [[3, 4], [4, 5], [5, 5], [5, 6], [6, 7], [3, 8], [4, 8], [6, 3], [7, 4]].forEach(([x, y]) => px(ctx, x, y, k, crk));
      px(ctx, 6, 6, k, '#f0a422'); px(ctx, 2, 6, k, darken(shell, 0.2));
    } else if (tier === 10) {
      /* a moon egg: craters, and a rim that glows */
      const cr = darken(shell, 0.18);
      [[3, 5], [6, 4], [5, 8], [7, 7]].forEach(([x, y]) => { px(ctx, x, y, k, cr); px(ctx, x + 1, y, k, darken(shell, 0.08)); });
      px(ctx, 2, 7, k, '#5fd0ff'); px(ctx, 7, 2, k, '#5fd0ff'); px(ctx, 4, 10, k, '#5fd0ff');
    } else if (tier >= 6) {
      const cx = 4, cy = 6;
      [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => px(ctx, cx + dx, cy + dy, k, tc));
      px(ctx, cx, cy, k, lighten(tc, 0.5));
      if (tier === 7) { px(ctx, 7, 3, k, '#ffffff'); px(ctx, 2, 9, k, '#ffffff'); }
    }
    if (rainbow) {
      const bands = ['#ff5f5f', '#ffb03f', '#ffe23f', '#7ac74f', '#5fa8e8', '#c96be0'];
      for (let y = 2; y < 11; y++) {
        const col = bands[(y + (phase || 0)) % bands.length];
        for (let x = 0; x < 10; x++) if (isB(x, y)) {
          if (!isB(x - 1, y) || !isB(x, y - 1)) px(ctx, x, y, k, lighten(col, 0.5));
          else px(ctx, x, y, k, col);
        }
      }
      px(ctx, 3, 3, k, '#ffffff');
    }
    cache.set(key, c);
    return c;
  }

  /* crack stages drawn over an egg: 1 = hairline, 2 = split, 3 = broken open */
  function eggCrackSprite(tier, stage, scale) {
    const key = 'crk' + tier + '_' + stage + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(10 * k, 12 * k);
    const ctx = c.getContext('2d');
    const shell = EGG_SHELL[Math.min(tier, EGG_SHELL.length - 1)];
    const dark = darken(shell, 0.45), line = darken(shell, 0.6);
    const P = (x, y, col) => px(ctx, x, y, k, col);
    if (stage >= 1) {
      [[3, 5], [4, 4], [5, 5], [6, 4]].forEach(([x, y]) => P(x, y, line));
    }
    if (stage >= 2) {
      [[2, 6], [3, 6], [4, 5], [5, 6], [6, 5], [7, 6]].forEach(([x, y]) => P(x, y, line));
      [[3, 7], [5, 7], [6, 7]].forEach(([x, y]) => P(x, y, dark));
    }
    if (stage >= 3) {
      /* a chip is gone from the top-right */
      ctx.clearRect(5 * k, 1 * k, 4 * k, 4 * k);
      [[5, 5], [6, 4], [7, 5], [8, 5]].forEach(([x, y]) => P(x, y, line));
      P(6, 5, '#2e2216'); P(7, 4, '#2e2216');
    }
    cache.set(key, c);
    return c;
  }
  /* the two halves that fly apart when a chick pops out */
  function shellHalfSprite(tier, top, scale) {
    const key = 'shl' + tier + '_' + (top ? 't' : 'b') + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(10 * k, 7 * k);
    const ctx = c.getContext('2d');
    const shell = EGG_SHELL[Math.min(tier, EGG_SHELL.length - 1)];
    const rows = top
      ? ['...oooo...', '..owwwwo..', '.owwwwwwo.', 'owwwwwwwwo', 'o.w.o.w.oo', '..........', '..........']
      : ['o.w.o.ww.o', 'owwwwwwwwo', 'owwwwwwwwo', '.owwwwwwo.', '.owwwwwwo.', '..owwwwo..', '...oooo...'];
    drawGrid(ctx, rows, { o: darken(shell, 0.45), w: shell }, 0, 0, k);
    /* highlight */
    px(ctx, 2, top ? 2 : 1, k, lighten(shell, 0.6));
    cache.set(key, c);
    return c;
  }

  function nestSprite(scale) {
    const key = 'nest_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = newCanvas(20 * k, 7 * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, NEST_ROWS, { s: '#d9a95f', S: '#c08c3f', o: '#7a4e20', d: '#9c6b32' }, 0, 0, k);
    /* a few loose straws */
    ctx.fillStyle = '#e8c48f';
    ctx.fillRect(2 * k, 1 * k, 3 * k, k);
    ctx.fillRect(14 * k, 2 * k, 3 * k, k);
    cache.set(key, c);
    return c;
  }

  function mamaSprite(tier, scale, mood) {
    const key = 'mama4_' + tier + '_' + scale + '_' + mood;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = newCanvas(36 * k, 30 * k);
    const ctx = c.getContext('2d');
    const [body, comb] = MAMA_TIER[tier];
    const ox = 1, oy = 2;
    const dark = lum(body) < 0.22 ? '#14141c' : darken(body, 0.52);
    drawGrid(ctx, MAMA.rows, {
      O: dark, B: body,
      L: lighten(body, 0.34),
      D: darken(body, 0.26),
      W: darken(body, 0.12),
      w: darken(body, 0.32),
      T: darken(body, 0.40),
      C: comb, K: '#f0a422', E: '#14100c',
    }, ox * k, oy * k, k);
    shadeBody(ctx, MAMA.rows, ox, oy, k, body);

    const ex = ox + MAMA.eyeL[0], ey = oy + MAMA.eyeL[1];
    if (mood === 'blink') {
      /* a hen blinks upward, so the lid comes from below */
      px(ctx, ex, ey, k, lighten(body, 0.30));
      px(ctx, ex, ey + 1, k, darken(body, 0.34));
    } else {
      px(ctx, ex, ey, k, '#14100c');
      px(ctx, ex, ey - 1, k, lighten(body, 0.55));
      if (mood === 'happy') px(ctx, ex + 1, ey - 1, k, lighten(body, 0.55));
    }
    /* the pale ear patch a laying hen has behind the eye */
    px(ctx, ex - 2, ey + 1, k, lighten(body, 0.46));
    px(ctx, ex - 2, ey + 2, k, lighten(body, 0.28));

    if (tier === 6) [[12, 17], [20, 15], [16, 21]].forEach(([x, y]) => px(ctx, ox + x, oy + y, k, '#ffd23f'));
    else if (tier === 7) [[11, 16], [21, 14], [16, 22]].forEach(([x, y]) => px(ctx, ox + x, oy + y, k, '#ffffff'));
    if (tier === 7) stampAcc(ctx, 'halo', MAMA.headTop, ox, oy, k);
    cache.set(key, c);
    return c;
  }


  /* ============================================================
     ICONS — 10x10 pixel glyphs (replace every emoji)
     ============================================================ */
  const IP = {
    '.': null, o: '#2e2216', w: '#fff8ee', W: '#c9ced6', g: '#8a8f98',
    y: '#ffd23f', Y: '#d99a12', r: '#e8542f', R: '#a8321c',
    p: '#ff5f9e', P: '#c42f6e', G: '#7ac74f', E: '#3a7d3a',
    b: '#5fa8e8', B: '#2f5f9e', n: '#c9924f', N: '#7a5230',
    c: '#7fe8d0', v: '#a58ae0', k: '#3a3a4a', s: '#f2e2c8', m: '#e8e8f0',
  };
  const ICONS = {
    clock: [
      '...oooo...', '..owwwwo..', '.owwowwwo.', 'owwwowwwwo', 'owwwoowwwo',
      'owwwwwwwwo', 'owwwwwwwwo', '.owwwwwwo.', '..owwwwo..', '...oooo...'],
    hoe: [
      '.......oo.', '......onno', '.....onno.', '....onno..', '...onno...',
      '..onno....', '.oooo.....', 'ogggo.....', 'oggo......', '.oo.......'],
    water: [
      '....oo....', '...ogbo...', 'oo.oggo.oo', 'obooggoobo', 'obogggggbo',
      'oboggggggo', '.ooggggggo', '..ogggggo.', '..ogggggo.', '...ooooo..'],
    scythe: [
      '..ooooo...', '.oWWWWWo..', 'oWWo..oWo.', 'oWo...onno', 'oo...onno.',
      '....onno..', '...onno...', '..onno....', '.onno.....', 'ooo.......'],
    sprout: [
      '..........', '....oo....', '.oo.oGo.oo', 'oGGooGooGo', '.oGGoGoGG.',
      '..oGGGGG..', '...oGGo...', '....oGo...', '..oooooo..', '.onnnnnno.'],
    bike: [
      '..oo....oo', '.o..o..o..', '..oooooo..', '.o.oo..o..', 'ooooo.oooo',
      'o...o.o..o', 'o.o.o.o.oo', 'o...ooo..o', 'ooooo.oooo', '..........'],
    city: [
      '.....oo...', '..oo.oWo..', '.oWoooWo..', '.oWoWoWooo', 'ooWoWoWoWo',
      'oWWoWoWoWo', 'oWWoWoWoWo', 'oWWoWoWoWo', 'oooooooooo', '..........'],
    mouse: [
      'o.........', 'oo........', 'owo.......', 'owwo......', 'owwwo.....',
      'owwwwo....', 'owwooo....', 'owo.......', 'oo........', '..........'],
    coin: [
      '..oooooo..', '.oyyyyyyo.', 'oyYyyyyYyo', 'oyywwwyyyo', 'oyywwwyyyo',
      'oyYyyyyYyo', 'oyyyyyyyyo', '.oyyyyyyo.', '..oooooo..', '..........'],
    feather: [
      '.......oo.', '......owwo', '.....owwwo', '....owwswo', '...owwswo.',
      '..owwswo..', '.owwswo...', '.owswo....', 'oowo......', 'oo........'],
    egg: [
      '...oooo...', '..owwsso..', '.owwwwsso.', 'owwwwwssso', 'owwwwwssso',
      'owwwwwssso', 'owwwwwssso', '.owwwwsso.', '..osssso..', '...oooo...'],
    lock: [
      '...oooo...', '..oWWWWo..', '..oW..Wo..', '..oW..Wo..', 'oooooooooo',
      'oyyyyyyyyo', 'oyyyooyyyo', 'oyyyooyyyo', 'oyyyyyyyyo', 'oooooooooo'],
    flag: [
      '.oo.......', '.oro......', '.orro.....', '.orrro....', '.orrrro...',
      '.orrro....', '.orro.....', '.oro......', '.oo.......', '.oo.......'],
    tick: [
      '..........', '........oo', '.......oGo', '......oGo.', '.oo..oGo..',
      'oGGooGo...', '.oGGGo....', '..oGo.....', '...o......', '..........'],
    hexcomb: [
      '...oooo...', '..oyyyyo..', '.oyYyyYyo.', 'oyyyyyyyyo', 'oyYyyYyyyo',
      'oyyyyyyYyo', 'oyYyyyyyyo', '.oyyYyyyo.', '..oyyyyo..', '...oooo...'],
    raccoon: [
      '..o....o..', '.oko..oko.', 'okkkookkko', 'okwkkkkwko', 'okookkooko',
      '.okkkkkko.', '..okWWko..', '...okko...', '....oo....', '..........'],
    honey: [
      '...oooo...', '..oNNNNo..', '.oyyyyyyo.', 'oyyYyyyyyo', 'oyyyyyyyyo',
      'oyyyyyYyyo', 'oyYyyyyyyo', '.oyyyyyyo.', '..oyyyyo..', '...oooo...'],
    bee: [
      '..........', '..o....o..', '.oWo..oWo.', '..oyyyyo..', '.oykkyyko.',
      '.oyyykkyo.', '.oykyyyko.', '..oyyyyo..', '...oooo...', '..........'],
    cube: [
      '..oooooo..', '.obbbbbbo.', 'obBBBBBBbo', 'obBBBBBBbo', 'obBBBBBBbo',
      'obBBBBBBbo', 'obBBBBBBbo', 'obBBBBBBbo', '.oBBBBBBo.', '..oooooo..'],
    suitcase: [
      '....oo....', '...onno...', '.oooooooo.', 'oNNNNNNNNo', 'oNnNNNNnNo',
      'oNNNNNNNNo', 'oNNNoNNNNo', 'oNNNNNNNNo', '.oooooooo.', '..........'],
    car: [
      '..........', '...oooo...', '..obbbbo..', '.obwwbwbo.', 'oooooooooo',
      'orrrrrrrro', 'oyrrrrrryo', 'oooooooooo', '.okko.okko', '..oo...oo.'],
    basket: [
      '...oooo...', '..o....o..', '.oooooooo.', '.onNnNnNo.', '.oNnNnNno.',
      '.onNnNnNo.', '..oNnNno..', '...oooo...', '..........', '..........'],
    basket2: [
      '..oooooo..', '.o......o.', 'oooooooooo', 'onNnNnNnNo', 'oNnNnNnNno',
      'onNnNnNnNo', 'oNnNnNnNno', '.onNnNnNo.', '..oooooo..', '..........'],
    magnet: [
      '.oo....oo.', 'owwo..owwo', 'orro..orro', 'orro..orro', 'orro..orro',
      'orroooorro', '.orrrrrro.', '..oooooo..', '..........', '..........'],
    seed: [
      '....o.....', '...oyo....', '..oyoyo...', '...oyo....', '..oyoyo...',
      '...oyo....', '..oyoyo...', '...oEo....', '...oEo....', '....o.....'],
    bowl: [
      '..........', '.o..o..o..', '.oyoyoyoo.', 'oooooooooo', 'owWWWWWwo.',
      'owWWWWWwo.', '.oWWWWWo..', '..ooooo...', '..........', '..........'],
    clover: [
      '..........', '..oGo.oGo.', '.oGwGoGwGo', '.oGGGGGGGo', '..oGGGGGo.',
      '.oGGGoGGGo', '..oGo.oGo.', '....oEo...', '....oEo...', '..........'],
    heart: [
      '.ooo..ooo.', 'opwpoopppo', 'oppppppppo', 'opppppppPo', '.opppppPo.',
      '..oppPPo..', '...oPPo...', '....oo....', '..........', '..........'],
    hands: [
      '..o....o..', '.owo..owo.', '.owo..owo.', 'oowoooowoo', 'owwwwwwwwo',
      'owwwwwwwwo', '.owwwwwwo.', '..oooooo..', '..........', '..........'],
    house: [
      '....oo....', '...orro...', '..orrrro..', '.orrrrrro.', 'orrrrrrrro',
      'osssssssso', 'osoosoosso', 'osoosoosso', 'oooooooooo', '..........'],
    sparkle: [
      '....o.....', '....y.....', '...oyo....', 'o..oyo..o.', 'oyyyyyyyyo',
      'o..oyo..o.', '...oyo....', '....y.....', '....o.....', '..........'],
    dna: [
      '.o......o.', '..o....o..', '..cooooc..', '...o..o...', '...o..o...',
      '..cooooc..', '..o....o..', '.o......o.', '..........', '..........'],
    rainbow: [
      '..oooooo..', '.orrrrrro.', 'oryyyyyyro', 'oyGGGGGGyo', 'oGbbbbbbGo',
      'ob.oooo.bo', 'o..o..o..o', '..........', '..........', '..........'],
    flame: [
      '....o.....', '...oro....', '..orrro...', '..oryro...', '.orryyro..',
      '.oryyyyro.', '.oryyyyro.', '..orryro..', '..oorroo..', '..........'],
    rack: [
      'oooooooooo', 'owoowoowoo', 'oooooooooo', 'owoowoowoo', 'oooooooooo',
      'owoowoowoo', 'oooooooooo', '..........', '..........', '..........'],
    twins: [
      '..........', '.oo...oo..', 'owwo.owwo.', 'owwwoowwwo', 'owwwoowwwo',
      '.owwo.owwo', '..oo...oo.', '..........', '..........', '..........'],
    star: [
      '....o.....', '....y.....', '...oyo....', 'oooyyyooo.', 'oyyyyyyyo.',
      '.oyyyyyo..', '..oyyyo...', '.oyo.oyo..', '.o.....o..', '..........'],
    atom: [
      '..oooooo..', '.o......o.', 'o..occo..o', 'o.oc..co.o', 'o.oc..co.o',
      'o..occo..o', '.o......o.', '..oooooo..', '..........', '..........'],
    cupid: [
      'o.........', '.oo..oo...', 'opwpoppo..', 'oppppppo..', '.opppppo..',
      '..oppppo.o', '...oppo.o.', '....oo.o..', '.......o..', '..........'],
    candle: [
      '....o.....', '....y.....', '...oyo....', '....o.....', '..owsso...',
      '..owsso...', '..owsso...', '..owsso...', '..ooooo...', '..........'],
    flask: [
      '...oooo...', '...o..o...', '...o..o...', '..o.cc.o..', '..o.cc.o..',
      '.o.cccc.o.', '.o.cccc.o.', 'o.cccccc.o', 'oooooooooo', '..........'],
    hearts: [
      '.oo..oo...', 'opwpoppo..', 'oppppppo..', '.oppppo..o', '..oppo..oo',
      '...oo.oppo', '......oppo', '......oppo', '.......oo.', '..........'],
    rainbowegg: [
      '...oooo...', '..orrrro..', '.oryyyyro.', 'oryyyyyyro', 'oGGGGGGGGo',
      'obbbbbbbbo', 'ovvvvvvvvo', '.ovvvvvvo.', '..ovvvvo..', '...oooo...'],
    scroll: [
      '.oooooooo.', 'onnnnnnnno', 'onssssssno', 'onsooosnno', 'onssssssno',
      'onsoooosno', 'onssssssno', 'onnnnnnnno', '.oooooooo.', '..........'],
    crate: [
      'oooooooooo', 'onnnnnnnno', 'onNnnnnNno', 'onnNnnNnno', 'onnnNNnnno',
      'onnNnnNnno', 'onNnnnnNno', 'onnnnnnnno', 'oooooooooo', '..........'],
    oil: [
      '........o.', '.......oo.', 'oooooooo..', 'ogggggno..', 'ogyyyyno..',
      'ogyyyyno..', 'ognnnnno..', 'oooooooo..', '..........', '..........'],
    robot: [
      '..oooooo..', '.oWWWWWWo.', '.oWbbbbWo.', '.oWWWWWWo.', 'oooooooooo',
      '.oWWWWWWo.', '.okWWWWko.', '.oooooooo.', '..o....o..', '..........'],
    spiral: [
      '..oooooo..', '.o......o.', 'o..oooo..o', 'o.o....o.o', 'o.o.oo.o.o',
      'o.o.oo...o', 'o..o.....o', '.o..ooooo.', '..oooo....', '..........'],
    wind: [
      '..........', '.ooooooo..', 'o.......oo', '..ooooooo.', '.ooooooooo',
      'o.......o.', '.ooooooo..', '..ooooo...', '..........', '..........'],
    bolt: [
      '....ooo...', '...oyyo...', '..oyyo....', '..oyyoooo.', '.oyyyyyyo.',
      '.ooooyyyo.', '....oyyo..', '...oyyo...', '...oyo....', '...oo.....'],
    truck: [
      '..........', 'oooooo....', 'onnnnoooo.', 'onnnnobbo.', 'onnnnobbo.',
      'oooooooooo', '.oko..oko.', '.okko.okko', '..o....o..', '..........'],
    road: [
      '....oo....', '...onno...', '...onno...', '..onwwno..', '..onnnno..',
      '.onnwwnno.', '.onnnnnno.', 'onnnwwnnno', 'oooooooooo', '..........'],
    chart: [
      'o........o', 'o.......bo', 'o.....obbo', 'o....obbbo', 'o..obbbbbo',
      'o.obbbbbbo', 'o.obbbbbbo', 'oooooooooo', '..........', '..........'],
    key: [
      '..oooo....', '.oyyyyo...', 'oyyoyyo...', 'oyyoyyo...', '.oyyyyoooo',
      '..oyyyyyyo', '...oyoyoyo', '....ooooo.', '..........', '..........'],
    doc: [
      '.oooooooo.', 'osssssssso', 'osooooosso', 'osssssssso', 'osooooosso',
      'ossssssoso', 'osoooosoro', 'osssssorro', '.ooooooooo', '..........'],
    crown: [
      'o..o..o..o', 'oy.oy.oy.o', 'oyooyooyoo', 'oyyyyyyyyo', 'oyrYyYryyo',
      'oyyyyyyyyo', 'oooooooooo', '..........', '..........', '..........'],
    hammer: [
      '.oooooo...', 'oWWWWWWo..', 'oWWggWWo..', 'ooooNoooo.', '...oNo....',
      '...oNo....', '...oNo....', '...oNo....', '....o.....', '..........'],
    gear: [
      '..o.oo.o..', '.ooggggoo.', '.oggggggo.', 'oogg..ggoo', 'ogg....ggo',
      'ogg....ggo', 'oogg..ggoo', '.oggggggo.', '.ooggggoo.', '..o.oo.o..'],
    hand: [
      '....oo....', '...owwo...', '...owwo...', '.oowwwoo..', 'owwwwwwwo.',
      'owwwwwwwo.', 'owwwwwwwo.', '.owwwwwo..', '..ooooo...', '..........'],
    arrow: [
      '..........', '...oooo...', '..o....o..', '.o......o.', '.o..oooooo',
      '.o...oooo.', '..o...oo..', '...ooo.o..', '..........', '..........'],
    remove: [
      'oo......oo', 'orro....oo', '.orro..oo.', '..orroo...', '...oro....',
      '..oorro...', '.oo..orro.', 'oo....orro', 'o.......oo', '..........'],
    book: [
      '.oooooooo.', 'osssoossso', 'osoosoosso', 'ossssoosso', 'osoosoosso',
      'ossssoosso', 'osoosoosso', 'osssoossso', '.oooooooo.', '..........'],
    chick: [
      '..oooooo..', '.oyyyyyyo.', 'oyoyyyoyyo', 'oyyyryyyyo', 'oyyyyyyyyo',
      '.oyyyyyyo.', '..oyyyyo..', '...o..o...', '..........', '..........'],
    plus: [
      '...oooo...', '...oGGo...', 'oooGGGGooo', 'oGGGGGGGGo', 'oGGGGGGGGo',
      'oooGGGGooo', '...oGGo...', '...oooo...', '..........', '..........'],
    sorter: [
      'oooooooooo', 'oWWWWWWWWo', 'oWoooooWWo', 'oWWWWWoWWo', 'ooooWWoWWo',
      '...oyyoWWo', '...oyyoWWo', 'oooooooooo', '..........', '..........'],
    blower: [
      '..oooo....', '.oWWWWo...', 'oWWggWWo..', 'oWggggWo.c', 'oWggggWo.c',
      'oWWggWWoc.', '.oWWWWo.c.', '..oooo..c.', '..........', '..........'],
    silo: [
      '..oooooo..', '.oWWWWWWo.', 'oWWWWWWWWo', 'oWnnnnnnWo', 'oWnwwwwnWo',
      'oWnnnnnnWo', 'oWnwwwwnWo', 'oWnnnnnnWo', 'oooooooooo', '..........'],
    magnify: [
      '..oooo....', '.oWWWWo...', 'oWwwwwWo..', 'oWwwwwWo..', 'oWwwwwWo..',
      '.oWWWWo...', '..oooo.o..', '.......oo.', '........oo', '.........o'],
    fence: [
      '..o....o..', '.oNo..oNo.', 'oNNNooNNNo', 'oNnNooNnNo', 'oooooooooo',
      'oNnNooNnNo', 'oNNNooNNNo', '.oNo..oNo.', '..o....o..', '..........'],
    person: [
      '...oooo...', '..oNNNNo..', '.oNNNNNNo.', '...osso...', '...oeso...',
      '..obbbbo..', '.obbbbbbo.', '..obbbbo..', '..ok..ko..', '..oo..oo..'],
    bot: [
      '....o.....', '...oyo....', '..oWWWWo..', '.oWbbbbWo.', '.oWWWWWWo.',
      'ooWWWWWWoo', 'oWWkWWkWWo', 'oWWWWWWWWo', '.okkookko.', '..........'],
    globe: [
      '..oooooo..', '.obbGGbbo.', 'obGGbbGbbo', 'obbGbbbGbo', 'oGbbbGGbbo',
      'oGGbbGGbbo', 'obbGbbbbbo', 'obbbbGGbbo', '.obbbGbbo.', '..oooooo..'],
    dino: [
      '.....oooo.', '....oGGGGo', '....oGwGGo', '.o..oGGGGo', 'oGo.oGGGoo',
      'oGGooGGGo.', '.oGGGGGGo.', '..oGGGGo..', '...oGoGo..', '...oo.oo..'],
    fossil: [
      '..........', '.oo....oo.', 'owwo..owwo', '.owwoowwo.', '..owwwwo..',
      '..owwwwo..', '.owwoowwo.', 'owwo..owwo', '.oo....oo.', '..........'],
    pan: [
      '..........', '..........', '.oooooo...', 'okkkkkko..', 'okwwwwkooo',
      'okwyywkkno', 'okwwwwko..', '.oooooo...', '..........', '..........'],
    cake: [
      '....y.....', '....o.....', '.oooooooo.', 'opwpwpwppo', 'oppppppppo',
      '.oooooooo.', 'onnnnnnnno', 'onnnnnnnno', '.oooooooo.', '..........'],
    drumstick: [
      '..........', '....ooooo.', '...onnnnno', '..onnNnnno', '..onnnnno.',
      '.ooonnno..', 'oww.ooo...', 'owwo......', '.oo.......', '..........'],
    ticket: [
      '..........', '.oooooooo.', 'oyyyoYYYYo', 'oyyyoYYYYo', 'oyyyoYwYYo',
      'oyyyoYYYYo', 'oyyyoYYYYo', '.oooooooo.', '..........', '..........'],
    medal: [
      '..oo..oo..', '..oro.ro..', '..oro.ro..', '...oooo...', '..oyyyyo..',
      '.oyyYyyyo.', '.oyYyyyyo.', '.oyyyyyyo.', '..oyyyyo..', '...oooo...'],
    moon: [
      '...oooo...', '..owwwwo..', '.owwoooo..', '.owwo.....', 'owwwo.....',
      'owwwo.....', '.owwo.....', '.owwwoooo.', '..owwwwo..', '...oooo...'],
    quest: [
      '..oooooo..', '.owwwwwwo.', 'owwoooowwo', 'oooo..owwo', '....oowwo.',
      '...owwoo..', '...owwo...', '...oooo...', '...owwo...', '...oooo...'],
    sign: [
      'oooooooooo', 'osssssssso', 'osoyyyyoso', 'osoyyyyoso', 'osssssssso',
      'oooooooooo', '...oNo....', '...oNo....', '..oNNNo...', '..ooooo...'],
    brush: [
      '.......ooo', '......opro', '.....oppro', '....oppro.', '...oppro..',
      '..owwro...', '.owwwo....', 'ovvvvo....', 'ovvvo.....', 'oooo......'],
    bus: [
      '..........', 'oooooooooo', 'obbwwbbwwo', 'obbwwbbwwo', 'oyyyyyyyyo',
      'oyyyyyyyyo', 'oooooooooo', '.okko.okko', '..oo...oo.', '..........'],
    racc: [
      '.o......o.', 'oko....oko', 'okkooookko', 'okwkkkkwko', 'okookkooko',
      '.okkkkkko.', '..okWWko..', '...okko...', '..ok..ko..', '..oo..oo..'],
  };
  function iconSprite(name, scale) {
    const key = 'ic_' + name + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const rows = ICONS[name] || ICONS.egg;
    const k = scale || 1;
    const c = newCanvas(10 * k, 10 * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, rows, IP, 0, 0, k);
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     BILLBOARDS
     A poster is a grid of fat pixels: BILL_W x BILL_H cells, each
     one a character indexing BILL_COLS. The presets are painted
     here with the same 3x5 font the signs use, so a board can
     carry real lettering at one pixel a cell.
     ============================================================ */
  const BILL_W = 28, BILL_H = 14;
  const CH = '0123456789ab';                       /* cell -> palette index */
  function blankArt(fill) { return (CH[fill || 0]).repeat(BILL_W * BILL_H); }
  function artPainter(fill) {
    const cells = blankArt(fill).split('');
    const set = (x, y, i) => { if (x >= 0 && y >= 0 && x < BILL_W && y < BILL_H) cells[y * BILL_W + x] = CH[i] || '0'; };
    const rect = (x, y, w, h, i) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, i); };
    /* stamp a word in the tiny font, one glyph pixel to one cell */
    const txt = (str, x, y, i) => {
      let cx = 0;
      String(str).toUpperCase().split('').forEach(ch => {
        const g = FONT[ch];
        if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++)
          if (g[r][c] === '#') set(x + cx + c, y + r, i);
        cx += (g ? g[0].length : 3) + 1;
      });
    };
    const disc = (cx, cy, r, i, squash) => {
      const sq = squash || 1;
      for (let y = Math.floor(cy - r * sq); y <= cy + r * sq; y++)
        for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const dx = (x - cx) / r, dy = (y - cy) / (r * sq);
          if (dx * dx + dy * dy <= 1) set(x, y, i);
        }
    };
    return { set, rect, txt, disc, out: () => cells.join('') };
  }
  /* the poster designs. `co` is the company, so its own board wears
     the mark and the name you filed. */
  function billboardPreset(id, co) {
    const P = artPainter(id === 'sale' ? 5 : id === 'brand' ? 3 : 1);
    if (id === 'blank') return blankArt(0);
    if (id === 'eggs') {
      /* a fat egg on the left, the shout on the right */
      P.disc(6, 7, 5.4, 1, 1.15);
      for (let y = 2; y < 13; y++) for (let x = 1; x < 12; x++) {
        const dx = (x - 6) / 5.4, dy = (y - 7) / 6.2;
        if (dx * dx + dy * dy > 1) continue;
        if (dx * dx + dy * dy > 0.72) P.set(x, y, 4);
        else if (x < 5 && y < 7) P.set(x, y, 1);
      }
      P.set(4, 4, 1); P.set(3, 5, 1);
      P.txt('EGGS', 13, 2, 5);
      P.txt('NOW!', 13, 8, 2);
      P.rect(13, 7, 14, 1, 4);
      return P.out();
    }
    if (id === 'sale') {
      P.rect(0, 0, BILL_W, 1, 3); P.rect(0, BILL_H - 1, BILL_W, 1, 3);
      P.txt('BIG', 2, 2, 1);
      P.txt('SALE', 2, 8, 3);
      /* one clean starburst badge in the corner, clear of the lettering */
      for (let a = 0; a < 10; a++) {
        const t = a / 10 * Math.PI * 2;
        P.set(Math.round(23 + Math.cos(t) * 5), Math.round(4 + Math.sin(t) * 4.4), 3);
      }
      P.disc(23, 4, 3.4, 3, 1);
      P.disc(23, 4, 2.1, 1, 1);
      P.txt('!', 22, 8, 1);
      return P.out();
    }
    if (id === 'hen') {
      P.rect(0, 0, BILL_W, BILL_H, 9);
      P.txt('OUR', 2, 2, 2);
      P.txt('HENS', 2, 7, 2);
      /* a hen, side on, drawn straight into the cells */
      const rows = ['.....ww.', '....wwww', '.oooowwo', 'oooooowk', 'oooooowo',
                    '.ooooooo', '..oooo..', '..o..o..'];
      rows.forEach((row, y) => row.split('').forEach((ch, x) => {
        if (ch === 'o') P.set(18 + x, 3 + y, 1);
        else if (ch === 'w') P.set(18 + x, 3 + y, 3);
        else if (ch === 'k') P.set(18 + x, 3 + y, 2);
      }));
      P.rect(0, BILL_H - 2, BILL_W, 2, 7);
      return P.out();
    }
    /* the company's own board: a rule top and bottom, up to two words
       of five between them, and the mark stamped in the corner */
    P.rect(0, 0, BILL_W, 1, 2); P.rect(0, BILL_H - 1, BILL_W, 1, 2);
    const name = ((co && co.name) || 'INF EGG CO.').replace(/[^A-Z0-9 ]/gi, '').trim().toUpperCase();
    const words = name.split(' ').filter(Boolean).slice(0, 2);
    const top = words.length > 1 ? 2 : 5;
    words.forEach((w, i) => P.txt(w.slice(0, 5), 2, top + i * 6, 2));
    P.disc(24, 7, 3, 4, 1);
    P.disc(24, 7, 1.7, 1, 1);
    return P.out();
  }
  /* the hoarding itself: two legs, a braced frame, the poster, a hood of lamps */
  function billboardSprite(art, k, lit) {
    const key = 'bill_' + (art || 'x').length + '_' + k + '_' + (lit ? 1 : 0) + '_' + hashStr(art || '');
    if (cache.has(key)) return cache.get(key);
    k = k || 1;
    const W = 34, H = 46;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    /* legs and cross-brace */
    R(5, 24, 4, 22, '#3a2a16'); R(6, 24, 2, 21, '#8a5e2a');
    R(25, 24, 4, 22, '#3a2a16'); R(26, 24, 2, 21, '#8a5e2a');
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = '#6e4a20';
      ctx.fillRect((7 + i) * k, (27 + i) * k, k, k);
      ctx.fillRect((26 - i) * k, (27 + i) * k, k, k);
    }
    R(4, 43, 26, 3, '#3a2a16');
    /* the frame */
    R(0, 3, W, 24, '#2e2216');
    R(1, 4, W - 2, 22, '#7a5230');
    R(2, 5, W - 4, 20, '#5e3d18');
    R(3, 6, BILL_W, BILL_H, BILL_COLS[0]);
    /* the poster */
    const a = art || blankArt(0);
    for (let y = 0; y < BILL_H; y++) for (let x = 0; x < BILL_W; x++) {
      const i = CH.indexOf(a[y * BILL_W + x]);
      if (i <= 0) continue;
      ctx.fillStyle = BILL_COLS[i];
      ctx.fillRect((3 + x) * k, (6 + y) * k, k, k);
    }
    /* glass sheen across the poster */
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    for (let i = 0; i < 6; i++) ctx.fillRect((4 + i) * k, (6 + i) * k, 2 * k, k);
    /* the hood, and three lamps under it */
    R(2, 0, W - 4, 3, '#3a2a16');
    R(3, 1, W - 6, 1, '#8a9099');
    [7, 16, 25].forEach(x => {
      R(x, 3, 3, 2, '#2e2216');
      R(x, 3, 3, 1, lit ? '#fff3c4' : '#8a8f98');
    });
    if (lit) {
      ctx.fillStyle = 'rgba(255,235,150,.16)';
      [7, 16, 25].forEach(x => ctx.fillRect((x - 2) * k, 5 * k, 7 * k, 8 * k));
    }
    cache.set(key, c);
    return c;
  }
  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* ============================================================
     THE OTHER SIDE OF THE ROAD
     Once the road got wide enough to have two sides, the far one
     needed a town on it: shop fronts with awnings and lit windows,
     a bus shelter, a post box, lamps and a low wall.
     ============================================================ */
  const SHOP_PAL = [
    ['#e8dcc0', '#c9b48c', '#c94a3a'], ['#d8e4ec', '#b8c4cc', '#3f6fd6'],
    ['#f2e2c8', '#d9c8a8', '#6ab04c'], ['#e4d4e8', '#c8b4cc', '#b06ee0'],
    ['#eae0cc', '#cabfa8', '#f0a422'],
  ];
  const SHOP_WORDS = ['EGGS', 'CAFE', 'BANK', 'POST', 'SHOP', 'DELI', 'HATS', 'IRON', 'TOYS', 'FEED'];
  function townSprite(kind, seed, k) {
    const key = 'town_' + kind + '_' + seed + '_' + k;
    if (cache.has(key)) return cache.get(key);
    k = k || 1;
    const rnd = mulberry(seed * 61 + 17);
    const wide = kind === 'wide';
    const W = wide ? 64 : 44, H = kind === 'shed' ? 44 : 62;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const pal = SHOP_PAL[Math.floor(rnd() * SHOP_PAL.length)];
    const OUT = '#2e2216';
    const wallTop = kind === 'shed' ? 12 : 8;
    /* the block itself */
    R(0, wallTop, W, H - wallTop, OUT);
    R(1, wallTop + 1, W - 2, H - wallTop - 2, pal[0]);
    R(1, wallTop + 1, W - 2, 2, lighten(pal[0], 0.3));
    R(1, H - 4, W - 2, 3, pal[1]);
    /* brick or plaster courses */
    for (let y = wallTop + 4; y < H - 5; y += 5) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(k, y * k, (W - 2) * k, k); }
    /* roof: a parapet, or a pitch on a shed */
    if (kind === 'shed') {
      for (let i = 0; i < 7; i++) { ctx.fillStyle = i === 0 ? OUT : (i % 2 ? '#8a5e2a' : '#a8783f'); ctx.fillRect((1 + i) * k, (wallTop - i) * k, (W - 2 - i * 2) * k, k); }
    } else {
      R(0, 4, W, 5, OUT);
      R(1, 5, W - 2, 3, pal[2]);
      R(1, 5, W - 2, 1, lighten(pal[2], 0.35));
      /* the shop name on the fascia */
      const word = SHOP_WORDS[Math.floor(rnd() * SHOP_WORDS.length)];
      drawTiny(ctx, word, Math.round(W / 2 - tinyW(word, 1) / 2) * k, 5 * k, lum(pal[2]) > 0.55 ? '#2e2216' : '#fff8ec', k);
      /* an awning over the window */
      const ax = 3, aw = W - 6;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i === 3 ? OUT : (Math.floor(i) % 2 ? '#fff8ec' : pal[2]);
        ctx.fillRect((ax + i) * k, (wallTop + 8 + i) * k, (aw - i * 2) * k, k);
      }
      for (let x = ax + 4; x < ax + aw - 4; x += 6) { ctx.fillStyle = OUT; ctx.fillRect(x * k, (wallTop + 12) * k, k, 2 * k); }
    }
    /* the shop window, lit, with things in it */
    const wy = wallTop + (kind === 'shed' ? 6 : 15), wh = 14;
    R(3, wy, W - 6, wh, OUT);
    R(4, wy + 1, W - 8, wh - 2, '#ffe9a0');
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(5 * k, (wy + 2) * k, 6 * k, k);
    for (let i = 0; i < (wide ? 5 : 3); i++) {
      const sx = 6 + i * ((W - 14) / (wide ? 5 : 3));
      ctx.fillStyle = ['#fff8ec', '#e8542f', '#6ab04c', '#3fa7d6', '#c9a35f'][i % 5];
      ctx.fillRect(Math.round(sx) * k, (wy + wh - 6) * k, 3 * k, 4 * k);
    }
    ctx.fillStyle = OUT;
    for (let x = 3 + Math.round((W - 6) / 2); x < W - 3; x += 100) ctx.fillRect(x * k, wy * k, k, wh * k);
    /* the door */
    const dx = wide ? W - 16 : W - 13;
    R(dx, H - 20, 10, 19, OUT);
    R(dx + 1, H - 19, 8, 18, '#7a5230');
    R(dx + 1, H - 19, 8, 1, '#a8783f');
    R(dx + 2, H - 17, 6, 5, '#d8f2fa');
    ctx.fillStyle = '#ffd23f'; ctx.fillRect((dx + 7) * k, (H - 10) * k, k, k);
    /* upstairs windows */
    if (kind !== 'shed') {
      const n = wide ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const ux = 5 + i * Math.round((W - 10) / n);
        R(ux, wallTop + 2, 8, 5, OUT);
        R(ux + 1, wallTop + 3, 6, 3, rnd() < 0.5 ? '#ffe9a0' : '#8fb8d6');
      }
    }
    cache.set(key, c);
    return c;
  }
  /* a bus shelter: a glass box with a bench and a timetable */
  function shelterSprite(k) {
    const key = 'shelter_' + k;
    if (cache.has(key)) return cache.get(key);
    k = k || 1;
    const W = 44, H = 34;
    const c = newCanvas(W * k, H * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    R(0, 0, W, 5, '#2e2216');
    R(1, 1, W - 2, 3, '#3fa7d6');
    R(1, 1, W - 2, 1, '#7fc4e8');
    R(2, 5, 3, 28, '#2e2216'); R(39, 5, 3, 28, '#2e2216');
    R(5, 5, 34, 24, 'rgba(200,240,255,.30)');
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(7 * k, 7 * k, 8 * k, k); ctx.fillRect(7 * k, 8 * k, 4 * k, k);
    /* bench */
    R(7, 24, 26, 3, '#8a5e2a'); R(7, 24, 26, 1, '#c9a35f');
    R(9, 27, 2, 5, '#5e3d18'); R(29, 27, 2, 5, '#5e3d18');
    /* timetable */
    R(33, 8, 7, 11, '#2e2216'); R(34, 9, 5, 9, '#fff8ec');
    ctx.fillStyle = '#8a8070';
    for (let y = 10; y < 17; y += 2) ctx.fillRect(34 * k, y * k, 5 * k, k);
    R(0, 33, W, 1, '#2e2216');
    cache.set(key, c);
    return c;
  }

  /* ---------- hand & tools (drawn in-world) ---------- */
  const UI_TPL = {
    handPoint: {
      pal: { O: '#2e2216', W: '#fff8ee', w: '#e8d8c4', S: '#c9b8a4', C: '#5fa8e8', c: '#2f5f9e' },
      rows: [
        '..CCCCCCCC..', '..cCCCCCCc..', '.OWWWWWWWWO.', 'OWWWWWWWwSO',
        'OWWWWWWWwSO', 'OWWWWWWwwSO', '.OWWWWWwSO..', '..OOOWWSOO..',
        '....OWwO....', '....OWwO....', '....OWSO....', '.....OO.....',
      ],
    },
    handGrab: {
      pal: { O: '#2e2216', W: '#fff8ee', w: '#e8d8c4', S: '#c9b8a4', C: '#5fa8e8', c: '#2f5f9e' },
      rows: [
        '..CCCCCCCC..', '..cCCCCCCc..', '.OWWWWWWWWO.', 'OWWWWWWWwSO',
        'OWWwWWwWwSO', 'OWWWWWWWwSO', '.OWWWWWwSO..', '..OOOOOOO...',
      ],
    },
  };
  function uiSprite(kind, scale) {
    const key = 'ui_' + kind + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const t = UI_TPL[kind];
    const k = scale || 1;
    const c = newCanvas(t.rows[0].length * k, t.rows.length * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, t.rows, t.pal, 0, 0, k);
    cache.set(key, c);
    return c;
  }

  /* basket held by the hand — drawn procedurally with contents */
  function basketSprite(fill, scale) {
    const key = 'bskt_' + fill + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(14 * k, 11 * k);
    const ctx = c.getContext('2d');
    /* handle */
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(3 * k, 0, k, 3 * k); ctx.fillRect(10 * k, 0, k, 3 * k);
    ctx.fillRect(4 * k, 0, 6 * k, k);
    /* eggs inside (behind rim) */
    for (let i = 0; i < Math.min(fill, 5); i++) {
      ctx.fillStyle = '#fff8ee';
      ctx.fillRect((2 + i * 2) * k, 3 * k, 2 * k, 3 * k);
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect((2 + i * 2) * k, 5 * k, 2 * k, k);
    }
    /* woven body */
    const m = newMask(14, 11);
    for (let y = 4; y < 10; y++) {
      const inset = y > 7 ? y - 7 : 0;
      for (let x = 1 + inset; x < 13 - inset; x++) mSet(m, x, y, 1);
    }
    renderMask(ctx, m, k, 0, 0, { base: '#c9924f', light: '#e8b96f', dark: '#8a5e2a', out: '#4a3018' }, 3, {});
    /* weave lines */
    ctx.fillStyle = '#8a5e2a';
    for (let x = 2; x < 12; x += 2) ctx.fillRect(x * k, 6 * k, k, k);
    for (let x = 3; x < 11; x += 2) ctx.fillRect(x * k, 8 * k, k, k);
    /* rim */
    ctx.fillStyle = '#4a3018'; ctx.fillRect(0, 3 * k, 14 * k, k);
    ctx.fillStyle = '#e8b96f'; ctx.fillRect(k, 4 * k, 12 * k, k);
    cache.set(key, c);
    return c;
  }

  function feedbagSprite(scale) {
    const key = 'feedbag_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(12 * k, 13 * k);
    const ctx = c.getContext('2d');
    const m = newMask(12, 13);
    mRect(m, 2, 3, 8, 9);
    mRect(m, 4, 1, 4, 3);
    renderMask(ctx, m, k, 0, 0, { base: '#d9b98c', light: '#f2dcb8', dark: '#a8865e', out: '#5e4326' }, 4, { grain: 0.1 });
    /* tie */
    ctx.fillStyle = '#8a5e2a'; ctx.fillRect(3 * k, 3 * k, 6 * k, k);
    /* seeds spilling */
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(5 * k, 5 * k, k, k); ctx.fillRect(7 * k, 7 * k, k, k); ctx.fillRect(4 * k, 8 * k, k, k);
    cache.set(key, c);
    return c;
  }

  function hammerSprite(scale) {
    const key = 'hmr_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(12 * k, 13 * k);
    const ctx = c.getContext('2d');
    const head = newMask(12, 13);
    mRect(head, 1, 1, 10, 4);
    renderMask(ctx, head, k, 0, 0, { base: '#a8adb8', light: '#d8dde6', dark: '#6a6f7a', out: '#2e3238' }, 7, {});
    const handle = newMask(12, 13);
    mRect(handle, 5, 5, 3, 8);
    renderMask(ctx, handle, k, 0, 0, BARK, 8, {});
    cache.set(key, c);
    return c;
  }

  function plumeSprite(scale) {
    const key = 'plume_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(7 * k, 8 * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, [
      '.....ow', '....oww', '...owws', '..owwso', '.owwso.', 'owwso..', 'owso...', 'oo.....',
    ], { o: '#b5a583', w: '#fff8ee', s: '#e0d4bc' }, 0, 0, k);
    cache.set(key, c);
    return c;
  }


  /* ============================================================
     PROCEDURAL FARM FOLK
     look = { skin, hair, style, shirt, pants, boot, hat }
     Every hire on the ranch is a different person, built from
     that little record - no two crews look alike.
     ============================================================ */
  function personSprite(look, frame, scale) {
    const L = look || {};
    const hat = L.hat || 'straw', style = L.style || 'short';
    const key = 'per_' + [L.skin, L.hair, style, L.shirt, L.pants, L.boot, hat].join('|')
              + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const skin = L.skin || '#f2c9a0', hair = L.hair || '#5e3d18';
    const shirt = L.shirt || '#5fa8e8', pants = L.pants || '#6e4a20', boot = L.boot || '#3a2a16';
    const c = newCanvas(12 * k, 18 * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2e2216';

    /* ---- hair, behind the head ---- */
    const hd = darken(hair, 0.3), hl = lighten(hair, 0.3);
    if (style !== 'bald') {
      R(3, 3, 6, 4, hair);
      R(3, 3, 6, 1, hl);
      R(3, 6, 1, 2, hd); R(8, 6, 1, 2, hd);
    }
    if (style === 'long')  { R(2, 6, 1, 6, hair); R(9, 6, 1, 6, hair); R(2, 6, 1, 3, hl); }
    if (style === 'braid') { R(9, 6, 1, 7, hair); R(9, 12, 2, 1, hd); }
    if (style === 'bun')   { R(4, 1, 4, 2, hair); R(4, 1, 4, 1, hl); }
    if (style === 'tuft')  { R(5, 1, 2, 2, hair); R(5, 1, 1, 1, hl); }
    if (style === 'curl')  { R(2, 4, 1, 2, hair); R(9, 4, 1, 2, hair); R(4, 2, 4, 1, hair); }
    if (style === 'mohawk'){ R(5, 0, 2, 4, hair); R(5, 0, 1, 2, hl); }

    /* ---- head ---- */
    R(4, 5, 4, 4, skin);
    R(4, 5, 1, 4, darken(skin, 0.16));
    R(7, 5, 1, 4, lighten(skin, 0.12));
    ctx.fillStyle = OUT;
    ctx.fillRect(5 * k, 6 * k, k, k); ctx.fillRect(7 * k, 6 * k, k, k);
    ctx.fillStyle = '#e8917a'; ctx.fillRect(4 * k, 8 * k, k, k); ctx.fillRect(8 * k, 8 * k, k, k);

    /* ---- headwear ---- */
    if (hat === 'straw' || hat === 'wide') {
      const brim = hat === 'wide' ? 11 : 10, bx = hat === 'wide' ? 0 : 1;
      R(3, 0, 6, 1, OUT); R(3, 1, 6, 2, '#e0bd82');
      R(bx, 3, brim, 1, OUT); R(bx, 4, brim, 1, '#e0bd82');
      R(bx + 1, 4, brim - 2, 1, '#b89355');
      R(3, 1, 6, 1, '#f2dcb0');
      R(4, 2, 4, 1, '#c9a35f');
    } else if (hat === 'cap') {
      R(3, 1, 6, 1, OUT); R(3, 2, 6, 2, shirt);
      R(3, 2, 6, 1, lighten(shirt, 0.3));
      R(8, 4, 3, 1, darken(shirt, 0.25));
    } else if (hat === 'bandana') {
      R(3, 2, 6, 2, '#e8542f');
      R(3, 2, 6, 1, '#ff8f6a');
      R(2, 3, 1, 3, '#c93f22');
    } else if (hat === 'beanie') {
      R(3, 1, 6, 3, '#6a7ac9');
      R(3, 1, 6, 1, '#8f9ee0');
      R(3, 4, 6, 1, '#4a5a9e');
    }

    /* ---- body, arms, legs ---- */
    const sd = darken(shirt, 0.28), sl = lighten(shirt, 0.28);
    R(3, 9, 6, 5, OUT);
    R(3, 9, 6, 4, shirt);
    R(3, 12, 6, 1, sd);
    R(3, 9, 6, 1, sl);
    R(5, 10, 2, 1, sl);
    R(2, 10 + (frame ? 0 : 1), 1, 3, shirt);
    R(9, 10 + (frame ? 1 : 0), 1, 3, shirt);
    R(2, 13 + (frame ? 0 : 1), 1, 1, skin);
    R(9, 13 + (frame ? 1 : 0), 1, 1, skin);
    R(4, 14, 2, 2 + (frame ? 1 : 0), pants);
    R(7, 14, 2, 2 + (frame ? 0 : 1), pants);
    R(4, 14, 1, 2, lighten(pants, 0.2));
    R(3 + (frame ? 0 : 1), 16 + (frame ? 1 : 0), 3, 2, boot);
    R(7, 16 + (frame ? 0 : 1), 3, 2, boot);
    cache.set(key, c);
    return c;
  }

  /* a portrait bust for the crew cards - same look, twice the head */
  function faceSprite(look, scale) {
    const L = look || {};
    const key = 'face_' + [L.skin, L.hair, L.style, L.shirt, L.hat].join('|') + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(14 * k, 14 * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const body = personSprite(L, 0, 1);
    /* crop the head and shoulders, then scale up inside the tile */
    ctx.drawImage(body, 0, 0, 12, 14, k, 0, 12 * k, 14 * k);
    cache.set(key, c);
    return c;
  }

  /* a paper flyer - "HELP WANTED" pinned to the hut */
  function flyerSprite(scale) {
    const key = 'flyer_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(9 * k, 11 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    R(0, 0, 9, 11, '#2e2216');
    R(1, 1, 7, 9, '#fff8ec');
    R(1, 1, 7, 1, '#ffffff');
    R(2, 2, 5, 1, '#e8542f');
    R(2, 4, 5, 1, '#8a8070');
    R(2, 6, 4, 1, '#8a8070');
    R(2, 8, 5, 1, '#8a8070');
    R(4, 0, 1, 1, '#c93f22');
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     THE ROBOTS
     A fat little chassis that hovers on a puff of air: domed head,
     a wraparound visor with proper eyes, a round belly with a
     lit-up job badge, stubby arms holding the tool of the trade,
     and a hat. Three tones of shading on every curve so they read
     as round rather than flat.
     ============================================================ */
  function botSprite(role, frame, scale) {
    const key = 'bot3_' + role + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const B = BOTS[role] || BOTS.hand;
    /* 24 rows, not 21: the top five belong to the hat, so caps, straw
       brims, bows and antennae have somewhere to sit instead of being
       shaved off by the edge of the canvas */
    const c = newCanvas(18 * k, 24 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { if (!col) return; ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2a2018';
    const sh = B.shell;
    const lite = lighten(sh, 0.42), mid = sh, shade = darken(sh, 0.20), deep = darken(sh, 0.40);
    const bob = frame ? 0 : 1;
    const T = B.trim, V = B.visor;

    /* ---- hover puff, drawn under everything ---- */
    const puff = frame ? 0 : 1;
    R(5, 22 + bob - puff, 8, 1, 'rgba(150,215,255,.5)');
    R(3, 23 + bob - puff, 12, 1, 'rgba(150,215,255,.28)');
    R(6 + puff * 2, 21 + bob, 2, 1, 'rgba(200,240,255,.7)');
    R(10 - puff * 2, 21 + bob, 2, 1, 'rgba(200,240,255,.7)');

    /* ---- belly: a round barrel ---- */
    const by = 12 + bob;
    R(4, by - 1, 10, 1, OUT);
    R(3, by, 12, 1, OUT);
    R(2, by + 1, 14, 6, OUT);
    R(3, by + 7, 12, 1, OUT);
    R(4, by + 8, 10, 1, OUT);
    R(4, by, 8, 1, lite);
    R(3, by + 1, 12, 6, mid);
    R(4, by + 1, 5, 3, lite);            /* upper-left gloss */
    R(3, by + 5, 12, 2, shade);
    R(12, by + 1, 3, 6, shade);
    R(13, by + 2, 2, 4, deep);
    R(4, by + 7, 10, 1, deep);
    /* a seam round the middle */
    R(3, by + 4, 12, 1, darken(sh, 0.10));
    /* job badge, lit */
    R(6, by + 2, 6, 4, '#1d2229');
    R(7, by + 3, 4, 2, V);
    R(7, by + 3, 2, 1, lighten(V, 0.5));
    R(6, by + 2, 6, 1, deep);
    if (frame) R(11, by + 3, 1, 1, T);

    /* ---- arms, swinging, each holding something ---- */
    const la = frame ? 0 : 1, ra = frame ? 1 : 0;
    R(0, by + 1 + la, 3, 4, OUT);
    R(1, by + 1 + la, 2, 3, mid);
    R(1, by + 1 + la, 1, 1, lite);
    R(1, by + 4 + la, 2, 1, deep);
    R(15, by + 1 + ra, 3, 4, OUT);
    R(15, by + 1 + ra, 2, 3, mid);
    R(15, by + 1 + ra, 1, 1, lite);
    R(15, by + 4 + ra, 2, 1, deep);
    /* the tool of the trade in the right hand, big enough to read at 1x */
    const tx = 15, ty = by + 5 + ra;
    if (role === 'hand') {                                   /* an egg */
      R(tx + 1, ty, 1, 1, '#fff8ee');
      R(tx, ty + 1, 3, 2, '#fff8ee');
      R(tx + 2, ty + 1, 1, 2, '#e2d3b6');
      R(tx, ty + 3, 2, 1, '#fff8ee');
      R(tx + 2, ty + 3, 1, 1, '#e2d3b6');
    } else if (role === 'packer') {                          /* a crate */
      R(tx, ty, 3, 4, '#8a5a2c');
      R(tx, ty + 1, 3, 1, '#c9924f');
      R(tx + 1, ty, 1, 4, '#a8703a');
    } else if (role === 'feeder') {                          /* a scoop of grain */
      R(tx, ty, 3, 2, '#e8c458');
      R(tx, ty, 2, 1, '#fff0b0');
      R(tx + 1, ty + 2, 2, 1, '#c9a03c');
      R(tx + 2, ty + 3, 1, 1, '#e8c458');
    } else if (role === 'tech') {                            /* a brass spanner */
      R(tx + 1, ty, 1, 4, '#4a4038');
      R(tx + 1, ty + 2, 1, 1, '#7a6a58');
      R(tx, ty - 1, 3, 1, '#ffd23f');
      R(tx, ty, 1, 1, '#ffd23f'); R(tx + 2, ty, 1, 1, '#e8a92f');
      R(tx, ty - 1, 1, 1, '#fff0b0');
    } else if (role === 'keeper' || role === 'match') {      /* a heart */
      R(tx, ty, 1, 1, '#ff8ab5'); R(tx + 2, ty, 1, 1, '#ff8ab5');
      R(tx, ty + 1, 3, 1, '#ff8ab5');
      R(tx + 1, ty + 2, 1, 1, '#ff8ab5');
      R(tx, ty, 1, 1, '#ffc2d8');
    } else if (role === 'cull') {                            /* a red-tipped baton */
      R(tx + 1, ty - 1, 1, 4, '#8a9099');
      R(tx + 1, ty - 1, 1, 1, '#c9ced6');
      R(tx, ty + 3, 3, 1, '#e8542f');
      R(tx, ty + 3, 1, 1, '#ff8f5f');
    }

    /* ---- head: a wide dome ---- */
    const hy = 5 + bob;
    R(5, hy - 1, 8, 1, OUT);
    R(4, hy, 10, 1, OUT);
    R(3, hy + 1, 12, 6, OUT);
    R(4, hy + 7, 10, 1, OUT);
    R(5, hy, 8, 1, lite);
    R(4, hy + 1, 10, 6, mid);
    R(5, hy + 1, 5, 2, lite);
    R(4, hy + 6, 10, 1, shade);
    R(12, hy + 1, 2, 6, shade);
    /* ears / bolts */
    R(2, hy + 3, 2, 3, OUT); R(2, hy + 3, 1, 2, shade);
    R(14, hy + 3, 2, 3, OUT); R(14, hy + 3, 1, 2, shade);
    /* a little collar, so the head reads apart from the belly */
    R(4, hy + 8, 10, 1, darken(T, 0.25));
    R(5, hy + 8, 8, 1, T);
    R(6, hy + 8, 5, 1, lighten(T, 0.35));

    /* ---- visor: wraps round the face ---- */
    R(4, hy + 2, 10, 4, '#161b21');
    R(4, hy + 2, 10, 1, '#242b34');
    /* eyes, per personality */
    const eyeL = 5, eyeR = 10, ey = hy + 3;
    const blink = frame && (role === 'keeper' || role === 'feeder');
    const eye = (x, kind) => {
      if (kind === 'shut') { R(x, ey + 1, 3, 1, V); return; }
      if (kind === 'wide') { R(x, ey - 1, 3, 3, V); R(x, ey - 1, 1, 1, '#ffffff'); return; }
      if (kind === 'cross') { R(x, ey, 1, 1, V); R(x + 2, ey, 1, 1, V); R(x + 1, ey + 1, 1, 1, V); R(x, ey + 2, 1, 1, V); R(x + 2, ey + 2, 1, 1, V); return; }
      if (kind === 'heart') { R(x, ey, 1, 1, V); R(x + 2, ey, 1, 1, V); R(x, ey + 1, 3, 1, V); R(x + 1, ey + 2, 1, 1, V); return; }
      R(x, ey, 3, 2, V); R(x, ey, 1, 1, '#ffffff');
    };
    if (blink) { eye(eyeL, 'shut'); eye(eyeR, 'shut'); }
    else if (B.face === 'wink') { eye(eyeL, 'wide'); eye(eyeR, 'shut'); }
    else if (B.face === 'stern') { eye(eyeL, 'cross'); eye(eyeR, 'cross'); }
    else if (B.face === 'love') { eye(eyeL, 'heart'); eye(eyeR, 'heart'); }
    else if (B.face === 'grin') { eye(eyeL, 'wide'); eye(eyeR, 'wide'); }
    else { eye(eyeL, ''); eye(eyeR, ''); }
    /* a sweep of reflection across the glass */
    R(4, hy + 2, 2, 1, 'rgba(255,255,255,.30)');
    R(6, hy + 2, 1, 1, 'rgba(255,255,255,.16)');
    /* mouth speaker grille and cheeks */
    if (B.face !== 'stern') { R(7, hy + 6, 4, 1, deep); R(8, hy + 7, 2, 1, deep); }
    else { R(7, hy + 6, 4, 1, deep); }
    R(3, hy + 5, 1, 1, '#ff9fb0'); R(14, hy + 5, 1, 1, '#ff9fb0');

    /* ---- hats ---- */
    if (B.hat === 'cap') {
      R(4, hy - 2, 10, 1, OUT); R(4, hy - 1, 10, 1, T);
      R(5, hy - 3, 8, 1, OUT); R(5, hy - 2, 8, 1, lighten(T, 0.3));
      R(14, hy - 1, 4, 1, darken(T, 0.2)); R(14, hy, 3, 1, OUT);
    } else if (B.hat === 'straw') {
      R(6, hy - 3, 6, 1, '#f2dcb0'); R(5, hy - 2, 8, 1, '#e0bd82');
      R(1, hy - 1, 16, 1, '#e0bd82'); R(2, hy, 14, 1, '#c9a35f');
      R(6, hy - 2, 3, 1, '#fff3d6');
    } else if (B.hat === 'bow') {
      R(3, hy - 3, 3, 3, T); R(12, hy - 3, 3, 3, T);
      R(3, hy - 3, 3, 1, lighten(T, 0.35)); R(12, hy - 3, 3, 1, lighten(T, 0.35));
      R(6, hy - 2, 6, 2, darken(T, 0.22)); R(8, hy - 3, 2, 1, darken(T, 0.3));
    } else if (B.hat === 'bolt') {
      R(8, hy - 3, 2, 3, '#8a9099'); R(8, hy - 3, 1, 3, '#c9ced6');
      R(6, hy - 5, 6, 2, frame ? '#ffd23f' : '#5fe8ff');
      R(7, hy - 6, 4, 1, frame ? '#fff3b0' : '#c2f6ff');
      R(5, hy - 5, 1, 1, frame ? '#ffd23f' : '#5fe8ff');
      R(12, hy - 5, 1, 1, frame ? '#ffd23f' : '#5fe8ff');
    } else {
      R(8, hy - 4, 2, 4, '#8a9099'); R(8, hy - 4, 1, 4, '#c9ced6');
      R(7, hy - 6, 4, 2, OUT);
      R(8, hy - 5, 2, 1, frame ? T : V);
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     CLOUD SPEECH BUBBLES
     A comic-book cloud, built as a pixel mask rather than a CSS
     rounded rectangle: a solid core with a ring of overlapping
     lobes round the edge, a tail of three shrinking blobs, then an
     outline pass over whatever that union came out as. Sized to the
     element that will wear it as a background.
     ============================================================ */
  function cloudBubble(wPx, hPx, tailAt, below, opts) {
    const o = opts || {};
    const k = o.px || 3;                       /* size of one fat pixel */
    const key = 'cloud_' + [wPx, hPx, tailAt, !!below, k, o.fill, o.ink].join('|');
    if (cache.has(key)) return cache.get(key);

    const gw = Math.max(12, Math.round(wPx / k));
    const gh = Math.max(10, Math.round(hPx / k));
    const TAIL = 5;                            /* rows the tail occupies */
    const mask = new Uint8Array(gw * gh);
    const set = (x, y) => { if (x >= 0 && x < gw && y >= 0 && y < gh) mask[y * gw + x] = 1; };
    const at = (x, y) => (x < 0 || x >= gw || y < 0 || y >= gh) ? 0 : mask[y * gw + x];
    const disc = (cx, cy, r) => {
      const rr = r * r;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy <= rr) set(x, y);
        }
    };
    /* deterministic wobble, so the same bubble is always the same shape */
    const wob = i => { const n = Math.sin(i * 12.9898 + gw * 4.1414 + gh * 7.233) * 43758.5453; return n - Math.floor(n); };

    const bodyY0 = below ? TAIL : 0;
    const bodyY1 = below ? gh - 1 : gh - 1 - TAIL;
    const inset = 6;
    const x0 = inset, x1 = gw - 1 - inset;
    const y0 = bodyY0 + inset, y1 = bodyY1 - inset;

    /* the solid middle */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y);

    /* lobes walked round the inset rectangle */
    const wSide = Math.max(1, x1 - x0), hSide = Math.max(1, y1 - y0);
    const per = 2 * (wSide + hSide);
    const n = Math.max(9, Math.round(per / 9));
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per, px, py;
      if (d < wSide) { px = x0 + d; py = y0; }
      else if (d < wSide + hSide) { px = x1; py = y0 + (d - wSide); }
      else if (d < 2 * wSide + hSide) { px = x1 - (d - wSide - hSide); py = y1; }
      else { px = x0; py = y1 - (d - 2 * wSide - hSide); }
      disc(px, py, 4.4 + wob(i) * 2.6);
    }

    /* the tail: three blobs marching out from the body towards the thing
       the bubble is about */
    const tx = Math.max(4, Math.min(gw - 5, Math.round((tailAt == null ? wPx / 2 : tailAt) / k)));
    const dir = below ? -1 : 1;
    const start = below ? bodyY0 + 1 : bodyY1 - 1;
    disc(tx, start + dir * 1, 2.9);
    disc(tx + dir, start + dir * 3, 1.9);
    disc(tx + dir * 2, start + dir * 4, 1.1);

    /* ---- paint it ---- */
    const c = newCanvas(gw * k, gh * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const FILL = o.fill || '#fff9ec';
    const INK = o.ink || '#2e2216';
    const LIT = lighten(FILL, 0.5);
    const SHD = darken(FILL, 0.10);
    const SHADOW = 'rgba(46,34,22,.22)';
    const box = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, k, k); };

    /* a soft shadow one fat pixel down-right */
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++)
      if (at(x - 1, y - 1) && !at(x, y)) box(x, y, SHADOW);

    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (edge) { box(x, y, INK); continue; }
      /* a lit rim just inside the top-left, shade inside the bottom */
      if (!at(x, y - 2) || !at(x - 2, y)) box(x, y, LIT);
      else if (!at(x, y + 2)) box(x, y, SHD);
      else box(x, y, FILL);
    }
    cache.set(key, c);
    return c;
  }

  /* w is a crew record: robots by their chassis, people by their look */
  function staffSprite(w, frame, scale) {
    if (typeof w === 'string') return (w === 'cull' || w === 'match') ? botSprite(w, frame, scale) : personSprite(null, frame, scale);
    if (w && (w.bot || w.role === 'cull' || w.role === 'match')) return botSprite(w.role, frame, scale);
    return personSprite(w && w.look, frame, scale);
  }

  /* wooden sign board — text drawn by the caller */
  /* board is `bh` tall (12 by default: one line of the big font) with
     posts under it, so a two-line sign asks for a taller board */
  function signSprite(w, scale, style, bh) {
    const bd = bh || 12;
    const key = 'sign_' + w + '_' + scale + '_' + (style || 0) + '_' + bd;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const h = bd + 8;
    const c = newCanvas(w * k, h * k);
    const ctx = c.getContext('2d');
    /* posts */
    ctx.fillStyle = '#6e4a20';
    ctx.fillRect(Math.floor(w * 0.28) * k, (bd - 2) * k, 2 * k, 10 * k);
    ctx.fillRect(Math.floor(w * 0.68) * k, (bd - 2) * k, 2 * k, 10 * k);
    /* board */
    const m = newMask(w, h);
    mRect(m, 0, 0, w, bd);
    renderMask(ctx, m, k, 0, 0,
      { base: '#c9a35f', light: '#e8c48f', dark: '#a8783f', out: '#5e3d18' }, 11, { grain: 0.14 });
    /* plank seam + nails */
    ctx.fillStyle = '#a8783f';
    ctx.fillRect(k, Math.floor(bd / 2) * k, (w - 2) * k, k);
    ctx.fillStyle = '#5e3d18';
    ctx.fillRect(2 * k, 2 * k, k, k); ctx.fillRect((w - 3) * k, 2 * k, k, k);
    ctx.fillRect(2 * k, (bd - 3) * k, k, k); ctx.fillRect((w - 3) * k, (bd - 3) * k, k, k);
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     EGGOS TERMINAL - the Lab computer. Blocky CRT chrome drawn
     the same way as everything else: one pixel at a time.
     ============================================================ */
  const TERM = {
    bg:'#0d1a12', bg2:'#12241a', grid:'#183324', dim:'#2f6a48',
    text:'#7ef2a8', hot:'#d8ffe8', warn:'#ffd23f', bad:'#e8607a',
    frame:'#2a3a30', frameLit:'#4a6a56', shell:'#c9a35f', shellDark:'#8a5e2a',
  };

  /* the screen bezel: a chunky plastic case around a dark panel */
  function drawBezel(ctx, x, y, w, h) {
    ctx.fillStyle = '#3a2a16'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = TERM.shell; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = lighten(TERM.shell, 0.24); ctx.fillRect(x + 1, y + 1, w - 2, 2);
    ctx.fillStyle = TERM.shellDark; ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    /* inner well */
    ctx.fillStyle = '#1d1508'; ctx.fillRect(x + 5, y + 5, w - 10, h - 14);
    ctx.fillStyle = TERM.bg; ctx.fillRect(x + 6, y + 6, w - 12, h - 16);
    /* corner screws */
    [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 6], [x + w - 5, y + h - 6]].forEach(([sx, sy]) => {
      ctx.fillStyle = TERM.shellDark; ctx.fillRect(sx, sy, 2, 2);
      ctx.fillStyle = lighten(TERM.shell, 0.4); ctx.fillRect(sx, sy, 1, 1);
    });
  }

  /* phosphor scanlines plus a soft vignette, stamped over the panel */
  function drawScanlines(ctx, x, y, w, h, t) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    for (let sy = y; sy < y + h; sy += 2) ctx.fillRect(x, sy, w, 1);
    /* a single bright band rolling down the tube */
    const band = y + Math.floor(((t || 0) / 26) % (h + 40)) - 20;
    if (band > y && band < y + h) {
      ctx.fillStyle = 'rgba(126,242,168,.07)';
      ctx.fillRect(x, band, w, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
  }

  /* a bracketed row: [ ==== ] used for level pips and progress */
  function drawPips(ctx, x, y, n, of, colOn, colOff) {
    for (let i = 0; i < of; i++) {
      ctx.fillStyle = i < n ? colOn : colOff;
      ctx.fillRect(x + i * 3, y, 2, 4);
      if (i < n) { ctx.fillStyle = lighten(colOn, 0.4); ctx.fillRect(x + i * 3, y, 2, 1); }
    }
    return of * 3 - 1;
  }

  /* a hard-edged panel box with a lit top-left rim */
  function drawBox(ctx, x, y, w, h, fill, rim, out) {
    ctx.fillStyle = out || TERM.frame; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (rim) { ctx.fillStyle = rim; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2); }
  }


  /* ============================================================
     FARMING - tilled soil and five crops in three or four stages
     ============================================================ */
  function soilSprite(seed, watered, scale) {
    const key = 'soil_' + seed + '_' + (watered ? 'w' : 'd') + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(16 * k, 16 * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(900 + seed);
    const base = watered ? '#6b4a2a' : '#a07444', dark = watered ? '#523620' : '#8a5e2a', lite = watered ? '#7f5c36' : '#b58a4f';
    ctx.fillStyle = base; ctx.fillRect(0, 0, 16 * k, 16 * k);
    /* furrows */
    for (let y = 2; y < 16; y += 4) {
      ctx.fillStyle = dark; ctx.fillRect(0, y * k, 16 * k, k);
      ctx.fillStyle = lite; ctx.fillRect(0, (y + 2) * k, 16 * k, k);
    }
    /* clods */
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16);
      ctx.fillStyle = rnd() < 0.5 ? dark : lite;
      ctx.fillRect(x * k, y * k, k, k);
    }
    /* a soft edge so tiles read as one bed */
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, 0, 16 * k, k); ctx.fillRect(0, 0, k, 16 * k);
    if (watered) {
      ctx.fillStyle = 'rgba(120,180,255,.18)';
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.floor(rnd() * 15) * k, Math.floor(rnd() * 15) * k, 2 * k, k);
    }
    cache.set(key, c);
    return c;
  }

  function cropSprite(kind, stage, seed, scale) {
    const def = CROPS[kind] || CROPS.wheat;
    const key = 'crop_' + kind + '_' + stage + '_' + (seed % 7) + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(16 * k, 20 * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(500 + seed);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, (y + 4) * k, w * k, h * k); };
    const green = '#5aa845', gd = '#3f8a33', gl = '#8fd14f';
    const ripe = stage >= def.stages - 1;
    if (stage === 0) {
      /* sprouts */
      [3, 8, 12].forEach((x, i) => { R(x, 13 - (i % 2), 1, 3, green); R(x - 1, 12 - (i % 2), 3, 1, gl); });
    } else if (kind === 'wheat') {
      const h = stage === 1 ? 6 : stage === 2 ? 9 : 11;
      for (let i = 0; i < 5; i++) {
        const x = 2 + i * 3 + Math.floor(rnd() * 1.5);
        R(x, 16 - h, 1, h, ripe ? '#b8a040' : green);
        if (ripe) { R(x - 1, 16 - h - 3, 3, 4, def.col); R(x, 16 - h - 4, 1, 1, def.col); R(x - 1, 16 - h - 2, 1, 1, '#c99a1f'); }
        else if (stage === 2) R(x - 1, 16 - h, 3, 1, gl);
      }
    } else if (kind === 'corn') {
      const h = stage === 1 ? 6 : stage === 2 ? 11 : 15;
      [4, 11].forEach((x, i) => {
        R(x, 16 - h, 2, h, gd);
        R(x, 16 - h, 1, h, green);
        for (let l = 0; l < Math.floor(h / 3); l++) {
          const ly = 15 - l * 3;
          R(x - 3 + (l % 2) * 5, ly, 3, 1, green);
          R(x - 3 + (l % 2) * 5, ly - 1, 1, 1, gl);
        }
        if (ripe) { R(x + 2, 16 - h + 4, 2, 5, def.col); R(x + 2, 16 - h + 4, 1, 5, '#e0b830'); R(x + 2, 16 - h + 2, 2, 2, gl); }
      });
    } else if (kind === 'sunseed') {
      const h = stage === 1 ? 6 : stage === 2 ? 11 : 15;
      [5, 11].forEach((x, i) => {
        R(x, 16 - h, 1, h, gd);
        R(x - 2, 14, 2, 1, green); R(x + 1, 12, 2, 1, green);
        if (ripe) {
          R(x - 3, 16 - h - 3, 7, 7, def.col);
          R(x - 3, 16 - h - 3, 1, 1, '#0000'); 
          R(x - 2, 16 - h - 2, 5, 5, '#5e3d18');
          R(x - 1, 16 - h - 1, 3, 3, '#3a2a16');
          R(x - 2, 16 - h - 3, 5, 1, '#ffd23f'); R(x - 3, 16 - h - 2, 1, 5, '#ffd23f');
        } else if (stage === 2) R(x - 1, 16 - h - 1, 3, 2, '#7fbf4f');
      });
    } else if (kind === 'berry') {
      const w = stage === 1 ? 6 : stage === 2 ? 10 : 12, h = stage === 1 ? 5 : stage === 2 ? 8 : 10;
      const x0 = 8 - w / 2;
      R(x0 + 1, 16 - h, w - 2, h, gd);
      R(x0, 16 - h + 1, w, h - 2, gd);
      R(x0 + 1, 16 - h, w - 2, 2, green);
      R(x0 + 2, 16 - h, 3, 1, gl);
      if (ripe) for (let i = 0; i < 6; i++) {
        const bx = x0 + 1 + Math.floor(rnd() * (w - 2)), by = 16 - h + 1 + Math.floor(rnd() * (h - 2));
        R(bx, by, 1, 1, def.col); R(bx, by, 1, 1, i % 2 ? def.col : '#ff7a9a');
      }
    } else if (kind === 'strawberry') {
      /* a low leafy mound with the fruit hanging off its edges */
      const w = stage === 1 ? 6 : 10, h = stage === 1 ? 4 : 6;
      const x0 = 8 - w / 2;
      R(x0, 16 - h, w, h, gd); R(x0 + 1, 16 - h, w - 2, 2, green); R(x0 + 2, 16 - h, 2, 1, gl);
      if (stage === 2) { R(x0 + 2, 15 - h, 1, 1, '#fff8ec'); R(x0 + w - 3, 16 - h, 1, 1, '#fff8ec'); }
      if (ripe) for (let i = 0; i < 4; i++) {
        const bx = x0 + 1 + Math.floor(rnd() * (w - 3)), by = 12 + Math.floor(rnd() * 3);
        R(bx, by, 2, 2, def.col); R(bx, by, 1, 1, '#ff7a9a'); R(bx, by - 1, 1, 1, green);
      }
    } else if (kind === 'chili') {
      const h = stage === 1 ? 6 : stage === 2 ? 9 : 11;
      [4, 9, 12].forEach((x, i) => {
        R(x, 16 - h, 1, h, gd);
        R(x - 1, 16 - h + 2, 3, 1, green); R(x - 1, 16 - h + 5, 1, 1, gl); R(x + 1, 16 - h + 5, 1, 1, green);
        if (ripe) { R(x + 1, 16 - h + 3, 1, 4, def.col); R(x + 1, 16 - h + 2, 1, 1, gd); R(x - 2, 16 - h + 6, 1, 3, '#c9301f'); }
        else if (stage === 2) R(x + 1, 16 - h + 3, 1, 3, '#7fbf4f');
      });
    } else if (kind === 'pumpkin') {
      /* a vine along the ground, then the fruit swelling on it */
      R(2, 14, 12, 1, gd); R(3, 13, 2, 1, green); R(8, 13, 2, 1, green); R(12, 13, 2, 1, gl);
      if (stage >= 2) {
        const pw = ripe ? 9 : 5, ph = ripe ? 7 : 4, px0 = 8 - Math.floor(pw / 2), py0 = 15 - ph;
        const skin = ripe ? def.col : '#8fbf4f';
        R(px0, py0, pw, ph, skin);
        R(px0 + 1, py0 - 1, pw - 2, 1, skin);
        R(px0, py0 + ph - 1, pw, 1, ripe ? '#c9741a' : '#5aa845');
        for (let sx = px0 + 2; sx < px0 + pw - 1; sx += 3) R(sx, py0, 1, ph, ripe ? '#e08a1a' : '#6fae4a');
        R(px0 + Math.floor(pw / 2), py0 - 2, 1, 2, gd);
        R(px0 + 1, py0, 2, 1, ripe ? '#ffd28a' : '#b8e28a');
      }
    } else if (kind === 'carrot') {
      /* feathery tops, and the orange shoulder showing once it is ripe */
      const h = stage === 1 ? 4 : stage === 2 ? 7 : 8;
      [3, 7, 11].forEach((x, i) => {
        R(x, 16 - h, 1, h, green); R(x - 1, 16 - h + 1, 1, 2, gl); R(x + 1, 16 - h + 2, 1, 2, green); R(x, 16 - h - 1, 1, 1, gl);
        if (ripe) { R(x - 1, 15, 3, 2, def.col); R(x, 16, 1, 1, '#c96a1f'); }
      });
    } else if (kind === 'potato') {
      const w = stage === 1 ? 6 : 10, h = stage === 1 ? 4 : 6;
      const x0 = 8 - w / 2;
      R(x0, 16 - h, w, h, gd); R(x0 + 1, 16 - h, w - 2, 2, green); R(x0 + 2, 16 - h, 2, 1, gl);
      if (stage >= 2) { R(x0 + 2, 15 - h, 1, 1, '#f2e2c8'); R(x0 + w - 3, 15 - h, 1, 1, '#f2e2c8'); }
      if (ripe) for (let i = 0; i < 3; i++) { const bx = x0 + 1 + i * 3; R(bx, 15, 2, 2, def.col); R(bx, 15, 1, 1, '#e8c98a'); }
    } else if (kind === 'tomato') {
      /* a staked vine with fruit hanging in pairs */
      const h = stage === 1 ? 6 : stage === 2 ? 10 : 13;
      R(8, 16 - h, 1, h, '#8a5e2a'); R(7, 16 - h + 1, 1, h - 1, green);
      for (let l = 0; l < Math.floor(h / 3); l++) { const ly = 14 - l * 3; R(4 + (l % 2) * 4, ly, 3, 1, green); R(4 + (l % 2) * 4, ly - 1, 1, 1, gl); }
      if (ripe) for (let i = 0; i < 3; i++) { const ty = 14 - i * 4, tx = i % 2 ? 4 : 10; R(tx, ty, 2, 2, def.col); R(tx, ty, 1, 1, '#ff8a7a'); R(tx, ty - 1, 1, 1, gd); }
      else if (stage === 2) { R(4, 12, 2, 2, '#8fd14f'); R(10, 9, 2, 2, '#8fd14f'); }
    } else if (kind === 'cabbage') {
      const w = stage === 1 ? 5 : stage === 2 ? 8 : 11, h = stage === 1 ? 3 : stage === 2 ? 6 : 8;
      const x0 = 8 - Math.floor(w / 2);
      R(x0, 16 - h, w, h, gd); R(x0 + 1, 15 - h, w - 2, 1, gd);
      R(x0 + 1, 16 - h + 1, w - 2, h - 2, ripe ? def.col : green);
      R(x0 + 2, 16 - h + 1, w - 4, 1, gl); R(x0 + 1, 16 - h + 2, 1, h - 4, gl);
      if (ripe) { R(x0 + Math.floor(w / 2) - 1, 16 - h + 2, 3, h - 4, '#c8f0a0'); R(x0 + Math.floor(w / 2), 16 - h + 3, 1, 1, '#fff8ec'); }
    } else if (kind === 'melon') {
      /* a vine, then a striped green fruit swelling on it */
      R(2, 14, 12, 1, gd); R(4, 13, 2, 1, green); R(9, 13, 3, 1, gl);
      if (stage >= 2) {
        const pw = ripe ? 10 : 6, ph = ripe ? 7 : 4, px0 = 8 - Math.floor(pw / 2), py0 = 15 - ph;
        R(px0, py0, pw, ph, def.col); R(px0 + 1, py0 - 1, pw - 2, 1, def.col); R(px0, py0 + ph - 1, pw, 1, '#2f7a3a');
        for (let sx = px0 + 1; sx < px0 + pw; sx += 3) R(sx, py0, 1, ph, '#8fd14f');
        R(px0 + 2, py0, 2, 1, '#c8f0a0');
        if (ripe) { R(px0 + pw - 2, py0 + 1, 1, 1, '#ff6b7a'); }
      }
    } else if (kind === 'rice') {
      /* a paddy: standing water under drooping stalks */
      R(1, 14, 14, 2, '#5fa8e8'); R(2, 14, 4, 1, '#9fd6ff'); R(9, 15, 3, 1, '#9fd6ff');
      const h = stage === 1 ? 5 : stage === 2 ? 8 : 10;
      for (let i = 0; i < 6; i++) {
        const x = 2 + i * 2 + (i % 2);
        R(x, 15 - h, 1, h, ripe ? '#c9c07a' : green);
        if (ripe) { R(x + (i % 2 ? -1 : 1), 15 - h - 1, 1, 3, def.col); R(x, 15 - h - 1, 1, 1, '#fff8ec'); }
        else if (stage === 2) R(x, 15 - h - 1, 1, 1, gl);
      }
    } else {
      /* clover */
      const n = stage === 1 ? 3 : 6;
      for (let i = 0; i < n; i++) {
        const x = 2 + Math.floor(rnd() * 12), y = 11 + Math.floor(rnd() * 4);
        R(x, y, 1, 1, green); R(x - 1, y - 1, 3, 1, green); R(x, y - 2, 1, 1, gl);
        if (ripe && i % 2) R(x, y - 3, 1, 1, '#fff8ec');
      }
    }
    cache.set(key, c);
    return c;
  }

  /* a baby version of any species: round, small, all fluff */
  /* A day-old chick, in the same side profile as the grown birds: a
     round downy body, a head that is far too big for it, a wing that is
     still only a stub, and two thin shanks. 14x13. */
  const CHICK_ROWS = [
    '..............',
    '.......OOOO...',
    '.....OOBBBBO..',
    '..OOOOBLLBEO..',
    '.OBBBBBLLBBKK.',
    'OBBBBBBBLLBKO.',
    'OBBWwBBBBBBO..',
    'OBBWwBBBBBO...',
    '.OBWwBBBBO....',
    '.OBBDDDDO.....',
    '..OODDOO......',
    '....F.F.......',
    '...FFF.FFF....',
  ];
  function chickSprite(sp, scale) {
    const key = 'chick2_' + sp.id + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(14 * k, 13 * k);
    const ctx = c.getContext('2d');
    /* a chick is downier and paler than the bird it grows into */
    const down = lighten(sp.body, 0.28);
    const pal = {
      O: lum(down) < 0.22 ? '#14141c' : darken(down, 0.50),
      B: down, L: lighten(down, 0.32), D: darken(down, 0.24),
      W: darken(down, 0.10), w: darken(down, 0.28),
      K: '#f0a422', F: '#e8a53f', E: '#14100c',
    };
    drawGrid(ctx, CHICK_ROWS, pal, 0, 0, k);
    shadeBody(ctx, CHICK_ROWS, 0, 0, k, down);
    /* a catchlight, and the first hint of a comb coming through */
    px(ctx, 10, 2, k, lighten(down, 0.55));
    px(ctx, 8, 1, k, darken('#cf3226', 0.25));
    px(ctx, 9, 1, k, darken('#cf3226', 0.15));
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     VEHICLES - from a bicycle to a private railcar
     ============================================================ */
  function vehicleSprite(id, frame, scale, paint) {
    const P = paint && paint.col ? paint.col : null;
    const DEC = paint && paint.decal && paint.decal !== 'none' ? paint.decal : null;
    const key = 'veh_' + id + '_' + frame + '_' + scale + '_' + (P || '') + '_' + (DEC || '');
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const dims = { bike: [26, 20], cart: [38, 22], van: [46, 26], truck: [60, 30], lorry: [78, 32], train: [92, 34] }[id] || [60, 30];
    const c = newCanvas(dims[0] * k, dims[1] * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2e2216';
    const BODY = P || null, LIT = P ? lighten(P, 0.38) : null, DRK = P ? darken(P, 0.32) : null;
    const wheel = (x, y, r) => {
      R(x - r, y - r + 1, r * 2 + 1, r * 2 - 1, OUT); R(x - r + 1, y - r, r * 2 - 1, r * 2 + 1, OUT);
      R(x - r + 1, y - r + 1, r * 2 - 1, r * 2 - 1, '#3a3a4a');
      R(x - 1, y - 1, 3, 3, '#c9ced6');
      const sp = frame ? 1 : 0;
      R(x - r + 1 + sp, y, r * 2 - 1 - sp, 1, '#8a9099');
    };
    const spokeWheel = (x, y, r) => {
      for (let a = 0; a < 16; a++) {
        const px2 = Math.round(x + Math.cos(a / 16 * Math.PI * 2) * r), py2 = Math.round(y + Math.sin(a / 16 * Math.PI * 2) * r);
        R(px2, py2, 1, 1, OUT);
      }
      R(x, y, 1, 1, OUT);
      const s2 = frame ? 1 : 0;
      R(x - r + 1, y + s2, r * 2 - 1, 1, '#8a9099'); R(x + s2, y - r + 1, 1, r * 2 - 1, '#8a9099');
    };
    if (id === 'bike') {
      spokeWheel(5, 14, 5); spokeWheel(20, 14, 5);
      /* frame */
      R(5, 14, 1, 1, OUT); R(6, 9, 8, 1, OUT); R(9, 9, 1, 5, OUT); R(13, 8, 1, 6, OUT); R(5, 13, 5, 1, OUT);
      R(6, 8, 8, 1, BODY || '#e8542f'); R(9, 10, 1, 4, BODY || '#e8542f'); R(5, 12, 5, 1, BODY || '#e8542f');
      /* saddle, bars, basket of eggs */
      R(8, 7, 3, 1, OUT); R(13, 6, 3, 1, OUT); R(15, 5, 1, 2, OUT);
      R(17, 3, 8, 5, OUT); R(18, 4, 6, 3, '#c9924f'); R(18, 4, 6, 1, '#e0bd82');
      R(19, 2, 2, 2, '#fff8ee'); R(22, 2, 2, 2, '#dcf2c8');
    } else if (id === 'cart') {
      spokeWheel(5, 16, 5); spokeWheel(17, 16, 4);
      R(5, 16, 1, 1, OUT); R(6, 11, 6, 1, OUT); R(8, 11, 1, 5, OUT); R(5, 15, 4, 1, OUT);
      R(6, 10, 6, 1, BODY || '#e8542f'); R(8, 12, 1, 4, BODY || '#e8542f');
      R(7, 9, 3, 1, OUT); R(11, 8, 3, 1, OUT);
      /* trailer crate */
      R(21, 8, 16, 10, OUT); R(22, 9, 14, 8, '#c9924f'); R(22, 9, 14, 1, '#e0bd82');
      R(25, 9, 1, 8, '#8a5e2a'); R(31, 9, 1, 8, '#8a5e2a');
      R(23, 6, 3, 3, '#fff8ee'); R(27, 6, 3, 3, '#dcf2c8'); R(31, 6, 3, 3, '#cfe9fb');
      R(14, 12, 8, 1, OUT);
      wheel(30, 18, 3);
    } else if (id === 'van') {
      /* body */
      R(1, 8, 44, 14, OUT); R(2, 9, 42, 12, BODY || '#7fc4e8'); R(2, 9, 42, 2, LIT || '#b5e0f5'); R(2, 19, 42, 2, DRK || '#4a86a8');
      /* cab window */
      R(33, 10, 9, 6, OUT); R(34, 11, 7, 4, '#d8f2fa'); R(34, 11, 3, 1, '#ffffff');
      R(2, 11, 28, 6, '#fff8ee'); R(3, 12, 26, 4, '#5fa8e8');
      /* egg logo */
      R(12, 12, 4, 4, '#fff8ee'); R(13, 11, 2, 1, '#fff8ee'); R(13, 16, 2, 1, '#fff8ee');
      R(38, 16, 6, 3, '#ffd23f');
      wheel(9, 22, 3); wheel(36, 22, 3);
    } else if (id === 'truck') {
      /* cargo bed (wood planks) */
      R(0, 4, 34, 21, OUT);
      for (let i = 0; i < 5; i++) R(1, 5 + i * 4, 32, 4, i % 2 ? '#c9924f' : '#b8843f');
      R(1, 5, 32, 1, '#e0bd82'); R(1, 23, 32, 2, '#7a5230');
      for (let i = 0; i < 4; i++) R(3 + i * 9, 5, 1, 20, '#8a5e2a');
      /* cab */
      R(34, 9, 24, 16, OUT); R(35, 10, 22, 14, BODY || '#3f6fd6'); R(35, 10, 22, 2, LIT || '#6f9af0'); R(35, 22, 22, 2, DRK || '#2a4a9e');
      R(37, 11, 12, 7, OUT); R(38, 12, 10, 5, '#d8f2fa'); R(38, 12, 4, 1, '#ffffff');
      R(55, 19, 3, 3, '#ffd23f'); R(52, 16, 4, 1, '#c9ced6');
      wheel(8, 26, 3); wheel(26, 26, 3); wheel(50, 26, 3);
    } else if (id === 'lorry') {
      R(0, 2, 52, 24, OUT); R(1, 3, 50, 22, '#e8e2d0'); R(1, 3, 50, 2, '#fff8ee'); R(1, 23, 50, 2, '#b8b0a0');
      R(4, 8, 44, 8, BODY || '#e8542f'); R(4, 8, 44, 1, LIT || '#ff8f6a');
      R(20, 10, 6, 5, '#fff8ee'); R(21, 9, 4, 1, '#fff8ee');
      R(52, 10, 25, 16, OUT); R(53, 11, 23, 14, BODY || '#e8542f'); R(53, 11, 23, 2, LIT || '#ff8f6a'); R(53, 23, 23, 2, DRK || '#a83a22');
      R(56, 12, 12, 7, OUT); R(57, 13, 10, 5, '#d8f2fa'); R(57, 13, 4, 1, '#ffffff');
      R(74, 20, 3, 3, '#ffd23f'); R(52, 2, 3, 8, '#8a9099');
      wheel(8, 28, 3); wheel(18, 28, 3); wheel(40, 28, 3); wheel(66, 28, 3);
    } else {
      /* railcar */
      R(0, 30, 92, 2, '#8a9099'); for (let i = 0; i < 92; i += 6) R(i, 32, 3, 1, '#5e3d18');
      R(2, 4, 62, 24, OUT); R(3, 5, 60, 22, BODY || '#3f6fd6'); R(3, 5, 60, 2, LIT || '#6f9af0'); R(3, 25, 60, 2, DRK || '#2a4a9e');
      for (let i = 0; i < 6; i++) { R(6 + i * 10, 9, 7, 7, OUT); R(7 + i * 10, 10, 5, 5, '#d8f2fa'); R(7 + i * 10, 10, 2, 1, '#ffffff'); }
      R(3, 18, 60, 3, '#ffd23f');
      R(64, 8, 26, 20, OUT); R(65, 9, 24, 18, '#2e2216'); R(66, 10, 22, 16, '#3a3a4a'); R(66, 10, 22, 2, '#6a6f78');
      R(70, 2, 8, 7, OUT); R(71, 3, 6, 5, '#3a3a4a'); R(72, 0, 4, 3, '#8a9099');
      R(80, 12, 8, 8, OUT); R(81, 13, 6, 6, '#d8f2fa');
      R(86, 22, 4, 4, '#ffd23f');
      wheel(10, 28, 3); wheel(22, 28, 3); wheel(46, 28, 3); wheel(58, 28, 3); wheel(72, 28, 3); wheel(84, 28, 3);
    }
    /* a decal on the flank, for anything with a flank */
    if (DEC) {
      const spot = { van: [20, 12], truck: [10, 12], lorry: [30, 17], train: [30, 21], cart: [23, 11] }[id];
      if (spot) {
        const [dx, dy] = spot;
        if (DEC === 'egg') { R(dx, dy, 3, 4, '#fff8ee'); R(dx + 1, dy - 1, 1, 1, '#fff8ee'); R(dx + 1, dy + 4, 1, 1, '#fff8ee'); R(dx + 1, dy + 1, 1, 1, '#ffd23f'); }
        else if (DEC === 'stripe') { R(dx - 8, dy + 1, 20, 1, '#fff8ee'); R(dx - 8, dy + 3, 20, 1, LIT || '#ffd23f'); }
        else if (DEC === 'flames') { for (let i = 0; i < 5; i++) { R(dx - 6 + i * 3, dy + 3 - (i % 2), 2, 2 + (i % 2), '#f0a422'); R(dx - 6 + i * 3, dy + 4, 2, 1, '#e8542f'); } }
        else if (DEC === 'stars') { [[0, 0], [5, 2], [10, -1]].forEach(([sx, sy]) => { R(dx + sx, dy + sy + 1, 3, 1, '#ffd23f'); R(dx + sx + 1, dy + sy, 1, 3, '#ffd23f'); }); }
        else if (DEC === 'logo' && paint.logo) { ctx.drawImage(iconSprite(paint.logo, k), dx * k, (dy - 2) * k); }
      }
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     CITY SKYLINES - what the delivery drives into. sky 0 is a
     village, 4 is a port. Width w, drawn on a transparent strip.
     ============================================================ */
  function skylineSprite(sky, w, h, scale) {
    const key = 'sky_' + sky + '_' + w + '_' + h + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(w * k, h * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(4000 + sky * 17);
    const R = (x, y, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, ww * k, hh * k); };
    const OUT = '#2e2216';
    const palettes = [
      ['#e8c48f', '#c99a5b', '#d9b98c'],            /* thatch and timber */
      ['#e8e2d0', '#c9a35f', '#b58a4f'],            /* market town */
      ['#8a9099', '#b8c0cc', '#5a626e', '#e8e2d0'], /* city */
      ['#c9ced6', '#e8e2d0', '#8fb8d6', '#5a626e'], /* capital */
      ['#5a626e', '#8a9099', '#b8c0cc', '#e8542f'], /* port */
    ][Math.min(4, sky)];
    const maxH = [16, 26, 44, 58, 50][Math.min(4, sky)];
    const minH = [8, 12, 18, 24, 14][Math.min(4, sky)];
    let x = 0;
    while (x < w) {
      const bw = 8 + Math.floor(rnd() * (sky >= 2 ? 14 : 10));
      const bh = minH + Math.floor(rnd() * (maxH - minH));
      const col = palettes[Math.floor(rnd() * palettes.length)];
      R(x, h - bh - 1, bw, bh + 1, OUT);
      R(x + 1, h - bh, bw - 2, bh, col);
      R(x + 1, h - bh, bw - 2, 1, lighten(col, 0.3));
      R(x + 1, h - 1, bw - 2, 1, darken(col, 0.3));
      /* roofs */
      if (sky <= 1 || rnd() < 0.3) {
        const rc = sky === 0 ? '#a8783f' : rnd() < 0.5 ? '#c94a3a' : '#7a5230';
        for (let i = 0; i < Math.floor(bw / 2); i++) R(x + i, h - bh - 1 - Math.min(i, bw - 1 - i), bw - i * 2, 1, i === 0 ? OUT : rc);
        R(x + 1, h - bh - 1, bw - 2, 1, OUT);
      } else if (rnd() < 0.5) {
        R(x + 2, h - bh - 3, bw - 4, 2, darken(col, 0.2)); R(x + 3, h - bh - 4, 1, 1, OUT);
      }
      /* windows */
      for (let wy = h - bh + 2; wy < h - 4; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        if (rnd() < 0.25) continue;
        R(wx, wy, 1, 2, rnd() < 0.7 ? '#ffe9a0' : '#7a5230');
      }
      /* doors */
      if (sky <= 1) { R(x + Math.floor(bw / 2) - 1, h - 4, 2, 3, '#5e3d18'); }
      x += bw + (sky >= 2 ? 0 : 1 + Math.floor(rnd() * 3));
    }
    /* landmarks */
    if (sky === 0) { R(4, h - 30, 5, 30, OUT); R(5, h - 29, 3, 28, '#e8e2d0'); R(4, h - 33, 5, 4, '#7a5230'); R(6, h - 26, 1, 3, '#7a5230'); }
    if (sky === 1) { R(w - 14, h - 34, 6, 34, OUT); R(w - 13, h - 33, 4, 32, '#c9a35f'); R(w - 12, h - 30, 2, 2, '#fff8ee'); R(w - 15, h - 36, 8, 3, '#7a5230'); }
    if (sky === 3) { R(Math.floor(w / 2) - 5, h - 70, 10, 70, OUT); R(Math.floor(w / 2) - 4, h - 69, 8, 68, '#e8e2d0'); R(Math.floor(w / 2) - 2, h - 74, 4, 5, '#ffd23f'); }
    if (sky === 4) { for (let i = 0; i < 3; i++) { const cx = 10 + i * 30; R(cx, h - 40, 2, 40, OUT); R(cx, h - 40, 18, 2, OUT); R(cx + 14, h - 38, 1, 8, OUT); } }
    cache.set(key, c);
    return c;
  }

  /* the pixel mouse pointer that lives on the Lab screen */
  function cursorSprite(kind, scale) {
    const key = 'cur_' + kind + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const rows = kind === 'hand' ? [
      '...oo.....', '..owwo.oo.', '..owwooww.', '..owwowwwo', 'ooowwwwwwo',
      'owowwwwwwo', 'owwwwwwwwo', '.owwwwwwo.', '..owwwwwo.', '...oooooo.'] : [
      'o.........', 'oo........', 'owo.......', 'owwo......', 'owwwo.....',
      'owwwwo....', 'owwwwwo...', 'owwooooo..', 'owo.......', 'oo........'];
    const c = newCanvas(10 * k, 10 * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, rows, { '.': null, o: '#1a1410', w: '#fff8ee' }, 0, 0, k);
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     BLOCKY FLAT-TOP HEXAGON - the tiles of the research map
     ============================================================ */
  function hexRows(size) {
    /* flat-top: height = sqrt(3)*size, width = 2*size; half-widths per row */
    const h = Math.round(Math.sqrt(3) * size);
    const rows = [];
    for (let y = 0; y < h; y++) {
      const t = Math.abs((y + 0.5) / h - 0.5) * 2;      /* 0 middle .. 1 edge */
      rows.push(Math.round(size * (1 - t * 0.5)));
    }
    return rows;
  }
  function drawHex(ctx, cx, cy, size, pal, opts) {
    opts = opts || {};
    const rows = hexRows(size);
    const h = rows.length;
    for (let i = 0; i < h; i++) {
      const y = cy - Math.floor(h / 2) + i;
      const half = rows[i];
      const prev = rows[Math.max(0, i - 1)], next = rows[Math.min(h - 1, i + 1)];
      for (let x = -half; x < half; x++) {
        const edge = x === -half || x === half - 1 || i === 0 || i === h - 1 ||
                     x < -prev || x >= prev || x < -next || x >= next;
        let col;
        if (edge) col = pal.out;
        else if (i < h * 0.3) col = pal.light;
        else if (i > h * 0.72) col = pal.dark;
        else col = pal.base;
        if (!edge && opts.rim && (x === -half + 1 || x === half - 2)) col = pal.dark;
        ctx.fillStyle = col;
        ctx.fillRect(cx + x, y, 1, 1);
      }
    }
  }
  function hexHit(dx, dy, size) {
    const h = Math.sqrt(3) * size;
    if (Math.abs(dy) > h / 2) return false;
    const t = Math.abs(dy) / (h / 2);
    return Math.abs(dx) <= size * (1 - t * 0.5);
  }

  /* a little extruded block: a dark back face up and to the right,
     then the front face with a lit top edge. (x, y) is the front face. */
  function drawCube(ctx, x, y, s, pal, opts) {
    opts = opts || {};
    const d = opts.depth === undefined ? 2 : opts.depth;
    if (d) {
      ctx.fillStyle = pal.out; ctx.fillRect(x + d, y - d, s, s);
      ctx.fillStyle = pal.dark; ctx.fillRect(x + d + 1, y - d + 1, s - 2, s - 2);
      ctx.fillStyle = pal.light; ctx.fillRect(x + d + 1, y - d + 1, s - 2, 1);
    }
    ctx.fillStyle = pal.out; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = pal.base; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = pal.light; ctx.fillRect(x + 1, y + 1, s - 2, 1); ctx.fillRect(x + 1, y + 1, 1, s - 2);
    ctx.fillStyle = pal.dark; ctx.fillRect(x + 1, y + s - 2, s - 2, 1); ctx.fillRect(x + s - 2, y + 1, 1, s - 2);
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(x, y, 1, 1); ctx.fillRect(x, y + s - 1, 1, 1); ctx.fillRect(x + s - 1, y + s - 1, 1, 1);
      if (!d) ctx.fillRect(x + s - 1, y, 1, 1);
    }
  }

  /* ============================================================
     CARS - traffic on the road. Every car faces east; the caller
     flips it to drive west. `col` is the paint job.
     ============================================================ */
  function carSprite(kind, col, frame, scale) {
    const key = 'car_' + kind + '_' + col + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const dims = { sedan: [26, 13], hatch: [22, 13], pickup: [28, 13], van: [28, 15], bus: [42, 17], limo: [40, 13], mover: [40, 19] }[kind] || [26, 13];
    const c = newCanvas(dims[0] * k, dims[1] * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col2) => { ctx.fillStyle = col2; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2e2216';
    const body = col || '#e8542f', light = lighten(body, 0.4), dark = darken(body, 0.32);
    const wheel = (x, y) => {
      R(x - 2, y - 1, 5, 3, OUT); R(x - 1, y - 2, 3, 5, OUT);
      R(x - 1, y - 1, 3, 3, '#3a3a4a');
      R(x + (frame ? 0 : -1), y + (frame ? -1 : 0), 1, 1, '#c9ced6');
    };
    const win = (x, y, w, h) => { R(x, y, w, h, OUT); R(x + 1, y + 1, w - 2, h - 2, '#d8f2fa'); R(x + 1, y + 1, Math.max(1, w - 4), 1, '#ffffff'); };
    const H = dims[1];
    if (kind === 'sedan') {
      R(1, 5, 24, 6, OUT); R(2, 6, 22, 4, body); R(2, 6, 22, 1, light); R(2, 9, 22, 1, dark);
      R(6, 1, 14, 5, OUT); R(7, 2, 12, 4, body); R(7, 2, 12, 1, light);
      win(8, 2, 5, 4); win(14, 2, 5, 4);
      R(24, 7, 1, 2, '#ffd23f'); R(1, 7, 1, 2, '#e8542f');
      wheel(6, H - 3); wheel(19, H - 3);
    } else if (kind === 'hatch') {
      R(1, 5, 20, 6, OUT); R(2, 6, 18, 4, body); R(2, 6, 18, 1, light); R(2, 9, 18, 1, dark);
      R(4, 1, 13, 5, OUT); R(5, 2, 11, 4, body); R(5, 2, 11, 1, light);
      win(6, 2, 4, 4); win(11, 2, 5, 4);
      R(20, 7, 1, 2, '#ffd23f'); R(1, 7, 1, 2, '#e8542f');
      wheel(5, H - 3); wheel(16, H - 3);
    } else if (kind === 'pickup') {
      R(1, 5, 26, 6, OUT); R(2, 6, 24, 4, body); R(2, 6, 24, 1, light); R(2, 9, 24, 1, dark);
      R(15, 1, 10, 5, OUT); R(16, 2, 8, 4, body); R(16, 2, 8, 1, light);
      win(17, 2, 6, 4);
      R(2, 4, 12, 2, OUT); R(3, 5, 10, 1, dark);
      R(4, 3, 3, 3, '#c9924f'); R(8, 3, 4, 3, '#e0bd82');
      R(26, 7, 1, 2, '#ffd23f'); R(1, 7, 1, 2, '#e8542f');
      wheel(6, H - 3); wheel(21, H - 3);
    } else if (kind === 'van') {
      R(1, 1, 26, 12, OUT); R(2, 2, 24, 10, body); R(2, 2, 24, 1, light); R(2, 11, 24, 1, dark);
      win(19, 3, 7, 5); R(4, 4, 10, 3, dark); R(5, 5, 8, 1, light);
      R(26, 8, 1, 2, '#ffd23f'); R(1, 8, 1, 2, '#e8542f');
      wheel(7, H - 3); wheel(21, H - 3);
    } else if (kind === 'bus') {
      R(1, 1, 40, 14, OUT); R(2, 2, 38, 12, body); R(2, 2, 38, 1, light); R(2, 13, 38, 1, dark);
      for (let i = 0; i < 6; i++) win(3 + i * 6, 3, 6, 5);
      R(2, 9, 38, 1, '#fff8ec');
      R(40, 10, 1, 2, '#ffd23f'); R(1, 10, 1, 2, '#e8542f');
      wheel(8, H - 3); wheel(19, H - 3); wheel(32, H - 3);
    } else if (kind === 'limo') {
      /* long, low and black, with a gold line down the side */
      R(1, 5, 38, 6, OUT); R(2, 6, 36, 4, body); R(2, 6, 36, 1, light); R(2, 9, 36, 1, dark);
      R(9, 1, 24, 5, OUT); R(10, 2, 22, 4, body); R(10, 2, 22, 1, light);
      win(11, 2, 5, 4); win(17, 2, 5, 4); win(23, 2, 5, 4); win(28, 2, 4, 4);
      R(2, 8, 36, 1, '#ffd23f');
      R(38, 7, 1, 2, '#ffd23f'); R(1, 7, 1, 2, '#e8542f');
      R(5, 1, 1, 4, '#c9ced6');                     /* the little flag mast */
      R(6, 1, 3, 2, '#e8542f');
      wheel(7, H - 3); wheel(32, H - 3);
    } else {
      /* the movers' box van: white box, blue stripe, the name on the side */
      R(1, 1, 30, 16, OUT); R(2, 2, 28, 14, '#f2ece0'); R(2, 2, 28, 1, '#ffffff'); R(2, 15, 28, 1, '#b8b0a0');
      R(2, 10, 28, 3, '#3fa7d6'); R(2, 10, 28, 1, '#7fc4e8');
      drawTiny(ctx, 'MOVERS', 4 * k, 4 * k, '#2f5f9e', k);
      R(30, 5, 9, 12, OUT); R(31, 6, 7, 10, '#3fa7d6'); R(31, 6, 7, 1, '#7fc4e8');
      win(32, 7, 6, 5);
      R(38, 13, 1, 2, '#ffd23f'); R(1, 13, 1, 2, '#e8542f');
      wheel(7, H - 3); wheel(33, H - 3);
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     THE RACCOON - who inherited the farm and means to get rich.
     A 28 x 34 body on a canvas with nine rows of headroom for a
     hat: four rows of ear, a pale blaze up the forehead, a black
     bandit mask that flares at the eyes and points down the cheeks,
     four-pixel eyes with pupils that both look the way he is
     facing, a snout with a nose and a small grin, and a fat
     five-ringed tail hanging down behind him. Dressed from a
     wardrobe record { hat, suit, glasses, acc } and posed. The
     wide poses (dancing, chopping, hammering, punching, the
     guitar) get a 44-wide canvas and report where the body sits on
     it as .ox, so a caller can keep the feet where they were.
     ============================================================ */
  const RACCOON_ROWS = [
    '.........oo.......oo........',
    '........odpo.....opdo.......',
    '........odpo.....opdo.......',
    '.......oddpgooooogpddo......',
    '.......odgGGGGGGGGGgdo......',
    '.......odgGGGGGGGGGgdo......',
    '.......oddgGGGGGGGgddo......',
    '.......odkkkkkkkkkkkdo......',
    '.......okkkkkkkkkkkkko......',
    '.......okwwwwkkkwwwwko......',
    '.......okwwewkkkwwewko......',
    '.......okweewkkkweewko......',
    '.......okwwwwkkkwwwwko......',
    '.......odkkkkkkkkkkkdo......',
    '.......oogkkWWWWWkkgoo......',
    '.........ogcWWWWWcgo........',
    '...........oWnnnWo..........',
    '...........onnWnno..........',
    '...ooo..ogggggggggggo.......',
    '..oTTToogggggggggggggo......',
    '.oTTTToogggggggggggggo......',
    '.ottTtoogggggggggggggo......',
    'otttTtoogggggggggggggo......',
    'oTTtTtoogggggggggggggo......',
    'oTTTTtoogggggggggggggo......',
    'ottTTtoogggggggggggggo......',
    'otttTtoogggggggggggggo......',
    'oTTtTto.ogggggggggggo.......',
    'oTTTTto..ogggo..ogggo.......',
    'ottTTto..ogggo..ogggo.......',
    '.ottTto..ogggo..ogggo.......',
    '.oTTTo..oSSSSo.ossssso......',
    '..oooo..oSSSSo.ossssso......',
    '........oooooo.ooooooo......',
  ];
  const RACCOON_PAL = {
    o: '#17141d',   /* outline                */  d: '#5b6270',   /* fur, in shade      */
    g: '#828a97',   /* fur                    */  G: '#bfc6cf',   /* fur, lit           */
    W: '#e9eef4',   /* blaze and snout        */  k: '#2d2736',   /* the mask           */
    w: '#ffffff',   /* eye                    */  e: '#0e0c12',   /* pupil              */
    n: '#100e14',   /* nose and mouth         */  p: '#cf7f8f',   /* inside an ear      */
    c: '#e89aa8',   /* a rosy cheek           */
    t: '#3a4048',   /* tail, dark ring        */  T: '#a2aab6',   /* tail, pale ring    */
    s: '#241f2c',   /* near shoe              */  S: '#39333f',   /* far shoe           */
  };
  const RAC_OFF = 9;                       /* rows of headroom above the ears */
  const RAC_W = 28, RAC_H = 34, RAC_MID = 14;
  /* what his face does in each pose unless a caller says otherwise */
  const DEFAULT_EXPR = {
    stand: 'happy', walk0: 'happy', walk1: 'happy', boss: 'smug', read: 'smug',
    cheer: 'grin', blink: 'blink',
    dance0: 'grin', dance1: 'grin', dance2: 'grin', guitar0: 'grin', guitar1: 'grin',
    chop0: 'determined', chop1: 'determined', hammer0: 'determined', hammer1: 'determined',
    punch0: 'angry', punch1: 'angry',
  };
  const WIDE_POSES = ['dance0', 'dance1', 'dance2', 'guitar0', 'guitar1', 'chop0', 'chop1', 'hammer0', 'hammer1', 'punch0', 'punch1'];
  function outfitOf(w) {
    const o = Object.assign({}, (typeof WARDROBE_DEFAULT !== 'undefined' ? WARDROBE_DEFAULT : {}), w || {});
    const suit = (typeof COSMETIC_BY_ID !== 'undefined' && COSMETIC_BY_ID[o.suit]) || { col: '#2c2a36', trim: '#e8542f' };
    return { hat: o.hat || 'hat_top', suit, glasses: o.glasses || 'gl_none', acc: o.acc || 'acc_coin' };
  }
  function raccoonSprite(pose, scale, wardrobe, expr) {
    pose = pose || 'stand';
    const of = outfitOf(wardrobe);
    const key = 'racc5_' + pose + '|' + (expr || '') + '_' + scale + '_' + of.hat + of.suit.id + of.glasses + of.acc;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const wide = WIDE_POSES.includes(pose);
    const ox = wide ? 8 : 0;
    const c = newCanvas((wide ? 44 : 28) * k, (RAC_H + RAC_OFF) * k);
    c.ox = ox;
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { if (!col) return; ctx.fillStyle = col; ctx.fillRect((x + ox) * k, (y + RAC_OFF) * k, w * k, h * k); };
    const CLR = (x, y, w, h) => ctx.clearRect((x + ox) * k, (y + RAC_OFF) * k, w * k, h * k);
    const P = RACCOON_PAL;
    const O = P.o, g = P.g, G = P.G;
    const suitCol = of.suit.col || '#2c2a36', trim = of.suit.trim || '#e8542f';
    const suitLit = lighten(suitCol, 0.28), suitDk = darken(suitCol, 0.38), suitMid = lighten(suitCol, 0.12);
    const green = of.suit.id === 'suit_green';
    const paw = green ? '#3fa85f' : G;
    const pawLit = lighten(paw, 0.3);
    const cuff = '#e6ebf1';
    const dancing = pose.startsWith('dance') || pose.startsWith('guitar');
    const striding = pose === 'walk0' || pose === 'walk1';

    /* ---- the animal underneath ---- */
    drawGrid(ctx, RACCOON_ROWS, RACCOON_PAL, ox * k, RAC_OFF * k, k);
    /* ---- the face on top: one of eleven expressions, drawn over the
       eyes (two 4x4 boxes at rows 9-12) and the mouth (rows 16-17).
       Each pose has a default - he grins while he dances, scowls while
       he punches - and a caller can ask for any of them by name. ---- */
    const EX = expr || DEFAULT_EXPR[pose] || 'happy';
    if (EX !== 'happy') {
      const K_ = P.k, W_ = P.W, N_ = P.n, WH_ = '#ffffff', LID = '#5b5170';
      const eyes = (l, r) => { l(9); r === undefined ? l(16) : r(16); };
      const box = x => R(x, 9, 4, 4, K_);
      const mouth = kind => {
        /* the base mouth is a smile with the corners turned up; every
           other shape is painted over the same two rows */
        if (kind === 'grin') { R(12, 17, 5, 1, N_); R(13, 17, 3, 1, '#8a3a4a'); R(12, 16, 1, 1, N_); R(16, 16, 1, 1, N_); }
        else if (kind === 'open') { R(12, 17, 5, 1, N_); R(13, 16, 3, 1, N_); R(13, 17, 3, 1, '#8a3a4a'); }
        else if (kind === 'frown') { R(12, 17, 5, 1, W_); R(13, 17, 3, 1, N_); }
        else if (kind === 'flat') { R(12, 17, 5, 1, N_); }
        else if (kind === 'smirk') { R(12, 17, 5, 1, W_); R(14, 17, 3, 1, N_); R(16, 16, 1, 1, N_); }
        else if (kind === 'o') { R(12, 17, 5, 1, W_); R(14, 17, 1, 1, N_); R(14, 16, 1, 1, N_); }
        else if (kind === 'teeth') { R(11, 17, 7, 1, N_); R(12, 17, 5, 1, '#fff8ec'); R(14, 17, 1, 1, N_); }
      };
      switch (EX) {
        case 'blink':                       /* eyes shut, curved happily */
          eyes(x => { box(x); R(x, 10, 1, 1, LID); R(x + 1, 11, 2, 1, LID); R(x + 3, 10, 1, 1, LID); });
          break;
        case 'grin':                        /* squeezed shut with pleasure */
          eyes(x => { box(x); R(x, 11, 1, 1, WH_); R(x + 1, 10, 2, 1, WH_); R(x + 3, 11, 1, 1, WH_); });
          mouth('grin');
          break;
        case 'wow':                         /* startled: tiny pupils, brows up */
          eyes(x => { R(x, 9, 4, 4, WH_); R(x + 1, 10, 1, 1, P.e); R(x + 2, 11, 1, 1, P.e); });
          R(9, 8, 4, 1, P.G); R(16, 8, 4, 1, P.G);
          mouth('o');
          break;
        case 'angry':                        /* brows down over small eyes */
          eyes(x => { box(x); R(x, 10, 4, 3, WH_); R(x + 1, 11, 2, 2, P.e); });
          R(9, 9, 2, 1, P.o); R(11, 10, 2, 1, P.o);
          R(17, 10, 2, 1, P.o); R(19, 9, 2, 1, P.o);
          mouth('teeth');
          break;
        case 'determined':                   /* brows level and low */
          eyes(x => { box(x); R(x, 10, 4, 3, WH_); R(x + 1, 11, 2, 2, P.e); });
          R(9, 9, 4, 1, P.o); R(16, 9, 4, 1, P.o);
          mouth('flat');
          break;
        case 'smug':                         /* one eye half shut */
          R(16, 9, 4, 2, K_); R(16, 10, 4, 1, LID);
          mouth('smirk');
          break;
        case 'sad':                          /* pupils low, brows up inside */
          eyes(x => { box(x); R(x, 10, 4, 3, WH_); R(x + 1, 11, 2, 2, P.e); });
          R(11, 8, 2, 1, P.d); R(16, 8, 2, 1, P.d);
          mouth('frown');
          break;
        case 'love':                         /* a heart in each eye */
          eyes(x => {
            R(x, 9, 4, 4, K_);
            R(x, 10, 1, 2, '#ff5f9e'); R(x + 3, 10, 1, 2, '#ff5f9e');
            R(x + 1, 9, 1, 1, '#ff5f9e'); R(x + 2, 9, 1, 1, '#ff5f9e');
            R(x + 1, 10, 2, 2, '#ff5f9e'); R(x + 1, 12, 2, 1, '#ff5f9e');
            R(x + 1, 10, 1, 1, '#ffb0d0');
          });
          mouth('grin');
          break;
        case 'dizzy':                        /* crossed out */
          eyes(x => {
            R(x, 9, 4, 4, K_);
            R(x, 9, 1, 1, WH_); R(x + 1, 10, 1, 1, WH_); R(x + 2, 11, 1, 1, WH_); R(x + 3, 12, 1, 1, WH_);
            R(x + 3, 9, 1, 1, WH_); R(x + 2, 10, 1, 1, WH_); R(x + 1, 11, 1, 1, WH_); R(x, 12, 1, 1, WH_);
          });
          mouth('open');
          break;
        case 'money':                        /* coins where his eyes were */
          eyes(x => {
            R(x, 9, 4, 4, K_);
            R(x + 1, 9, 2, 1, '#ffd23f'); R(x, 10, 4, 2, '#ffd23f'); R(x + 1, 12, 2, 1, '#ffd23f');
            R(x + 1, 10, 2, 2, '#b87c10'); R(x + 1, 10, 1, 1, '#fff3c4');
          });
          mouth('grin');
          break;
      }
    }

    /* ---- legs ---- */
    if (dancing) {
      CLR(7, 28, 16, 6);
      const lift = pose === 'dance1' || pose === 'guitar1' ? 2 : 0;
      /* far leg kicked back, near leg planted - swapped on the off beat */
      R(6, 28 - lift, 6, 3, O); R(7, 28 - lift, 4, 2, g);
      R(4, 31 - lift, 7, 3, O); R(5, 31 - lift, 5, 2, P.S);
      R(17, 27 + lift, 6, 4, O); R(18, 27 + lift, 4, 3, g);
      R(17, 31 + lift, 8, 3, O); R(18, 31 + lift, 6, 2, P.s);
    } else if (pose === 'walk1') {
      CLR(7, 28, 18, 6);                        /* near leg swung forward */
      R(9, 28, 5, 3, O); R(10, 28, 3, 2, g); R(6, 31, 7, 3, O); R(7, 31, 5, 2, P.S);
      R(16, 28, 5, 3, O); R(17, 28, 3, 2, g); R(18, 31, 7, 3, O); R(19, 31, 5, 2, P.s);
    } else if (pose === 'walk0') {
      CLR(7, 28, 18, 6);                        /* legs crossing under him */
      R(11, 28, 5, 3, O); R(12, 28, 3, 2, g); R(11, 31, 7, 3, O); R(12, 31, 5, 2, P.S);
      R(15, 28, 5, 3, O); R(16, 28, 3, 2, g); R(15, 31, 7, 3, O); R(16, 31, 5, 2, P.s);
    } else {
      R(17, 31, 4, 1, '#5a5366'); R(9, 31, 3, 1, '#443e50');   /* a glint along each shoe */
    }

    /* ---- the suit ---- */
    R(9, 18, 11, 1, suitCol); R(8, 19, 13, 8, suitCol); R(9, 27, 11, 1, suitDk);
    R(9, 18, 11, 1, suitLit);                                  /* light across the shoulders */
    R(8, 19, 1, 8, suitMid); R(20, 19, 1, 8, suitDk);          /* far edge lit, near edge shaded */
    R(12, 18, 5, 1, '#fff8ec'); R(13, 19, 3, 8, '#fff8ec');    /* the shirt, a V of white */
    R(13, 19, 1, 8, '#ded5c2');                                /* a fold down the shirt */
    R(11, 18, 1, 1, suitLit); R(17, 18, 1, 1, suitLit);        /* lapel points */
    R(12, 19, 1, 3, suitDk); R(16, 19, 1, 3, suitDk);
    R(11, 19, 1, 1, suitLit); R(17, 19, 1, 1, suitLit);
    R(14, 18, 1, 1, darken(trim, 0.4));                        /* the knot */
    R(14, 19, 1, 6, trim); R(13, 25, 3, 1, trim); R(13, 26, 3, 1, darken(trim, 0.2));
    R(14, 19, 1, 1, lighten(trim, 0.35)); R(14, 25, 1, 1, lighten(trim, 0.3));
    R(10, 22, 2, 1, green ? '#fff8ec' : trim); R(10, 21, 2, 1, darken(green ? '#fff8ec' : trim, 0.3));
    R(18, 21, 1, 1, suitLit); R(18, 24, 1, 1, suitLit);        /* two buttons */
    R(9, 27, 11, 1, '#171420'); R(14, 27, 2, 1, '#ffd23f');    /* belt and buckle */
    if (!dancing && !striding) {
      R(10, 28, 4, 3, darken(suitCol, 0.55)); R(17, 28, 4, 3, darken(suitCol, 0.42));
      R(10, 28, 4, 1, darken(suitCol, 0.68)); R(17, 28, 4, 1, darken(suitCol, 0.52));
    }

    /* ---- arms: a sleeve, a cuff, a paw with three fingers ---- */
    const arm = (x, y, h) => {
      R(x, y, 4, h, O);
      R(x + 1, y, 2, h - 3, suitCol); R(x + 1, y, 2, 1, suitLit);
      R(x + 1, y + h - 4, 2, 1, cuff);
      R(x, y + h - 3, 4, 3, O); R(x + 1, y + h - 3, 2, 2, paw); R(x + 1, y + h - 3, 1, 1, pawLit);
      R(x + 1, y + h - 1, 1, 1, darken(paw, 0.25)); R(x + 3, y + h - 2, 1, 1, darken(paw, 0.25));
    };
    const fist = (x, y) => {
      R(x, y, 4, 4, O); R(x + 1, y + 1, 2, 2, paw); R(x + 1, y + 1, 1, 1, pawLit);
      R(x + 2, y + 2, 1, 1, darken(paw, 0.3));
    };
    if (pose === 'cheer') {
      R(7, 10, 3, 9, O); R(8, 11, 1, 6, suitCol); R(8, 16, 1, 1, cuff);
      R(19, 10, 3, 9, O); R(20, 11, 1, 6, suitCol); R(20, 16, 1, 1, cuff);
      fist(6, 6); fist(19, 6);
    } else if (pose === 'read') {
      R(6, 19, 17, 10, O); R(7, 20, 15, 8, '#fff8ec');
      R(9, 21, 11, 1, '#b8b0a0'); R(9, 24, 8, 1, '#b8b0a0'); R(9, 26, 6, 1, '#b8b0a0');
      R(14, 20, 1, 8, '#d8d0bc');
      R(5, 21, 3, 5, O); R(6, 22, 1, 3, paw); R(22, 21, 3, 5, O); R(22, 22, 1, 3, paw);
    } else if (pose === 'dance0') {
      R(4, 13, 3, 8, O); R(5, 14, 1, 5, suitCol); R(5, 18, 1, 1, cuff); fist(3, 10); arm(18, 19, 8);
    } else if (pose === 'dance1') {
      R(4, 11, 3, 8, O); R(5, 12, 1, 5, suitCol); fist(3, 8);
      R(22, 11, 3, 8, O); R(22, 12, 1, 5, suitCol); fist(22, 8);
    } else if (pose === 'dance2') {
      arm(7, 19, 8); R(22, 12, 3, 8, O); R(22, 13, 1, 5, suitCol); R(22, 17, 1, 1, cuff); fist(22, 9);
    } else if (pose.startsWith('guitar')) {
      /* a red flying-V slung across him, one paw on the neck, one strumming */
      const strum = pose === 'guitar1' ? 2 : 0;
      R(4, 17, 18, 2, '#5e4426'); R(4, 17, 18, 1, '#8a6a3c');            /* the strap */
      R(12, 20, 13, 9, O); R(13, 21, 11, 7, '#c9302f'); R(13, 21, 11, 2, '#ff6b5a');
      R(22, 20, 8, 5, O); R(22, 21, 7, 2, '#c9302f');                    /* the far wing */
      R(16, 24, 5, 2, '#ffd23f'); R(18, 22, 1, 5, '#2e2216');
      R(-4, 12, 18, 3, O); R(-3, 13, 16, 1, '#5e3d18');                  /* the neck */
      for (let i = 0; i < 6; i++) R(-3 + i * 3, 12, 1, 1, '#c9ced6');
      R(-7, 10, 4, 6, O); R(-6, 11, 2, 3, '#c9302f');                    /* the head stock */
      R(6, 14, 3, 7, O); R(7, 15, 1, 4, suitCol); R(4, 10, 4, 4, O); R(5, 11, 2, 2, paw);
      R(21, 18 + strum, 3, 6, O); R(21, 19 + strum, 1, 3, suitCol);
      R(18, 23 + strum, 4, 3, O); R(19, 23 + strum, 2, 2, paw);
    } else if (pose === 'chop0') {
      /* axe raised behind the head */
      R(19, 7, 3, 13, O); R(20, 8, 1, 10, suitCol); R(20, 17, 1, 1, cuff); fist(19, 4);
      R(22, -5, 2, 11, '#8a5e2a'); R(22, -5, 1, 11, '#a8783f');
      R(18, -10, 7, 6, O); R(19, -9, 5, 4, '#c9ced6'); R(19, -9, 5, 2, '#eef2f6'); R(19, -5, 5, 1, '#8a8f98');
      arm(7, 19, 8);
    } else if (pose === 'chop1') {
      /* axe swung down and out to the right */
      R(19, 18, 3, 6, O); R(20, 19, 1, 3, suitCol); fist(21, 21);
      R(24, 23, 8, 2, '#8a5e2a'); R(24, 23, 8, 1, '#a8783f');
      R(31, 20, 6, 7, O); R(32, 21, 4, 5, '#c9ced6'); R(32, 21, 4, 2, '#eef2f6');
      arm(7, 18, 8);
    } else if (pose === 'hammer0') {
      R(19, 7, 3, 13, O); R(20, 8, 1, 10, suitCol); R(20, 17, 1, 1, cuff); fist(19, 4);
      R(22, -4, 2, 10, '#8a5e2a'); R(22, -4, 1, 10, '#a8783f');
      R(18, -8, 9, 5, O); R(19, -7, 7, 3, '#a8adb8'); R(19, -7, 7, 1, '#ccd2da');
      arm(7, 19, 8);
    } else if (pose === 'hammer1') {
      R(19, 18, 3, 6, O); R(20, 19, 1, 3, suitCol); fist(21, 21);
      R(24, 24, 7, 2, '#8a5e2a'); R(24, 24, 7, 1, '#a8783f');
      R(30, 21, 6, 7, O); R(31, 22, 4, 5, '#a8adb8'); R(31, 22, 4, 2, '#ccd2da');
      arm(7, 18, 8);
    } else if (pose === 'punch0') {
      /* wound up: fist pulled back past the ear */
      R(5, 15, 3, 6, O); R(6, 16, 1, 3, suitCol); fist(1, 13);
      arm(18, 19, 8);
    } else if (pose === 'punch1') {
      /* the punch: an arm straight out to the right, a fist at the end */
      R(19, 18, 14, 3, O); R(19, 19, 12, 2, suitCol); R(28, 19, 1, 2, cuff); fist(32, 17);
      R(28, 17, 6, 1, '#fff8ec'); R(28, 22, 5, 1, 'rgba(255,255,255,.45)');
      R(24, 16, 3, 1, 'rgba(255,255,255,.3)'); R(24, 23, 3, 1, 'rgba(255,255,255,.3)');
      arm(5, 19, 8);
    } else {
      /* standing, walking, boss: arms down, something in the near paw */
      arm(7, 19, 8);
      if (of.acc === 'acc_coin' || of.acc === 'acc_egg') {
        /* the arm bends up and he holds it out where you can see it */
        const egg = of.acc === 'acc_egg';
        R(19, 20, 4, 5, O); R(20, 21, 2, 3, suitCol);            /* upper arm */
        R(19, 15, 4, 6, O); R(20, 16, 2, 3, suitCol); R(20, 19, 2, 1, cuff);
        R(19, 13, 4, 3, O); R(20, 13, 2, 2, paw); R(20, 13, 1, 1, pawLit);
        if (egg) {
          R(20, 8, 3, 1, O); R(19, 9, 5, 4, O);
          R(20, 9, 3, 4, '#fff3d0'); R(20, 9, 1, 2, '#ffffff'); R(22, 11, 1, 1, '#d8cdb0');
        } else {
          R(20, 9, 3, 1, O); R(19, 10, 5, 3, O);
          R(20, 10, 3, 2, '#ffd23f'); R(20, 10, 1, 1, '#fff3c4'); R(22, 11, 1, 1, '#c99a10');
        }
      } else if (of.acc === 'acc_cane') {
        arm(18, 19, 8); R(23, 16, 2, 17, '#5e3d18'); R(23, 16, 1, 17, '#7a5024');
        R(21, 14, 5, 2, '#ffd23f'); R(21, 14, 5, 1, '#fff3c4');
      } else if (of.acc === 'acc_axe') {
        arm(18, 18, 8); R(23, 10, 2, 19, '#8a5e2a'); R(23, 10, 1, 19, '#a8783f');
        R(21, 8, 6, 4, O); R(22, 9, 4, 2, '#c9ced6'); R(22, 9, 4, 1, '#eef2f6');
      } else if (of.acc === 'acc_guitar') {
        R(4, 17, 18, 2, '#5e4426');
        R(12, 21, 13, 8, O); R(13, 22, 11, 6, '#c9302f'); R(13, 22, 11, 2, '#ff6b5a');
        R(18, 23, 1, 5, '#2e2216'); R(16, 25, 5, 1, '#ffd23f');
        R(0, 14, 14, 3, O); R(1, 15, 12, 1, '#5e3d18');
        arm(18, 18, 8);
      } else arm(18, 19, 8);
    }

    /* ---- glasses over the eyes (rows 8-12, lenses at x9-12 and x16-19) ---- */
    if (of.glasses === 'gl_round') {
      const fr = '#c9a35f', li = '#f0dcac';
      [9, 15].forEach(x => {
        R(x, 8, 5, 1, fr); R(x, 12, 5, 1, fr); R(x, 9, 1, 3, fr); R(x + 4, 9, 1, 3, fr);
        R(x + 1, 9, 3, 3, 'rgba(190,225,245,.30)'); R(x + 1, 9, 2, 1, li);
      });
      R(14, 10, 1, 1, fr); R(8, 10, 1, 1, fr); R(20, 10, 1, 1, fr);
    } else if (of.glasses === 'gl_star') {
      [7, 14].forEach(x => {
        R(x, 7, 8, 7, '#7fe8ff'); R(x + 1, 8, 6, 5, '#3fa7d6');
        CLR(x, 7, 2, 1); CLR(x, 7, 1, 2); CLR(x + 6, 7, 2, 1); CLR(x + 7, 7, 1, 2);
        CLR(x, 13, 2, 1); CLR(x, 12, 1, 2); CLR(x + 6, 13, 2, 1); CLR(x + 7, 12, 1, 2);
        R(x + 1, 8, 2, 2, '#ffffff'); R(x + 5, 11, 2, 2, '#c9f4ff');
      });
      R(6, 6, 1, 1, '#ffffff'); R(23, 5, 1, 1, '#ffffff'); R(24, 9, 1, 1, '#ffffff');
    } else if (of.glasses === 'gl_shades') {
      R(7, 8, 8, 5, '#14141c'); R(14, 8, 8, 5, '#14141c'); R(13, 10, 3, 1, '#14141c');
      R(8, 8, 3, 1, '#5a5a6a'); R(15, 8, 3, 1, '#5a5a6a');
      R(12, 11, 2, 1, '#3a3a48'); R(19, 11, 2, 1, '#3a3a48');
    }

    /* ---- the hat: a brim on rows 1-3, a crown above, ear tips still showing ---- */
    const H = of.hat;
    if (H === 'hat_top') {
      R(8, 1, 13, 3, O); R(9, 1, 11, 2, '#2e2216'); R(9, 1, 11, 1, '#453b3a');
      R(10, -7, 9, 9, O); R(11, -6, 7, 8, '#2e2216'); R(11, -6, 2, 8, '#453b3a');
      R(11, -1, 7, 2, trim); R(11, -1, 7, 1, lighten(trim, 0.3));
      R(12, -6, 4, 1, '#57484a');
    } else if (H === 'hat_cap') {
      R(9, 0, 12, 4, O); R(10, 0, 10, 3, suitCol); R(10, 0, 10, 1, suitLit);
      R(19, 3, 7, 2, O); R(19, 2, 6, 1, suitDk); R(14, 0, 2, 3, trim);
    } else if (H === 'hat_straw') {
      R(4, 3, 21, 2, O); R(5, 3, 19, 1, '#e0bd82');
      R(10, -1, 10, 4, O); R(11, -1, 8, 4, '#e0bd82'); R(11, -1, 8, 1, '#f2dcb0'); R(11, 2, 8, 1, '#c9a35f');
    } else if (H === 'hat_crown') {
      R(9, -3, 12, 6, O); R(10, -2, 10, 4, '#ffd23f'); R(10, -2, 10, 2, '#fff3c4');
      [9, 13, 17].forEach(x => { R(x, -6, 3, 3, O); R(x + 1, -6, 1, 3, '#ffd23f'); });
      R(11, 1, 2, 1, '#e8542f'); R(14, 1, 2, 1, '#3fa7d6'); R(17, 1, 2, 1, '#4fc46a');
    } else if (H === 'hat_beanie') {
      R(9, -2, 12, 5, O); R(10, -2, 10, 3, '#6a7ac9'); R(10, -2, 10, 1, '#8f9ee0');
      R(10, 1, 10, 2, '#4a5a9e'); R(13, -5, 3, 3, '#fff8ec');
    } else if (H === 'hat_wizard') {
      const wc = '#4a3a9e';
      R(13, -9, 3, 2, O); R(12, -7, 5, 2, O); R(13, -7, 3, 1, wc);
      R(11, -5, 7, 2, O); R(12, -5, 5, 1, wc);
      R(10, -3, 9, 2, O); R(11, -3, 7, 1, wc);
      R(9, -1, 12, 4, O); R(10, -1, 10, 3, wc); R(6, 2, 17, 2, O); R(7, 2, 15, 1, wc);
      R(13, -5, 1, 1, '#ffd23f'); R(16, -1, 1, 1, '#ffd23f'); R(11, 1, 1, 1, '#8f7fe0');
    } else if (H === 'hat_cowboy') {
      R(3, 3, 23, 2, O); R(4, 3, 21, 1, '#a8783f');
      R(9, -3, 12, 6, O); R(10, -2, 10, 5, '#a8783f'); R(10, -2, 10, 2, '#c9924f');
      R(10, 2, 10, 1, '#3a2a16'); R(13, -4, 4, 1, '#a8783f');
    } else if (H === 'hat_halo') {
      R(9, -6, 12, 2, '#ffd23f'); R(8, -5, 1, 2, '#ffd23f'); R(21, -5, 1, 2, '#ffd23f');
      R(9, -3, 12, 2, '#ffd23f'); R(11, -5, 8, 1, '#fff3c4');
    } else if (H === 'hat_chef') {
      R(9, 0, 12, 3, O); R(10, 0, 10, 2, '#e8dcc0');
      R(7, -6, 16, 6, O); R(8, -5, 14, 5, '#fff8ec'); R(8, -5, 14, 2, '#ffffff');
      R(12, -7, 6, 1, '#fff8ec'); R(10, -8, 4, 2, '#fff8ec'); R(16, -8, 5, 2, '#fff8ec');
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     THE WARDEN - a short, round, orange thing with a mustache far
     too big for it, who lives under the stumps and speaks for the
     trees. He turns up whenever one comes down. 12 x 16, facing
     right, with five rows of headroom so a raised fist has somewhere
     to go. Poses: stand, wag (shaking a fist), point, sulk.
     ============================================================ */
  const WARDEN_ROWS = [
    '....oooo....',
    '..ooffFFoo..',
    '.offFFFFFfo.',
    'offFFFFFFFfo',
    'ofFFffffFFfo',
    'ofFfeffeFffo',
    'ofFffffffFfo',
    'ommMMMMMMmmo',
    'mmMMMMMMMMmm',
    'ommMMMMMMmmo',
    '.oomMMMMmoo.',
    '..offfffffo.',
    '.offFFFFFfo.',
    '.offfffffffo',
    '..oo.oo.oo..',
    '...oo...oo..',
  ];
  const WARDEN_PAL = { o: '#6b2f0a', f: '#e8721c', F: '#ff9a3d', d: '#b8500c',
                       m: '#e8c37a', M: '#fff3d0', e: '#201008' };
  const WARD_OFF = 5;
  function wardenSprite(pose, scale) {
    pose = pose || 'stand';
    const key = 'ward_' + pose + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(18 * k, (16 + WARD_OFF) * k);
    const ctx = c.getContext('2d');
    drawGrid(ctx, WARDEN_ROWS, WARDEN_PAL, 0, WARD_OFF * k, k);
    const R = (x, y, w, h, col) => { if (!col) return; ctx.fillStyle = col; ctx.fillRect(x * k, (y + WARD_OFF) * k, w * k, h * k); };
    const O = WARDEN_PAL.o, f = WARDEN_PAL.f, F = WARDEN_PAL.F;
    if (pose === 'wag') {
      /* one fist up over the head, mid-shake */
      R(11, 8, 3, 4, O); R(12, 9, 1, 2, f);
      R(12, 4, 4, 4, O); R(13, 5, 2, 2, F);
      R(-1, 11, 3, 3, O); R(0, 12, 1, 1, f);
    } else if (pose === 'point') {
      /* an arm straight out, one stubby finger on the end */
      R(11, 11, 6, 3, O); R(11, 12, 5, 1, f); R(16, 11, 2, 2, O); R(16, 12, 1, 1, F);
      R(-1, 11, 3, 3, O); R(0, 12, 1, 1, f);
    } else if (pose === 'sulk') {
      /* arms folded, and the mustache droops a row */
      ctx.clearRect(0, (7 + WARD_OFF) * k, 12 * k, k);
      R(0, 8, 12, 1, WARDEN_PAL.m);
      R(2, 12, 8, 2, O); R(3, 12, 6, 1, f);
    } else {
      R(11, 11, 3, 3, O); R(11, 12, 2, 1, f);
      R(-1, 11, 3, 3, O); R(0, 12, 1, 1, f);
    }
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     THE OVERHAUL'S SMALL ART - tool icons big enough to read, the
     pantry's produce and goods, the limousine's present, a HELP
     WANTED poster, a soft shadow and a bar everything shares.
     ============================================================ */
  const TOOL_ICONS = {
    hand: [
      '.....oo.......', '....owwo..oo..', '....owwo.owwo.', '....owwooowwoo', 'oo..owwowwowwo',
      'owoowwwwwwwwwo', 'owwowwwwwwwwwo', '.owwwwwwwwwwwo', '.owwwwwwwwwwo.', '..owwwwwwwwwo.',
      '..owwwwwwwwwo.', '...owwwwwwwo..', '...oSSSSSSSo..', '....ooooooo...'],
    basket: [
      '.....oooo.....', '....oNNNNo....', '...oN....No...', '...oN....No...', 'ooooNooooNoooo',
      'ossssssssssssso', 'oNnNnNnNnNnNno', 'onNnNnNnNnNnNo', 'oNnNnNnNnNnNno', '.onNnNnNnNnNo.',
      '.oNnNnNnNnNno.', '..onNnNnNnNo..', '..oNNNNNNNNo..', '...oooooooo...'],
    bowl: [
      '......oo......', '.....onno.....', '....on..no....', '...onnnnnno...', '..onsssssssno.',
      '.ossyysyyssso.', 'ossyyssyysyyso', 'oNNNNNNNNNNNNo', 'oNnnnnnnnnnnNo', '.oNnnnnnnnnNo.',
      '.oNNnnnnnnNNo.', '..oNNNNNNNNo..', '...oNNNNNNo...', '....oooooo....'],
    hoe: [
      '...........oo.', '..........onno', '.........onno.', '........onno..', '.......onno...',
      '......onno....', '.....onno.....', '....onno......', 'ooooonno......', 'oggggnno......',
      'ogggggo.......', 'oggggo........', 'ooooo.........', '..............'],
    hammer: [
      '.....ooooooo..', '....oWWWWWWWo.', '....oWmmmmmWo.', '....oWmmmmmWo.', '....oggmmmgoo.',
      '.....oonnnoo..', '.......onNo...', '.......onNo...', '.......onNo...', '.......onNo...',
      '.......onNo...', '.......onNo...', '.......onNo...', '........oo....'],
    magnify: [
      '...ooooo......', '..obbbbbo.....', '.obwwbbbbo....', 'obwbbbbbbbo...', 'obbbbbbbbbo...',
      'obbbbbbbbbo...', 'obbbbbbbbbo...', '.obbbbbbbo....', '..obbbbboo....', '...oooooono...',
      '........onno..', '.........onno.', '..........onno', '...........oo.'],
  };
  const TOOL_PAL = Object.assign({}, IP, { S: '#c9b8a4', N: '#7a5230', n: '#c9924f', s: '#f2e2c8', W: '#d8dde6', m: '#a8adb8' });
  function toolIconSprite(name, scale) {
    const key = 'tool_' + name + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const rows = TOOL_ICONS[name] || TOOL_ICONS.hand;
    const k = scale || 1;
    const c = newCanvas(14 * k, 14 * k);
    drawGrid(c.getContext('2d'), rows, TOOL_PAL, 0, 0, k);
    cache.set(key, c);
    return c;
  }

  /* produce: a 10x10 tile per crop's harvest */
  function produceSprite(id, scale) {
    const key = 'prod_' + id + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const P = (typeof PRODUCE !== 'undefined' && PRODUCE[id]) || { col: '#c9a35f' };
    const k = scale || 1;
    const c = newCanvas(10 * k, 10 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const col = P.col, lit = lighten(col, 0.4), dk = darken(col, 0.35), O = '#2e2216';
    if (id === 'wheat' || id === 'rice' || id === 'sunseeds') {
      /* a sheaf */
      for (let i = 0; i < 4; i++) { R(2 + i * 2, 4 - (i % 2), 1, 6, dk); R(1 + i * 2, 1 + (i % 2), 3, 3, col); R(2 + i * 2, 1 + (i % 2), 1, 1, lit); }
      R(1, 7, 8, 1, '#8a5e2a');
    } else if (id === 'corn') {
      R(3, 0, 4, 9, O); R(4, 1, 2, 7, col); R(4, 1, 1, 7, lit); R(2, 3, 2, 6, '#6ab04c'); R(6, 4, 2, 5, '#6ab04c'); R(4, 3, 2, 1, dk); R(4, 5, 2, 1, dk);
    } else if (id === 'carrots' || id === 'chilis') {
      R(4, 0, 2, 2, '#6ab04c'); R(3, 0, 1, 1, '#8fd14f'); R(3, 2, 4, 6, O); R(4, 3, 2, 4, col); R(4, 3, 1, 4, lit); R(4, 7, 2, 2, O); R(4, 8, 1, 1, dk);
    } else if (id === 'berries' || id === 'strawberries') {
      [[2, 3], [5, 2], [4, 6], [7, 5]].forEach(([x, y]) => { R(x, y, 3, 3, O); R(x + 1, y + 1, 1, 1, col); R(x + 1, y, 1, 1, lit); });
      R(4, 1, 2, 1, '#6ab04c');
    } else {
      /* round things: tomato, cabbage, melon, pumpkin, potatoes */
      R(2, 2, 6, 6, O); R(1, 3, 8, 4, O); R(3, 1, 4, 8, O);
      R(3, 2, 4, 6, col); R(2, 3, 6, 4, col); R(3, 2, 2, 1, lit); R(2, 3, 1, 2, lit); R(3, 7, 4, 1, dk); R(7, 4, 1, 3, dk);
      if (id === 'melon') { R(4, 2, 1, 6, '#8fd14f'); R(6, 3, 1, 4, '#8fd14f'); }
      if (id === 'pumpkin') { R(5, 2, 1, 6, dk); R(4, 0, 2, 2, '#5e3d18'); }
      if (id === 'tomato') { R(4, 1, 2, 1, '#6ab04c'); }
      if (id === 'cabbage') { R(4, 4, 2, 2, '#e0f8c0'); }
    }
    cache.set(key, c);
    return c;
  }
  /* goods: jars, bags, boxes, a pie */
  function goodsSprite(id, scale) {
    const key = 'goods_' + id + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const G = (typeof GOODS !== 'undefined' && GOODS[id]) || { col: '#c9a35f' };
    const k = scale || 1;
    const c = newCanvas(10 * k, 10 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const col = G.col, O = '#2e2216';
    if (id === 'jam' || id === 'hotsauce' || id === 'juice') {
      R(3, 0, 4, 2, O); R(4, 0, 2, 1, '#c9a35f'); R(2, 2, 6, 8, O); R(3, 3, 4, 6, col); R(3, 3, 1, 6, lighten(col, 0.4)); R(3, 5, 4, 2, '#fff8ec'); R(4, 6, 2, 1, darken(col, 0.4));
    } else if (id === 'flour' || id === 'superfeed' || id === 'ricecake') {
      R(2, 1, 6, 9, O); R(3, 2, 4, 7, col); R(3, 2, 1, 7, lighten(col, 0.2)); R(3, 1, 4, 1, '#8a5e2a'); R(4, 4, 2, 2, id === 'superfeed' ? '#e8542f' : '#3fa7d6');
    } else if (id === 'pie') {
      R(1, 4, 8, 5, O); R(2, 5, 6, 3, '#e0bd82'); R(2, 2, 6, 3, O); R(3, 3, 4, 2, col); R(3, 3, 1, 1, lighten(col, 0.4)); R(4, 1, 2, 1, 'rgba(255,255,255,.7)');
    } else if (id === 'slaw') {
      R(1, 4, 8, 5, O); R(2, 5, 6, 3, '#fff8ec'); R(2, 3, 6, 2, col); R(3, 2, 4, 1, col); R(4, 3, 1, 1, '#f0872f');
    } else {
      R(1, 2, 8, 8, O); R(2, 3, 6, 6, col); R(2, 3, 6, 1, lighten(col, 0.4)); R(3, 5, 4, 2, '#e8542f'); R(4, 5, 2, 1, '#fff8ec');
    }
    cache.set(key, c);
    return c;
  }
  /* the present the limousine leaves: a box, a ribbon and a bow */
  function presentSprite(scale, col1, col2, open) {
    const c1 = col1 || '#e8542f', c2 = col2 || '#ffd23f';
    const key = 'gift_' + scale + c1 + c2 + (open ? 'o' : '');
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(14 * k, 14 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const O = '#2e2216';
    R(1, 5, 12, 9, O); R(2, 6, 10, 7, c1); R(2, 6, 10, 1, lighten(c1, 0.35)); R(2, 12, 10, 1, darken(c1, 0.3));
    R(6, 6, 2, 7, c2); R(2, 9, 10, 1, c2);
    if (open) { R(1, 4, 12, 2, O); R(2, 4, 10, 1, darken(c1, 0.3)); R(4, 1, 6, 3, 'rgba(255,255,255,.5)'); }
    else { R(1, 3, 12, 3, O); R(2, 4, 10, 1, lighten(c1, 0.2)); R(6, 4, 2, 1, c2); R(3, 0, 8, 4, O); R(4, 1, 2, 2, c2); R(8, 1, 2, 2, c2); R(6, 2, 2, 1, darken(c2, 0.3)); }
    cache.set(key, c);
    return c;
  }
  /* ============================================================
     THE DELIVERY DRONE
     The company car does not come up the farm track any more; the
     rewards come in by air. A four-rotor drone in the company's
     paint with a beacon on the nose, a hook under the belly and the
     parcel slung off it. Three rotor frames, so it can hover, and a
     parachute for when it lets go.
     ============================================================ */
  function droneSprite(frame, scale, col1, col2) {
    const c1 = col1 || '#e8542f', c2 = col2 || '#ffd23f';
    const key = 'drone_' + frame + '_' + scale + c1 + c2;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(30 * k, 16 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { if (!col) return; ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const O = '#17141d', steel = '#8f9298', dark = '#4a5058';
    /* the boom, arm to arm */
    R(2, 6, 26, 3, O); R(3, 7, 24, 1, steel);
    /* four motor pods */
    [2, 8, 20, 26].forEach(x => { R(x, 4, 3, 4, O); R(x, 5, 2, 2, dark); });
    /* the rotors: a blurred disc that flips through three frames */
    const f = frame % 3;
    [3, 9, 21, 27].forEach((x, i) => {
      const ph = (f + i) % 3;
      const w = ph === 0 ? 11 : ph === 1 ? 7 : 9;
      R(x - Math.floor(w / 2), 3, w, 1, 'rgba(200,206,214,.75)');
      R(x - Math.floor(w / 2) + 1, 2, w - 2, 1, 'rgba(200,206,214,.32)');
    });
    /* the body pod, in the company paint */
    R(10, 5, 10, 7, O);
    R(11, 6, 8, 5, c1);
    R(11, 6, 8, 1, lighten(c1, 0.34));
    R(11, 10, 8, 1, darken(c1, 0.32));
    R(12, 8, 6, 1, c2);
    /* a lit beacon on the nose, and a camera eye under it */
    R(19, 6, 2, 2, O); R(19, 6, 1, 1, frame % 2 ? '#ff5f5f' : '#7a2020');
    R(14, 11, 3, 2, O); R(15, 11, 1, 1, '#7fd7ff');
    /* skids and the hook */
    R(9, 12, 3, 1, dark); R(18, 12, 3, 1, dark);
    R(14, 13, 2, 2, O); R(14, 13, 1, 1, steel);
    cache.set(key, c);
    return c;
  }
  /* the chute the parcel comes down on */
  function chuteSprite(scale, col1, col2) {
    const c1 = col1 || '#e8542f', c2 = col2 || '#fff8ec';
    const key = 'chute_' + scale + c1 + c2;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(22 * k, 16 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const O = '#2e2216';
    /* a dome in four gores, alternating the two colours */
    R(6, 0, 10, 1, O); R(3, 1, 16, 1, O); R(1, 2, 20, 1, O); R(0, 3, 22, 4, O);
    for (let i = 0; i < 4; i++) {
      const x = 1 + i * 5, col = i % 2 ? c2 : c1;
      R(x, 3, 5, 3, col);
      if (i === 1 || i === 2) R(x, 1, 5, 2, col);
    }
    R(6, 1, 10, 1, c2);
    /* the rigging */
    R(1, 7, 1, 4, O); R(20, 7, 1, 4, O); R(7, 7, 1, 5, O); R(14, 7, 1, 5, O);
    cache.set(key, c);
    return c;
  }

  /* HELP WANTED, pinned to a post */
  function posterSprite(scale) {
    const key = 'poster_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(12 * k, 18 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    R(5, 10, 2, 8, '#5e3d18'); R(5, 10, 1, 8, '#8a5e2a');
    R(0, 0, 12, 11, '#2e2216'); R(1, 1, 10, 9, '#fff8ec'); R(1, 1, 10, 1, '#ffffff');
    R(2, 3, 8, 1, '#e8542f'); R(2, 5, 6, 1, '#2e2216'); R(2, 7, 8, 1, '#2e2216'); R(9, 2, 1, 1, '#ffd23f');
    cache.set(key, c);
    return c;
  }
  /* a soft, dithered elliptical shadow under anything that stands */
  function shadowEll(ctx, cx, cy, rx, ry, alpha) {
    ctx.fillStyle = 'rgba(30,44,22,' + (alpha === undefined ? 0.26 : alpha) + ')';
    const RY = Math.max(1, ry);
    for (let dy = -RY; dy <= RY; dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (RY + 0.5)) ** 2)));
      if (half <= 0) continue;
      const y = Math.round(cy + dy);
      /* the outer pixel of every row is dithered so the rim melts into the grass */
      ctx.fillRect(Math.round(cx) - half + 1, y, half * 2 - 1, 1);
      if ((y + Math.round(cx)) % 2 === 0) { ctx.fillRect(Math.round(cx) - half, y, 1, 1); ctx.fillRect(Math.round(cx) + half, y, 1, 1); }
    }
  }
  /* the one progress bar everything wears: a dark frame, a pale trough, a
     fill with a lit top edge */
  function drawBar(ctx, x, y, w, f, col, opts) {
    const o = opts || {};
    const h = o.h || 4;
    ctx.fillStyle = o.frame || '#2e2216'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = o.trough || '#5a4a32'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const fw = Math.round((w - 2) * Math.max(0, Math.min(1, f)));
    if (fw > 0) {
      ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, fw, h - 2);
      if (h > 3) { ctx.fillStyle = lighten(col, 0.4); ctx.fillRect(x + 1, y + 1, fw, 1); }
    }
    if (o.tick !== undefined) { ctx.fillStyle = '#fff8ec'; ctx.fillRect(x + 1 + Math.round((w - 2) * o.tick), y, 1, h); }
  }

  /* ============================================================
     TERRAIN - what the landscaping tool paints
     ============================================================ */
  function pathSprite(kind, seed, mask, scale) {
    const key = 'path_' + kind + '_' + (seed % 8) + '_' + mask + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(16 * k, 16 * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(1700 + seed);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    if (kind === 'stone') {
      R(0, 0, 16, 16, '#8a8578');
      /* irregular flagstones with mortar between them */
      const cuts = [[0, 0, 9, 7], [10, 0, 6, 7], [0, 8, 6, 8], [7, 8, 9, 8]];
      cuts.forEach(([x, y, w, h], i) => {
        const tone = ['#c9c4b4', '#bdb8a8', '#d2cdbd', '#b5b0a0'][(i + seed) % 4];
        R(x + 1, y + 1, w - 2, h - 2, tone);
        R(x + 1, y + 1, w - 2, 1, lighten(tone, 0.22));
        R(x + 1, y + h - 2, w - 2, 1, darken(tone, 0.18));
      });
      for (let i = 0; i < 5; i++) R(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1, 'rgba(60,55,45,.25)');
    } else {
      R(0, 0, 16, 16, '#b58a4f');
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16);
        R(x, y, 1, 1, rnd() < 0.5 ? '#c69a5c' : '#a87c42');
      }
      /* wheel ruts */
      R(3, 0, 1, 16, '#a07444'); R(11, 0, 1, 16, '#a07444');
      for (let i = 0; i < 5; i++) R(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 2, 1, '#d1a86b');
    }
    /* soften the sides that have no path neighbour so it reads as a trail */
    const edge = 'rgba(110,160,70,.55)';
    if (!(mask & 1)) for (let x = 0; x < 16; x++) if ((x + seed) % 3) R(x, 0, 1, 1, edge);      /* north */
    if (!(mask & 2)) for (let y = 0; y < 16; y++) if ((y + seed) % 3) R(15, y, 1, 1, edge);     /* east  */
    if (!(mask & 4)) for (let x = 0; x < 16; x++) if ((x + seed + 1) % 3) R(x, 15, 1, 1, edge); /* south */
    if (!(mask & 8)) for (let y = 0; y < 16; y++) if ((y + seed + 1) % 3) R(0, y, 1, 1, edge);  /* west  */
    cache.set(key, c);
    return c;
  }

  /* a raised terrace: bright grass on top, a soil cliff on any open side */
  function terraceSprite(seed, mask, scale) {
    const key = 'terr_' + (seed % 8) + '_' + mask + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(16 * k, 22 * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(2300 + seed);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const LIFT = 6;
    /* cliff face below, only where the tile is exposed: banked earth with
       stones in it and roots trailing down, lit from the upper left */
    if (!(mask & 4)) {
      const top = 16 - LIFT + 10;
      R(0, top, 16, LIFT, '#93672f');
      /* mottled earth: irregular clods, never a regular stripe */
      for (let i = 0; i < 30; i++) {
        const bx = Math.floor(rnd() * 16), by = top + Math.floor(rnd() * LIFT);
        const w2 = 1 + Math.floor(rnd() * 3), h2 = 1 + (rnd() < 0.3 ? 1 : 0);
        R(bx, by, w2, h2, rnd() < 0.5 ? '#a8783f' : '#7d5626');
      }
      R(0, top, 16, 1, '#b98a52');
      /* pebbles poking out of the bank */
      for (let i = 0; i < 5; i++) {
        const px2 = Math.floor(rnd() * 14), py2 = top + 1 + Math.floor(rnd() * (LIFT - 2));
        R(px2, py2, 2, 1, '#b0a89a'); R(px2, py2, 1, 1, '#d0c8ba');
      }
      /* roots hanging from the lip */
      for (let x = 1; x < 16; x += 3) if ((x + seed) % 2) R(x, top + 1, 1, 1 + ((x + seed) % 2), '#5b9636');
      R(0, 21, 16, 1, '#5e3d18');
    }
    /* grassy top, lifted */
    R(0, 10 - LIFT, 16, 12, '#7fc44f');
    R(0, 10 - LIFT, 16, 2, '#9ada66');
    for (let i = 0; i < 22; i++) R(Math.floor(rnd() * 16), 10 - LIFT + Math.floor(rnd() * 12), 1, 1, rnd() < 0.5 ? '#6ab04c' : '#8ecf5b');
    /* soften the outer corners so a terrace reads as a bank, not a box */
    const corner = (cx, cy, sx, sy) => {
      ctx.clearRect((cx) * k, (cy) * k, k, k);
      ctx.clearRect((cx + sx) * k, (cy) * k, k, k);
      ctx.clearRect((cx) * k, (cy + sy) * k, k, k);
    };
    if (!(mask & 1) && !(mask & 8)) corner(0, 10 - LIFT, 1, 1);
    if (!(mask & 1) && !(mask & 2)) corner(15, 10 - LIFT, -1, 1);
    /* lit rim on the exposed north edge */
    if (!(mask & 1)) R(0, 10 - LIFT, 16, 1, '#b8e986');
    /* grassy overhang lip where the cliff shows, with tufts hanging over */
    if (!(mask & 4)) {
      R(0, 24 - LIFT, 16, 1, '#5b9636'); R(0, 25 - LIFT, 16, 1, '#4a7d2c');
      for (let i = 0; i < 16; i += 2) if ((i + seed) % 3) R(i, 26 - LIFT, 1, 1, '#5b9636');
    }
    /* side shading */
    if (!(mask & 8)) R(0, 10 - LIFT, 1, 12, '#6ab04c');
    if (!(mask & 2)) R(15, 10 - LIFT, 1, 12, '#5b9636');
    cache.set(key, c);
    return c;
  }

  /* a dug pond tile: deeper in the middle, sandy where the bank shows */
  function waterSprite(seed, mask, scale) {
    const key = 'water_' + (seed % 8) + '_' + mask + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(16 * k, 16 * k);
    const ctx = c.getContext('2d');
    const rnd = mulberry(3100 + seed);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const open = (mask & 15) === 15;
    R(0, 0, 16, 16, open ? '#2f86ad' : '#3f9ec4');
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rnd() * 16), y = Math.floor(rnd() * 16);
      R(x, y, 1, 1, rnd() < 0.5 ? '#4fb0d6' : '#2a7ba0');
    }
    /* An undulating shore rather than a ruled line: the depth of the sand
       wanders along each open side, and the corners are bitten right back,
       so a block of dug tiles reads as one pond. */
    const sand = '#e0cb98', sand2 = '#d6bd88';
    const wob = (i, salt) => 2 + ((i * 7 + seed * 3 + salt) % 5 === 0 ? 2 : (i * 5 + seed + salt) % 3 === 0 ? 1 : 0);
    const clearTo = (x, y, w, h) => ctx.clearRect(x * k, y * k, w * k, h * k);
    if (!(mask & 1)) for (let x = 0; x < 16; x++) { const d = wob(x, 1); clearTo(x, 0, 1, d - 2); R(x, d - 2, 1, 2, sand); R(x, d, 1, 1, sand2); }
    if (!(mask & 4)) for (let x = 0; x < 16; x++) { const d = wob(x, 2); clearTo(x, 16 - (d - 2), 1, d - 2); R(x, 16 - d, 1, 2, sand); R(x, 15 - d, 1, 1, sand2); }
    if (!(mask & 8)) for (let y = 0; y < 16; y++) { const d = wob(y, 3); clearTo(0, y, d - 2, 1); R(d - 2, y, 2, 1, sand); R(d, y, 1, 1, sand2); }
    if (!(mask & 2)) for (let y = 0; y < 16; y++) { const d = wob(y, 4); clearTo(16 - (d - 2), y, d - 2, 1); R(16 - d, y, 2, 1, sand); R(15 - d, y, 1, 1, sand2); }
    /* corners: take a big round bite so the pond has no square shoulders */
    const bite = (cx, cy, sx, sy) => {
      const rr2 = 8;
      for (let dy = 0; dy < rr2; dy++) for (let dx = 0; dx < rr2; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > rr2) continue;
        const x = cx + sx * dx, y = cy + sy * dy;
        if (d < rr2 - 3) clearTo(x, y, 1, 1);
        else { ctx.fillStyle = d < rr2 - 1.6 ? sand : sand2; ctx.fillRect(x * k, y * k, k, k); }
      }
    };
    if (!(mask & 1) && !(mask & 8)) bite(0, 0, 1, 1);
    if (!(mask & 1) && !(mask & 2)) bite(15, 0, -1, 1);
    if (!(mask & 4) && !(mask & 8)) bite(0, 15, 1, -1);
    if (!(mask & 4) && !(mask & 2)) bite(15, 15, -1, -1);
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     HAND-DRAWN MAP - wobbly ink on old paper, for the HQ wall
     ============================================================ */
  function inkLine(ctx, x1, y1, x2, y2, col, wob, seed, dash) {
    const rnd = mulberry(seed || 7);
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    let phase = 0;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      if (dash) { phase++; if (phase % (dash * 2) >= dash) continue; }
      const jitter = wob ? Math.round((rnd() - 0.5) * wob * 2) : 0;
      const jx = Math.round(x1 + (x2 - x1) * t), jy = Math.round(y1 + (y2 - y1) * t);
      ctx.fillStyle = col;
      ctx.fillRect(jx, jy + jitter, 1, 1);
      if (rnd() < 0.25) ctx.fillRect(jx, jy + jitter + 1, 1, 1);
    }
  }
  function parchment(ctx, x, y, w, h, seed) {
    const rnd = mulberry(seed || 11);
    ctx.fillStyle = '#e8d9ae'; ctx.fillRect(x, y, w, h);
    /* fibres and blotches */
    for (let i = 0; i < w * h / 22; i++) {
      const px2 = x + Math.floor(rnd() * w), py2 = y + Math.floor(rnd() * h);
      ctx.fillStyle = rnd() < 0.5 ? '#dfceA0'.replace('A', 'a') : '#efe0bc';
      ctx.fillRect(px2, py2, 1 + (rnd() < 0.2 ? 1 : 0), 1);
    }
    for (let i = 0; i < 7; i++) {
      const bx = x + Math.floor(rnd() * w), by = y + Math.floor(rnd() * h), br = 2 + Math.floor(rnd() * 4);
      ctx.fillStyle = 'rgba(180,150,100,.16)';
      ctx.fillRect(bx, by, br, br);
    }
    /* browned edges */
    ctx.fillStyle = 'rgba(150,115,65,.30)';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillStyle = 'rgba(150,115,65,.16)';
    ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  }
  function compassRose(ctx, cx, cy, r, ink) {
    for (let i = -r; i <= r; i++) {
      ctx.fillStyle = ink;
      ctx.fillRect(cx + i, cy, 1, 1);
      ctx.fillRect(cx, cy + i, 1, 1);
    }
    ctx.fillRect(cx - 1, cy - r - 1, 3, 1);
    ctx.fillRect(cx - 2, cy - r + 1, 5, 1);
    for (let i = 0; i < 4; i++) {
      const d = Math.round(r * 0.55);
      ctx.fillRect(cx + (i % 2 ? d : -d), cy + (i < 2 ? -d : d), 1, 1);
    }
    ctx.fillStyle = ink;
    ctx.fillRect(cx - 1, cy - r - 5, 1, 3); ctx.fillRect(cx, cy - r - 4, 1, 1); ctx.fillRect(cx + 1, cy - r - 5, 1, 3);
  }

  /* ============================================================
     FOSSILS AND FOOD - a bone in the dirt, and what the Kitchen
     puts on a plate
     ============================================================ */
  function fossilSprite(seed, scale) {
    const key = 'fossil_' + (seed % 3) + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(9 * k, 7 * k);
    const ctx = c.getContext('2d');
    const rows = (seed % 3) === 2 ? [
      '.ooooooo.', 'owwwwwwwo', 'owoowoowo', 'owwwwwwwo', '.owwowwo.', '.oo.o.oo.', '.........'] : [
      '.oo...oo.', 'owwo.owwo', '.owwwwwo.', '..owwwo..', '.owwwwwo.', 'owwo.owwo', '.oo...oo.'];
    drawGrid(ctx, rows, { o: '#5e4a2a', w: '#f2e8d0' }, 0, 0, k);
    px(ctx, 4, 3, k, '#d9c9a8');
    cache.set(key, c);
    return c;
  }
  function dishSprite(id, scale) {
    const key = 'dish_' + id + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(10 * k, 7 * k);
    const ctx = c.getContext('2d');
    /* the plate */
    ctx.fillStyle = '#2e2216'; ctx.fillRect(0, 4 * k, 10 * k, 3 * k);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(k, 5 * k, 8 * k, k);
    ctx.fillStyle = '#c9c0a8'; ctx.fillRect(2 * k, 6 * k, 6 * k, k);
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    if (id === 'omelette') { R(2, 2, 6, 3, '#f2c94c'); R(2, 2, 6, 1, '#ffe27a'); R(4, 3, 2, 1, '#e8a52f'); }
    else if (id === 'scotch') { R(3, 1, 4, 4, '#a8703a'); R(3, 1, 4, 1, '#c9924f'); R(4, 2, 2, 2, '#ffd23f'); }
    else if (id === 'cake') { R(2, 3, 6, 2, '#c9924f'); R(2, 1, 6, 2, '#ff8ab5'); R(3, 0, 4, 1, '#fff8ec'); R(4, 0, 1, 1, '#e8542f'); }
    else { R(1, 2, 6, 3, '#b8843f'); R(1, 2, 6, 1, '#d9a066'); R(6, 1, 3, 2, '#fff8ec'); R(7, 3, 1, 1, '#fff8ec'); if (id === 'dino') { R(0, 1, 2, 2, '#b8843f'); R(2, 1, 4, 1, '#d9a066'); } }
    cache.set(key, c);
    return c;
  }

  return {
    chickenSprite, eggSprite, nestSprite, mamaSprite, decoSprite,
    cloudBubble, fossilSprite, dishSprite,
    uiSprite, iconSprite, basketSprite, feedbagSprite, hammerSprite, staffSprite,
    personSprite, faceSprite, flyerSprite,
    soilSprite, cropSprite, chickSprite, vehicleSprite, skylineSprite, cursorSprite,
    pathSprite, terraceSprite, waterSprite, inkLine, parchment, compassRose, botSprite,
    plumeSprite, signSprite, treeSprite, eggCrackSprite, shellHalfSprite,
    billboardSprite, billboardPreset, blankArt, townSprite, shelterSprite,
    BILL_W, BILL_H, BILL_CH: CH,
    drawText, textW, drawTiny, tinyW, drawTitle,
    drawBezel, drawScanlines, drawPips, drawBox, TERM, drawHex, hexHit, hexRows, drawCube,
    carSprite, raccoonSprite, furnitureSprite, RAC_OFF, outfitOf,
    toolIconSprite, produceSprite, goodsSprite, presentSprite, posterSprite, shadowEll, drawBar,
    droneSprite, chuteSprite,
    wardenSprite, WARD_OFF,
    newMask, mRect, mCircle, renderMask, mulberry, newCanvas,
    darken, lighten, warm, cool, lum, px, CELL, ICONS,
  };
})();

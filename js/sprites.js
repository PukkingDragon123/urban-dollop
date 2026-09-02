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
     ============================================================ */
  const FONT = {
    A: ['###', '# #', '###', '# #', '# #'],
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
    M: ['# #', '###', '###', '# #', '# #'],
    N: ['## ', '# #', '# #', '# #', '# #'],
    O: [' # ', '# #', '# #', '# #', ' # '],
    P: ['## ', '# #', '## ', '#  ', '#  '],
    Q: [' # ', '# #', '# #', ' # ', '  #'],
    R: ['## ', '# #', '## ', '# #', '# #'],
    S: [' ##', '#  ', ' # ', '  #', '## '],
    T: ['###', ' # ', ' # ', ' # ', ' # '],
    U: ['# #', '# #', '# #', '# #', ' ##'],
    V: ['# #', '# #', '# #', '# #', ' # '],
    W: ['# #', '# #', '###', '###', '# #'],
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
    ' ': ['   ', '   ', '   ', '   ', '   '],
  };
  function tinyW(str, k) { k = k || 1; return str.length * 4 * k - k; }
  function drawTiny(ctx, str, x, y, col, k, shadow) {
    k = k || 1;
    str = String(str).toUpperCase();
    if (shadow) {
      ctx.fillStyle = shadow;
      for (let i = 0; i < str.length; i++) {
        const g = FONT[str[i]]; if (!g) continue;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
          if (g[r][c] === '#') ctx.fillRect(x + (i * 4 + c) * k, y + (r + 1) * k, k, k);
      }
    }
    ctx.fillStyle = col;
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]]; if (!g) continue;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
        if (g[r][c] === '#') ctx.fillRect(x + (i * 4 + c) * k, y + r * k, k, k);
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
    W: ['#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
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
      default: return tuftSprite(seed, k);
    }
  }

  /* ============================================================
     CHICKENS
     ============================================================ */
  const SHAPES = {
    chick: {
      rows: [
        '................',
        '................',
        '.....OOOOOO.....',
        '...OOBBBBBBOO...',
        '..OBBBBBBBBBBO..',
        '..OBBBBBBBBBBO..',
        '.OBBBBBBBBBBBBO.',
        '.OBBBBBBBBBBBBO.',
        '.OBBBBBBBBBBBBO.',
        '.OBBBLLLLLLBBBO.',
        '.OWBBLLLLLLBBWO.',
        '..OWBLLLLLLBWO..',
        '..OBBLLLLLLBBO..',
        '...OBBBBBBBBO...',
        '....OOOOOOOO....',
        '.....F....F.....',
      ],
      eyeL: [4, 6], eyeR: [10, 6], beak: [7, 8], blushY: 8, blushL: 2, blushR: 12,
      headTop: [8, 2], bellyC: [8, 10], wattle: false, wing: [3, 9],
    },
    hen: {
      rows: [
        '......C.C.......',
        '.....CCCCC......',
        '.....OOOOO...T..',
        '...OOBBBBBOO.TT.',
        '..OBBBBBBBBBOTT.',
        '..OBBBBBBBBBBOT.',
        '.OBBBBBBBBBBBBO.',
        '.OBBBBBBBBBBBBO.',
        '.OBBBBBBBBBBBBO.',
        '.OBBBLLLLLLBBBO.',
        '.OWBBLLLLLLBBWO.',
        '..OWBLLLLLLBWO..',
        '..OBBLLLLLLBBO..',
        '...OBBBBBBBBO...',
        '....OOOOOOOO....',
        '....F......F....',
      ],
      eyeL: [4, 6], eyeR: [10, 6], beak: [7, 8], blushY: 8, blushL: 2, blushR: 12,
      headTop: [8, 2], bellyC: [8, 10], wattle: true, wing: [3, 9],
    },
    fluff: {
      rows: [
        '......U.U.......',
        '.......U........',
        '.....OOOOO......',
        '...OOBBBBBOO....',
        '..OBBBBBBBBBO...',
        '.OBBBBBBBBBBBO..',
        'OBBBBBBBBBBBBBO.',
        'OBBBBBBBBBBBBBO.',
        '.OBBBBBBBBBBBO..',
        'OBBBBLLLLLLBBBO.',
        'OBWBLLLLLLLLBWO.',
        '.OBBLLLLLLLLBO..',
        'OBBBLLLLLLLLBBO.',
        '.OBBBBBBBBBBBO..',
        '..OOOBBBBBOOO...',
        '.....F...F......',
      ],
      eyeL: [4, 6], eyeR: [10, 6], beak: [7, 8], blushY: 8, blushL: 2, blushR: 12,
      headTop: [8, 2], bellyC: [8, 11], wattle: false, wing: [2, 10],
    },
    tall: {
      rows: [
        '.......UU.......',
        '.....OOOOO......',
        '....OBBBBBO.....',
        '...OBBBBBBBO....',
        '...OBBBBBBBO....',
        '..OBBBBBBBBBO...',
        '..OBBBBBBBBBO...',
        '..OBBBBBBBBBO...',
        '..OBBBBBBBBBO...',
        '..OBBLLLLLBBO...',
        '..OWBLLLLLBWO...',
        '..OBBLLLLLBBO...',
        '...OBLLLLLBO....',
        '...OBBBBBBBO....',
        '....OOOOOOO.....',
        '.....F...F......',
      ],
      eyeL: [4, 5], eyeR: [9, 5], beak: [7, 7], blushY: 7, blushL: 3, blushR: 11,
      headTop: [7, 1], bellyC: [7, 11], wattle: false, wing: [2, 10],
    },
  };

  const MAMA_ROWS = [
    '..........C.C.C...........',
    '..........CCCCC...........',
    '..........OOOOO...........',
    '........OOBBBBBOO.........',
    '.......OBBBBBBBBBO........',
    '......OBBBBBBBBBBBO.......',
    '......OBBBBBBBBBBBO.......',
    '.....OBBBBBBBBBBBBBO......',
    '....OBBBBBBBBBBBBBBBO.....',
    '....OBBBBBBBBBBBBBBBO.....',
    '...OBBBBBBBBBBBBBBBBBO....',
    '...OBBBBBBBBBBBBBBBBBO....',
    '..OBBBBBBBBBBBBBBBBBBBO...',
    '..OBWWBBBBLLLLLLBBBWWBO...',
    '..OBWWWBBLLLLLLLLBWWWBO...',
    '..OBBWWBBLLLLLLLLBWWBBO...',
    '..OBBBBBBLLLLLLLLBBBBBO...',
    '...OBBBBBBLLLLLLBBBBBO....',
    '....OBBBBBBBBBBBBBBBO.....',
    '.....OOBBBBBBBBBBOO.......',
    '.......OOOOOOOOOO.........',
  ];
  const MAMA = {
    rows: MAMA_ROWS, eyeL: [9, 7], eyeR: [14, 7], beak: [12, 9], blushY: 9,
    blushL: 6, blushR: 17, headTop: [12, 2], wattle: true, w: 26, h: 21,
  };
  const MAMA_TIER = [
    ['#f7f0e0', '#e8542f'], ['#bfe6a8', '#e8542f'], ['#a8d8f0', '#e8542f'],
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

  const CELL = 20, OFF_X = 2, OFF_Y = 4;

  function paletteFor(sp) {
    const body = sp.body;
    const dark = lum(body) < 0.22 ? '#14141c' : darken(body, 0.5);
    return {
      O: dark, B: body, L: lighten(body, 0.42), W: darken(body, 0.16),
      C: '#e8542f', U: sp.accent, T: sp.accent, F: '#f2a03f',
    };
  }

  /* volume pass: light from upper-left, shade lower-right, plus rim */
  function shadeBody(ctx, rows, ox, oy, k, body) {
    const isB = (x, y) => rows[y] && (rows[y][x] === 'B' || rows[y][x] === 'L' || rows[y][x] === 'W');
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

    /* wing crease */
    const [wx, wy] = shape.wing;
    px(ctx, OFF_X + wx, OFF_Y + wy, k, darken(sp.body, 0.3));
    px(ctx, OFF_X + wx, OFF_Y + wy + 1, k, darken(sp.body, 0.42));
    px(ctx, OFF_X + 15 - wx, OFF_Y + wy, k, darken(sp.body, 0.3));
    px(ctx, OFF_X + 15 - wx, OFF_Y + wy + 1, k, darken(sp.body, 0.42));

    /* face */
    const exL = OFF_X + shape.eyeL[0], eyL = OFF_Y + shape.eyeL[1];
    const exR = OFF_X + shape.eyeR[0], eyR = OFF_Y + shape.eyeR[1];
    const eyeCol = lum(sp.body) < 0.22 ? '#f5f0ff' : EYE;
    drawEyes(ctx, sp.eyes, exL, eyL, k, eyeCol, true);
    drawEyes(ctx, sp.eyes, exR, eyR, k, eyeCol, true);
    /* beak with 2 tones + shadow */
    px(ctx, OFF_X + shape.beak[0], OFF_Y + shape.beak[1], k, '#ffc14f');
    px(ctx, OFF_X + shape.beak[0] + 1, OFF_Y + shape.beak[1], k, '#e0862f');
    px(ctx, OFF_X + shape.beak[0], OFF_Y + shape.beak[1] + 1, k, shape.wattle ? '#e8542f' : '#c96a20');
    /* blush */
    ctx.globalAlpha = 0.75;
    px(ctx, OFF_X + shape.blushL, OFF_Y + shape.blushY, k, BLUSH);
    px(ctx, OFF_X + shape.blushR, OFF_Y + shape.blushY, k, BLUSH);
    ctx.globalAlpha = 1;
    /* feet shading */
    for (let x = 0; x < 16; x++) {
      if (shape.rows[15] && shape.rows[15][x] === 'F') {
        px(ctx, OFF_X + x, OFF_Y + 15, k, '#e0862f');
      }
    }

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
    const key = 'mama' + tier + '_' + scale + '_' + mood;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = newCanvas(30 * k, 26 * k);
    const ctx = c.getContext('2d');
    const [body, comb] = MAMA_TIER[tier];
    const ox = 2, oy = 4;
    drawGrid(ctx, MAMA.rows, {
      O: darken(body, 0.48), B: body, L: lighten(body, 0.4),
      W: darken(body, 0.16), C: comb, T: darken(body, 0.28),
    }, ox * k, oy * k, k);
    shadeBody(ctx, MAMA.rows, ox, oy, k, body);

    if (tier === 6) [[7, 11], [15, 13], [11, 16], [17, 9]].forEach(([x, y]) => px(ctx, ox + x, oy + y, k, '#ffd23f'));
    else if (tier === 7) [[6, 11], [16, 10], [12, 17]].forEach(([x, y]) => px(ctx, ox + x, oy + y, k, '#ffffff'));

    const exL = ox + MAMA.eyeL[0], eyL = oy + MAMA.eyeL[1];
    const exR = ox + MAMA.eyeR[0], eyR = oy + MAMA.eyeR[1];
    if (mood === 'happy') { drawEyes(ctx, 'happy', exL, eyL, k); drawEyes(ctx, 'happy', exR, eyR, k); }
    else if (mood === 'blink') { drawEyes(ctx, 'sleepy', exL, eyL, k); drawEyes(ctx, 'sleepy', exR, eyR, k); }
    else { drawEyes(ctx, 'round', exL, eyL, k, null, true); drawEyes(ctx, 'round', exR, eyR, k, null, true); }
    px(ctx, ox + MAMA.beak[0], oy + MAMA.beak[1], k, '#ffc14f');
    px(ctx, ox + MAMA.beak[0] + 1, oy + MAMA.beak[1], k, '#e0862f');
    px(ctx, ox + MAMA.beak[0], oy + MAMA.beak[1] + 1, k, comb);
    px(ctx, ox + MAMA.beak[0] + 1, oy + MAMA.beak[1] + 1, k, darken(comb, 0.2));
    ctx.globalAlpha = 0.75;
    px(ctx, ox + MAMA.blushL, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushL + 1, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushR, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushR + 1, oy + MAMA.blushY, k, BLUSH);
    ctx.globalAlpha = 1;
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
    coin: [
      '..oooooo..', '.oyyyyyyo.', 'oyYyyyyYyo', 'oyywwwyyyo', 'oyywwwyyyo',
      'oyYyyyyYyo', 'oyyyyyyyyo', '.oyyyyyyo.', '..oooooo..', '..........'],
    feather: [
      '.......oo.', '......owwo', '.....owwwo', '....owwswo', '...owwswo.',
      '..owwswo..', '.owwswo...', '.owswo....', 'oowo......', 'oo........'],
    egg: [
      '...oooo...', '..owwsso..', '.owwwwsso.', 'owwwwwssso', 'owwwwwssso',
      'owwwwwssso', 'owwwwwssso', '.owwwwsso.', '..osssso..', '...oooo...'],
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
      '..o....o..', '.oNo..oNo.', 'oNNNooNNNo', 'oNnNooNnNo', 'ooooooooooo',
      'oNnNooNnNo', 'oNNNooNNNo', '.oNo..oNo.', '..o....o..', '..........'],
    person: [
      '...oooo...', '..oNNNNo..', '.oNNNNNNo.', '...osso...', '...oeso...',
      '..obbbbo..', '.obbbbbbo.', '..obbbbo..', '..ok..ko..', '..oo..oo..'],
    bot: [
      '....o.....', '...oyo....', '..oWWWWo..', '.oWbbbbWo.', '.oWWWWWWo.',
      'ooWWWWWWoo', 'oWWkWWkWWo', 'oWWWWWWWWo', '.okkookko.', '..........'],
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

  /* ---------- special ducks: quest-giving pond folk ---------- */
  function duckSprite(d, frame, scale) {
    const key = 'duck' + d.id + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(18 * k, 16 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const body = d.body, dark = darken(body, 0.26), lite = lighten(body, 0.34);
    const OUT = lum(body) < 0.3 ? '#14141c' : darken(body, 0.55);
    /* body mask for a plump duck */
    const m = newMask(18, 16);
    mCircle(m, 8, 10, 6, 0.72);
    mCircle(m, 12, 5, 3.4, 1);          /* head */
    mRect(m, 10, 6, 3, 3);              /* neck */
    renderMask(ctx, m, k, 0, 0, { base: body, light: lite, dark: dark, out: OUT }, d.id + 3,
      { lightBand: 2, shadeBand: 2 });
    /* head cap colour (mallard types) */
    if (d.head) {
      const hm = newMask(18, 16);
      mCircle(hm, 12, 4.4, 3.2, 1);
      renderMask(ctx, hm, k, 0, 0,
        { base: d.head, light: lighten(d.head, 0.3), dark: darken(d.head, 0.3), out: darken(d.head, 0.55) },
        d.id + 9, { lightBand: 1, shadeBand: 1 });
    }
    /* tail */
    R(2, 8, 2, 2, dark);
    R(1, 9, 2, 2, OUT);
    /* wing */
    R(6, 9, 5, 3, dark);
    R(6, 9, 5, 1, lite);
    /* bill */
    R(15, 5, 3, 2, d.bill);
    R(15, 6, 3, 1, darken(d.bill, 0.25));
    /* eye */
    R(13, 4, 1, 1, '#ffffff');
    R(13, 4, 1, 1, '#2e2216');
    R(12, 4, 1, 1, '#2e2216');
    /* feet paddling */
    const f = frame ? 1 : 0;
    R(7 + f, 15, 2, 1, '#f2a03f');
    R(10 - f, 15, 2, 1, '#e0862f');
    /* accessory */
    if (d.acc === 'monocle') {
      R(12, 3, 3, 1, '#ffd23f'); R(12, 5, 3, 1, '#ffd23f');
      R(11, 4, 1, 1, '#ffd23f'); R(15, 4, 1, 1, '#ffd23f');
    } else if (d.acc === 'cap') {
      R(10, 1, 6, 1, '#2f5f9e'); R(10, 2, 6, 1, '#3f7ec0'); R(15, 2, 3, 1, '#2f5f9e');
    } else if (d.acc === 'flower') {
      R(11, 1, 1, 1, '#ff8ab5'); R(13, 1, 1, 1, '#ff8ab5');
      R(12, 0, 1, 1, '#ff8ab5'); R(12, 2, 1, 1, '#ff8ab5'); R(12, 1, 1, 1, '#ffd23f');
    } else if (d.acc === 'scarf') {
      R(10, 7, 4, 2, '#e8542f'); R(9, 8, 2, 3, '#c43a2a');
    } else if (d.acc === 'glasses') {
      R(11, 3, 6, 1, '#3a3a4a'); R(11, 5, 6, 1, '#3a3a4a');
      R(11, 4, 1, 1, '#3a3a4a'); R(16, 4, 1, 1, '#3a3a4a'); R(14, 4, 1, 1, '#8fd6ff');
    } else if (d.acc === 'hat') {
      R(9, 2, 8, 1, '#7a5230'); R(11, 0, 4, 2, '#8a5e2a'); R(11, 1, 4, 1, '#a8783f');
    } else if (d.acc === 'star') {
      R(12, 0, 1, 1, '#ffd23f'); R(11, 1, 3, 1, '#ffd23f'); R(12, 2, 1, 1, '#ffd23f');
    }
    cache.set(key, c);
    return c;
  }

  /* ---------- staff: little walking workers ---------- */
  const STAFF_PAL = {
    hand:   { hat:'#e0bd82', hatDark:'#b89355', shirt:'#5fa8e8', shirtDark:'#2f5f9e',
              pants:'#6e4a20', boot:'#3a2a16', skin:'#f2c9a0' },
    feeder: { hat:'#c9a35f', hatDark:'#8a5e2a', shirt:'#7ac74f', shirtDark:'#3f7d32',
              pants:'#5e3d18', boot:'#3a2a16', skin:'#e8b98c' },
  };
  const BOT_PAL = {
    cull:  { shell:'#c9ced6', shade:'#8a9099', dark:'#3a3f47', visor:'#e8542f', glow:'#ff9f7a', trim:'#ffd23f' },
    match: { shell:'#f2d8e6', shade:'#d0a8c0', dark:'#5e3a4e', visor:'#ff5f9e', glow:'#ffb0d0', trim:'#fff2b0' },
  };

  function personSprite(type, frame, scale) {
    const key = 'staffp_' + type + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const P = STAFF_PAL[type] || STAFF_PAL.hand;
    const c = newCanvas(12 * k, 17 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2e2216';
    /* straw hat */
    R(3, 0, 6, 1, OUT); R(3, 1, 6, 2, P.hat);
    R(1, 3, 10, 1, OUT); R(1, 4, 10, 1, P.hat);
    R(2, 4, 8, 1, P.hatDark); R(3, 1, 6, 1, lighten(P.hat, 0.3));
    /* head */
    R(4, 5, 4, 3, P.skin);
    R(4, 5, 1, 3, darken(P.skin, 0.18));
    ctx.fillStyle = OUT; ctx.fillRect(5 * k, 6 * k, k, k); ctx.fillRect(7 * k, 6 * k, k, k);
    ctx.fillStyle = '#e8917a'; ctx.fillRect(4 * k, 7 * k, k, k);
    /* body + arms */
    R(3, 8, 6, 5, OUT);
    R(3, 8, 6, 4, P.shirt);
    R(3, 11, 6, 1, P.shirtDark);
    R(3, 8, 6, 1, lighten(P.shirt, 0.28));
    const swing = frame ? 1 : -1;
    R(2, 9 + (frame ? 0 : 1), 1, 3, P.shirt);
    R(9, 9 + (frame ? 1 : 0), 1, 3, P.shirt);
    R(2, 12 + (frame ? 0 : 1), 1, 1, P.skin);
    R(9, 12 + (frame ? 1 : 0), 1, 1, P.skin);
    /* legs, alternating */
    R(4, 13, 2, 2 + (frame ? 1 : 0), P.pants);
    R(7, 13, 2, 2 + (frame ? 0 : 1), P.pants);
    R(3 + (frame ? 0 : 1), 15 + (frame ? 1 : 0), 3, 2, P.boot);
    R(7, 15 + (frame ? 0 : 1), 3, 2, P.boot);
    cache.set(key, c);
    return c;
  }

  function botSprite(type, frame, scale) {
    const key = 'staffb_' + type + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const P = BOT_PAL[type] || BOT_PAL.cull;
    const c = newCanvas(13 * k, 16 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#23262b';
    /* antenna + blinker */
    R(6, 0, 1, 2, P.dark);
    R(6, 0, 1, 1, frame ? P.trim : P.visor);
    /* head */
    R(2, 2, 9, 6, OUT);
    R(3, 3, 7, 4, P.shell);
    R(3, 3, 7, 1, lighten(P.shell, 0.35));
    R(3, 6, 7, 1, P.shade);
    /* visor */
    R(4, 4, 5, 2, P.dark);
    R(4, 4, frame ? 5 : 3, 2, P.visor);
    R(4, 4, 2, 1, P.glow);
    /* body */
    R(2, 8, 9, 5, OUT);
    R(3, 8, 7, 4, P.shell);
    R(3, 8, 7, 1, lighten(P.shell, 0.3));
    R(3, 11, 7, 1, P.shade);
    /* chest panel */
    R(5, 9, 3, 2, P.dark);
    R(5 + (frame ? 1 : 0), 9, 1, 1, P.trim);
    /* side arms / claw */
    R(1, 9, 1, 3, P.shade);
    R(10, 9, 2, 2, P.shade);
    R(11, 8 + (frame ? 0 : 1), 1, 1, P.visor);
    /* treads */
    R(2, 13, 9, 3, OUT);
    for (let i = 0; i < 4; i++) R(3 + i * 2 + (frame ? 1 : 0), 14, 1, 1, P.shade);
    cache.set(key, c);
    return c;
  }

  function staffSprite(type, frame, scale) {
    return (type === 'cull' || type === 'match')
      ? botSprite(type, frame, scale)
      : personSprite(type, frame, scale);
  }

  /* wooden sign board — text drawn by the caller */
  function signSprite(w, scale, style) {
    const key = 'sign_' + w + '_' + scale + '_' + (style || 0);
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const h = 20;
    const c = newCanvas(w * k, h * k);
    const ctx = c.getContext('2d');
    /* posts */
    ctx.fillStyle = '#6e4a20';
    ctx.fillRect(Math.floor(w * 0.28) * k, 10 * k, 2 * k, 10 * k);
    ctx.fillRect(Math.floor(w * 0.68) * k, 10 * k, 2 * k, 10 * k);
    /* board */
    const m = newMask(w, h);
    mRect(m, 0, 0, w, 12);
    renderMask(ctx, m, k, 0, 0,
      { base: '#c9a35f', light: '#e8c48f', dark: '#a8783f', out: '#5e3d18' }, 11, { grain: 0.14 });
    /* plank seam + nails */
    ctx.fillStyle = '#a8783f';
    ctx.fillRect(k, 6 * k, (w - 2) * k, k);
    ctx.fillStyle = '#5e3d18';
    ctx.fillRect(2 * k, 2 * k, k, k); ctx.fillRect((w - 3) * k, 2 * k, k, k);
    ctx.fillRect(2 * k, 9 * k, k, k); ctx.fillRect((w - 3) * k, 9 * k, k, k);
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     BLOCKY HEXAGON (research grid)
     ============================================================ */
  function hexRows(r) {
    /* flat-top blocky hexagon: array of half-widths per row, height 2r+1 */
    const rows = [];
    for (let y = -r; y <= r; y++) {
      const t = Math.abs(y) / r;
      const half = Math.round(r * (1 - 0.5 * t));
      rows.push(half);
    }
    return rows;
  }
  function drawHex(ctx, cx, cy, r, k, pal, opts) {
    opts = opts || {};
    const rows = hexRows(r);
    for (let i = 0; i < rows.length; i++) {
      const y = -r + i, half = rows[i];
      for (let x = -half; x <= half; x++) {
        const edge = x === -half || x === half || i === 0 || i === rows.length - 1 ||
          Math.abs(x) > rows[i - 1 >= 0 ? i - 1 : 0] || Math.abs(x) > rows[Math.min(rows.length - 1, i + 1)];
        let col;
        if (edge) col = pal.out;
        else if (y < -r * 0.45) col = pal.light;
        else if (y > r * 0.45) col = pal.dark;
        else col = pal.base;
        if (!edge && opts.inner && y > -r * 0.45 && y < r * 0.45 && Math.abs(x) > half - 2) col = pal.dark;
        ctx.fillStyle = col;
        ctx.fillRect((cx + x) * k, (cy + y) * k, k, k);
      }
    }
  }
  function hexHit(dx, dy, r) {
    if (Math.abs(dy) > r) return false;
    const t = Math.abs(dy) / r;
    return Math.abs(dx) <= r * (1 - 0.5 * t);
  }

  return {
    chickenSprite, eggSprite, nestSprite, mamaSprite, decoSprite,
    uiSprite, iconSprite, basketSprite, feedbagSprite, hammerSprite, staffSprite,
    plumeSprite, signSprite, treeSprite, duckSprite, eggCrackSprite, shellHalfSprite,
    drawText, textW, drawTiny, tinyW, drawTitle, drawHex, hexHit, hexRows,
    newMask, mRect, mCircle, renderMask, mulberry, newCanvas,
    darken, lighten, warm, cool, lum, px, CELL, ICONS,
  };
})();

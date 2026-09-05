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

  /* w is a crew record: robots by their chassis, people by their look */
  function staffSprite(w, frame, scale) {
    if (typeof w === 'string') return (w === 'cull' || w === 'match') ? botSprite(w, frame, scale) : personSprite(null, frame, scale);
    if (w && (w.bot || w.role === 'cull' || w.role === 'match')) return botSprite(w.role, frame, scale);
    return personSprite(w && w.look, frame, scale);
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
  function chickSprite(sp, scale) {
    const key = 'chick_' + sp.id + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const c = newCanvas(12 * k, 12 * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const body = sp.body, acc = sp.accent, OUT = '#2e2216';
    /* body blob */
    R(3, 3, 6, 1, OUT); R(2, 4, 8, 5, OUT); R(3, 9, 6, 1, OUT);
    R(3, 4, 6, 5, body); R(4, 3, 4, 1, body);
    R(4, 4, 3, 1, lighten(body, 0.3));
    R(3, 8, 6, 1, darken(body, 0.22));
    /* wing nub */
    R(2, 6, 1, 2, darken(body, 0.3));
    /* eye + beak */
    R(7, 5, 1, 1, OUT);
    R(9, 6, 2, 1, '#f2a03f'); R(9, 6, 1, 1, '#ffbf5f');
    /* head tuft */
    R(5, 2, 1, 1, acc); R(6, 1, 1, 2, acc);
    /* feet */
    R(4, 10, 1, 1, '#f2a03f'); R(7, 10, 1, 1, '#f2a03f');
    R(3, 11, 2, 1, '#f2a03f'); R(7, 11, 2, 1, '#f2a03f');
    cache.set(key, c);
    return c;
  }

  /* ============================================================
     VEHICLES - from a bicycle to a private railcar
     ============================================================ */
  function vehicleSprite(id, frame, scale) {
    const key = 'veh_' + id + '_' + frame + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale || 1;
    const dims = { bike: [26, 20], cart: [38, 22], van: [46, 26], truck: [60, 30], lorry: [78, 32], train: [92, 34] }[id] || [60, 30];
    const c = newCanvas(dims[0] * k, dims[1] * k);
    const ctx = c.getContext('2d');
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * k, y * k, w * k, h * k); };
    const OUT = '#2e2216';
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
      R(6, 8, 8, 1, '#e8542f'); R(9, 10, 1, 4, '#e8542f'); R(5, 12, 5, 1, '#e8542f');
      /* saddle, bars, basket of eggs */
      R(8, 7, 3, 1, OUT); R(13, 6, 3, 1, OUT); R(15, 5, 1, 2, OUT);
      R(17, 3, 8, 5, OUT); R(18, 4, 6, 3, '#c9924f'); R(18, 4, 6, 1, '#e0bd82');
      R(19, 2, 2, 2, '#fff8ee'); R(22, 2, 2, 2, '#dcf2c8');
    } else if (id === 'cart') {
      spokeWheel(5, 16, 5); spokeWheel(17, 16, 4);
      R(5, 16, 1, 1, OUT); R(6, 11, 6, 1, OUT); R(8, 11, 1, 5, OUT); R(5, 15, 4, 1, OUT);
      R(6, 10, 6, 1, '#e8542f'); R(8, 12, 1, 4, '#e8542f');
      R(7, 9, 3, 1, OUT); R(11, 8, 3, 1, OUT);
      /* trailer crate */
      R(21, 8, 16, 10, OUT); R(22, 9, 14, 8, '#c9924f'); R(22, 9, 14, 1, '#e0bd82');
      R(25, 9, 1, 8, '#8a5e2a'); R(31, 9, 1, 8, '#8a5e2a');
      R(23, 6, 3, 3, '#fff8ee'); R(27, 6, 3, 3, '#dcf2c8'); R(31, 6, 3, 3, '#cfe9fb');
      R(14, 12, 8, 1, OUT);
      wheel(30, 18, 3);
    } else if (id === 'van') {
      /* body */
      R(1, 8, 44, 14, OUT); R(2, 9, 42, 12, '#7fc4e8'); R(2, 9, 42, 2, '#b5e0f5'); R(2, 19, 42, 2, '#4a86a8');
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
      R(34, 9, 24, 16, OUT); R(35, 10, 22, 14, '#3f6fd6'); R(35, 10, 22, 2, '#6f9af0'); R(35, 22, 22, 2, '#2a4a9e');
      R(37, 11, 12, 7, OUT); R(38, 12, 10, 5, '#d8f2fa'); R(38, 12, 4, 1, '#ffffff');
      R(55, 19, 3, 3, '#ffd23f'); R(52, 16, 4, 1, '#c9ced6');
      wheel(8, 26, 3); wheel(26, 26, 3); wheel(50, 26, 3);
    } else if (id === 'lorry') {
      R(0, 2, 52, 24, OUT); R(1, 3, 50, 22, '#e8e2d0'); R(1, 3, 50, 2, '#fff8ee'); R(1, 23, 50, 2, '#b8b0a0');
      R(4, 8, 44, 8, '#e8542f'); R(4, 8, 44, 1, '#ff8f6a');
      R(20, 10, 6, 5, '#fff8ee'); R(21, 9, 4, 1, '#fff8ee');
      R(52, 10, 25, 16, OUT); R(53, 11, 23, 14, '#e8542f'); R(53, 11, 23, 2, '#ff8f6a'); R(53, 23, 23, 2, '#a83a22');
      R(56, 12, 12, 7, OUT); R(57, 13, 10, 5, '#d8f2fa'); R(57, 13, 4, 1, '#ffffff');
      R(74, 20, 3, 3, '#ffd23f'); R(52, 2, 3, 8, '#8a9099');
      wheel(8, 28, 3); wheel(18, 28, 3); wheel(40, 28, 3); wheel(66, 28, 3);
    } else {
      /* railcar */
      R(0, 30, 92, 2, '#8a9099'); for (let i = 0; i < 92; i += 6) R(i, 32, 3, 1, '#5e3d18');
      R(2, 4, 62, 24, OUT); R(3, 5, 60, 22, '#3f6fd6'); R(3, 5, 60, 2, '#6f9af0'); R(3, 25, 60, 2, '#2a4a9e');
      for (let i = 0; i < 6; i++) { R(6 + i * 10, 9, 7, 7, OUT); R(7 + i * 10, 10, 5, 5, '#d8f2fa'); R(7 + i * 10, 10, 2, 1, '#ffffff'); }
      R(3, 18, 60, 3, '#ffd23f');
      R(64, 8, 26, 20, OUT); R(65, 9, 24, 18, '#2e2216'); R(66, 10, 22, 16, '#3a3a4a'); R(66, 10, 22, 2, '#6a6f78');
      R(70, 2, 8, 7, OUT); R(71, 3, 6, 5, '#3a3a4a'); R(72, 0, 4, 3, '#8a9099');
      R(80, 12, 8, 8, OUT); R(81, 13, 6, 6, '#d8f2fa');
      R(86, 22, 4, 4, '#ffd23f');
      wheel(10, 28, 3); wheel(22, 28, 3); wheel(46, 28, 3); wheel(58, 28, 3); wheel(72, 28, 3); wheel(84, 28, 3);
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

  return {
    chickenSprite, eggSprite, nestSprite, mamaSprite, decoSprite,
    uiSprite, iconSprite, basketSprite, feedbagSprite, hammerSprite, staffSprite,
    personSprite, faceSprite, flyerSprite,
    soilSprite, cropSprite, chickSprite, vehicleSprite, skylineSprite, cursorSprite,
    pathSprite, terraceSprite, waterSprite, inkLine, parchment, compassRose, botSprite,
    plumeSprite, signSprite, treeSprite, eggCrackSprite, shellHalfSprite,
    drawText, textW, drawTiny, tinyW, drawTitle,
    drawBezel, drawScanlines, drawPips, drawBox, TERM, drawHex, hexHit, hexRows,
    newMask, mRect, mCircle, renderMask, mulberry, newCanvas,
    darken, lighten, warm, cool, lum, px, CELL, ICONS,
  };
})();

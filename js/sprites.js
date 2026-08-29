/* ============================================================
   INF EGG CO. — pixel sprite engine
   Chickens are 16x16 templates drawn into 20x20 cells so hats
   and halos have headroom. Everything is cached per (id,scale).
   ============================================================ */
'use strict';

const SPR = (() => {

  /* ---------- color helpers ---------- */
  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function rgbHex(r,g,b){
    const c = v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');
    return '#' + c(r)+c(g)+c(b);
  }
  function darken(hex, f){ const [r,g,b]=hexRgb(hex); return rgbHex(r*(1-f), g*(1-f), b*(1-f)); }
  function lighten(hex, f){ const [r,g,b]=hexRgb(hex); return rgbHex(r+(255-r)*f, g+(255-g)*f, b+(255-b)*f); }
  function lum(hex){ const [r,g,b]=hexRgb(hex); return (0.299*r+0.587*g+0.114*b)/255; }

  /* ---------- shape templates (16 wide) ----------
     O outline  B body  L belly  W wing  C comb  U tuft  T tail  F feet */
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
      eyeL:[4,6], eyeR:[10,6], beak:[7,8], blushY:8, blushL:2, blushR:12,
      headTop:[8,2], bellyC:[8,10], wattle:false,
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
      eyeL:[4,6], eyeR:[10,6], beak:[7,8], blushY:8, blushL:2, blushR:12,
      headTop:[8,2], bellyC:[8,10], wattle:true,
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
      eyeL:[4,6], eyeR:[10,6], beak:[7,8], blushY:8, blushL:2, blushR:12,
      headTop:[8,2], bellyC:[8,11], wattle:false,
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
      eyeL:[4,5], eyeR:[9,5], beak:[7,7], blushY:7, blushL:3, blushR:11,
      headTop:[7,1], bellyC:[7,11], wattle:false,
    },
  };

  /* mama hen — 26 wide x 21 tall, drawn into a 30x26 cell */
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
    rows: MAMA_ROWS, eyeL:[9,7], eyeR:[14,7], beak:[12,9], blushY:9,
    blushL:6, blushR:17, headTop:[12,2], wattle:true, w:26, h:21,
  };

  /* mama palette per tier: [body, comb] */
  const MAMA_TIER = [
    ['#f7f0e0','#e8542f'], ['#bfe6a8','#e8542f'], ['#a8d8f0','#e8542f'],
    ['#d5b3ef','#b03ee0'], ['#ffcf7d','#e8542f'], ['#ff9db5','#c42f5e'],
    ['#8f86e8','#ffd23f'], ['#ffe9a8','#f0b429'],
  ];

  /* egg — 10 wide x 12 tall */
  const EGG_ROWS = [
    '...OOOO...',
    '..OBBBBO..',
    '.OBSBBBBO.',
    '.OBSBBBBO.',
    'OBSBBBBBBO',
    'OBBBBBBBBO',
    'OBBBBBBBBO',
    'OBBBBBBBBO',
    '.OBBBBBBO.',
    '.OBBBBBBO.',
    '..OBBBBO..',
    '...OOOO...',
  ];

  /* nest — 20 wide x 7 tall straw bowl (d = shadowed inner rim) */
  const NEST_ROWS = [
    's.dddddddddddddddd.s',
    '.sSsSsSsSsSsSsSsSss.',
    'sSsSsSsSsSsSsSsSsSsS',
    'SsSsSsSsSsSsSsSsSsSs',
    '.oSsSsSsSsSsSsSsSo..',
    '..ooSsSsSsSsSsSoo...',
    '....oooooooooo......',
  ];

  /* ---------- accessories ---------- */
  const ACC = {
    bow:    { g:['pp.pp','ppppp','pp.pp'], pal:{p:'#ff5f9e'}, dx:4, dy:-1 },
    tophat: { g:['.ttttt.','.ttttt.','.trrrt.','ttttttt'], pal:{t:'#2e2e38', r:'#e8542f'}, dx:0, dy:-2 },
    crown:  { g:['g.g.g','ggggg','ggggg'], pal:{g:'#ffd23f'}, dx:0, dy:-1 },
    halo:   { g:['.hhhh.','h....h'], pal:{h:'#ffd23f'}, dx:0, dy:-4 },
    flower: { g:['.p.','pyp','.p.'], pal:{p:'#ff8ab5', y:'#ffd23f'}, dx:4, dy:-1 },
    sprout: { g:['l.l','glg','.g.'], pal:{g:'#5da33a', l:'#8fd14f'}, dx:0, dy:-2 },
    wizard: { g:['...w...','..www..','..wsw..','.wwwww.','wwwwwww'], pal:{w:'#7a5fd0', s:'#ffd23f'}, dx:0, dy:-3 },
    ninja:  { g:['nnnnnnnnn','........n'], pal:{n:'#3a3a4a'}, dx:0, dy:3 },
    cowboy: { g:['...ccc...','...ccc...','ccccccccc'], pal:{c:'#a8663a'}, dx:0, dy:-1 },
    antenna:{ g:['a.....a','s.....s','s.....s'], pal:{s:'#4a4a4a', a:'#ffd23f'}, dx:0, dy:-2 },
    horns:  { g:['h.....h','h.....h','.h...h.'], pal:{h:'#f0e2c8'}, dx:0, dy:-1 },
    tiara:  { g:['..p..','s.s.s','sssss'], pal:{s:'#e8e8f5', p:'#ff8ab5'}, dx:0, dy:-1 },
    /* eyepatch + glasses are drawn against eye coords in code */
  };

  /* ---------- low level ---------- */
  function drawGrid(ctx, rows, pal, ox, oy, k) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x * k, oy + y * k, k, k);
      }
    }
  }
  function px(ctx, x, y, k, col){ ctx.fillStyle = col; ctx.fillRect(x*k, y*k, k, k); }

  function mulberry(seed) {
    let a = seed + 0x6D2B79F5;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- face bits ---------- */
  const EYE = '#33221a', SHINE = '#ffffff', BLUSH = '#ff9eb5';

  function drawEyes(ctx, style, ex, ey, k, eyeCol) {
    const col = eyeCol || EYE;
    if (style === 'sleepy') {          /* flat closed lid  __ */
      px(ctx, ex, ey+1, k, col); px(ctx, ex+1, ey+1, k, col);
    } else if (style === 'happy') {    /* upturned arc  ^ */
      px(ctx, ex, ey+1, k, col); px(ctx, ex+1, ey, k, col); px(ctx, ex+2, ey+1, k, col);
    } else {                           /* round bead with shine */
      px(ctx, ex, ey, k, col); px(ctx, ex+1, ey, k, col);
      px(ctx, ex, ey+1, k, col); px(ctx, ex+1, ey+1, k, col);
      px(ctx, ex, ey, k, SHINE);
    }
  }

  function applyPattern(ctx, sp, grid, ox, oy, k) {
    const acc = sp.accent;
    if (sp.pattern === 'solid') return;
    if (sp.pattern === 'stripes') {
      for (let y = 0; y < grid.length; y++) {
        if (y % 3 !== 1) continue;
        for (let x = 0; x < grid[y].length; x++)
          if (grid[y][x] === 'B') px(ctx, ox + x, oy + y, k, acc);
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
        if (grid[y] && grid[y][x+1] === 'B') px(ctx, ox + x + 1, oy + y, k, acc);
      }
    } else if (sp.pattern === 'star') {
      const shape = SHAPES[sp.shape];
      const [cx, cy] = shape ? shape.bellyC : [8, 10];
      px(ctx, ox + cx, oy + cy - 1, k, acc);
      px(ctx, ox + cx - 1, oy + cy, k, acc);
      px(ctx, ox + cx, oy + cy, k, acc);
      px(ctx, ox + cx + 1, oy + cy, k, acc);
      px(ctx, ox + cx, oy + cy + 1, k, acc);
    }
  }

  /* stamp so the accessory's bottom row sits at headTop row + dy */
  function stampAcc(ctx, accId, headTop, ox, oy, k) {
    const a = ACC[accId];
    if (!a) return;
    const w = a.g[0].length, h = a.g.length;
    const gx = ox + headTop[0] - Math.floor(w / 2) + (a.dx || 0);
    const gy = oy + headTop[1] + (a.dy || 0) - (h - 1);
    drawGrid(ctx, a.g, a.pal, gx * k, gy * k, k);
  }

  /* ---------- chicken sprite ---------- */
  const CELL = 20;                 /* cell for 16px shapes  */
  const OFF_X = 2, OFF_Y = 4;      /* template offset in cell */
  const cache = new Map();

  function paletteFor(sp) {
    const body = sp.body;
    return {
      O: lum(body) < 0.22 ? '#14141c' : darken(body, 0.5),
      B: body,
      L: lighten(body, 0.42),
      W: darken(body, 0.16),
      C: '#e8542f',
      U: sp.accent,
      T: sp.accent,
      F: '#f2a03f',
      K: '#f2a03f',
    };
  }

  function chickenSprite(sp, scale, silhouette) {
    const key = sp.id + '_' + scale + (silhouette ? '_s' : '');
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = document.createElement('canvas');
    c.width = CELL * k; c.height = CELL * k;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const shape = SHAPES[sp.shape] || SHAPES.chick;
    const pal = paletteFor(sp);
    drawGrid(ctx, shape.rows, pal, OFF_X * k, OFF_Y * k, k);
    applyPattern(ctx, sp, shape.rows, OFF_X, OFF_Y, k);

    /* face */
    const exL = OFF_X + shape.eyeL[0], eyL = OFF_Y + shape.eyeL[1];
    const exR = OFF_X + shape.eyeR[0], eyR = OFF_Y + shape.eyeR[1];
    const eyeCol = lum(sp.body) < 0.22 ? '#f5f0ff' : EYE;
    drawEyes(ctx, sp.eyes, exL, eyL, k, eyeCol);
    drawEyes(ctx, sp.eyes, exR, eyR, k, eyeCol);
    /* beak (2px) */
    px(ctx, OFF_X + shape.beak[0], OFF_Y + shape.beak[1], k, '#f2a03f');
    px(ctx, OFF_X + shape.beak[0] + 1, OFF_Y + shape.beak[1], k, '#e0862f');
    /* wattle */
    if (shape.wattle) px(ctx, OFF_X + shape.beak[0], OFF_Y + shape.beak[1] + 1, k, '#e8542f');
    /* blush */
    ctx.globalAlpha = 0.8;
    px(ctx, OFF_X + shape.blushL, OFF_Y + shape.blushY, k, BLUSH);
    px(ctx, OFF_X + shape.blushR, OFF_Y + shape.blushY, k, BLUSH);
    ctx.globalAlpha = 1;

    /* accessory */
    if (sp.acc === 'eyepatch') {
      ctx.fillStyle = '#2e2e38';
      ctx.fillRect((exR - 1) * k, (eyR - 1) * k, 4 * k, 3 * k);
      ctx.fillRect((exL) * k, (eyR - 1) * k, (exR - exL) * k, k);
    } else if (sp.acc === 'glasses') {
      ctx.fillStyle = '#2e2e38';
      ctx.fillRect((exL - 1) * k, (eyL - 1) * k, 4 * k, k);
      ctx.fillRect((exR - 1) * k, (eyR - 1) * k, 4 * k, k);
      ctx.fillRect((exL + 3) * k, (eyL) * k, (exR - exL - 4) * k, k);
    } else if (sp.acc && sp.acc !== 'none') {
      stampAcc(ctx, sp.acc, shape.headTop, OFF_X, OFF_Y, k);
    }

    /* silhouette mode: recolor all opaque pixels */
    if (silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#7d6a4d';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    cache.set(key, c);
    return c;
  }

  /* ---------- egg sprite ---------- */
  function eggSprite(tier, scale) {
    const key = 'egg' + tier + '_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = document.createElement('canvas');
    c.width = 10 * k; c.height = 12 * k;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const shell = EGG_SHELL[tier], tc = TIERS[tier].c;
    drawGrid(ctx, EGG_ROWS, { O: darken(shell, 0.45), B: shell, S: lighten(shell, 0.7) }, 0, 0, k);
    /* tier decoration */
    if (tier >= 1 && tier <= 5) {          /* spots */
      const spots = [[3,6],[6,4],[5,8],[7,7]].slice(0, 1 + Math.min(tier, 3));
      spots.forEach(([x,y]) => px(ctx, x, y, k, tc));
    } else if (tier >= 6) {                /* star */
      const cx = 4, cy = 6;
      [[0,-1],[-1,0],[0,0],[1,0],[0,1]].forEach(([dx,dy]) => px(ctx, cx+dx, cy+dy, k, tc));
      if (tier === 7) { px(ctx, 7, 3, k, '#fff'); px(ctx, 2, 9, k, '#fff'); }
    }
    cache.set(key, c);
    return c;
  }

  /* ---------- nest sprite ---------- */
  function nestSprite(scale) {
    const key = 'nest_' + scale;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = document.createElement('canvas');
    c.width = 20 * k; c.height = 7 * k;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawGrid(ctx, NEST_ROWS, { s:'#d9a95f', S:'#c08c3f', o:'#8a5e2a', d:'#9c6b32' }, 0, 0, k);
    cache.set(key, c);
    return c;
  }

  /* ---------- mama sprite ---------- */
  function mamaSprite(tier, scale, mood) {
    /* mood: 'idle' | 'happy' (petted recently -> closed happy eyes) | 'blink' */
    const key = 'mama' + tier + '_' + scale + '_' + mood;
    if (cache.has(key)) return cache.get(key);
    const k = scale;
    const c = document.createElement('canvas');
    c.width = 30 * k; c.height = 26 * k;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const [body, comb] = MAMA_TIER[tier];
    const ox = 2, oy = 4;
    drawGrid(ctx, MAMA.rows, {
      O: darken(body, 0.48), B: body, L: lighten(body, 0.4),
      W: darken(body, 0.16), C: comb, T: darken(body, 0.28),
    }, ox * k, oy * k, k);

    /* cosmic stars / divine sparkle on body */
    if (tier === 6) {
      [[7,11],[15,13],[11,16],[17,9]].forEach(([x,y]) => px(ctx, ox+x, oy+y, k, '#ffd23f'));
    } else if (tier === 7) {
      [[6,11],[16,10],[12,17]].forEach(([x,y]) => px(ctx, ox+x, oy+y, k, '#ffffff'));
    }

    /* face */
    const exL = ox + MAMA.eyeL[0], eyL = oy + MAMA.eyeL[1];
    const exR = ox + MAMA.eyeR[0], eyR = oy + MAMA.eyeR[1];
    if (mood === 'happy') {
      drawEyes(ctx, 'happy', exL, eyL, k); drawEyes(ctx, 'happy', exR, eyR, k);
    } else if (mood === 'blink') {
      drawEyes(ctx, 'sleepy', exL, eyL, k); drawEyes(ctx, 'sleepy', exR, eyR, k);
    } else {
      drawEyes(ctx, 'round', exL, eyL, k); drawEyes(ctx, 'round', exR, eyR, k);
    }
    /* beak + wattle */
    px(ctx, ox + MAMA.beak[0], oy + MAMA.beak[1], k, '#f2a03f');
    px(ctx, ox + MAMA.beak[0] + 1, oy + MAMA.beak[1], k, '#e0862f');
    px(ctx, ox + MAMA.beak[0], oy + MAMA.beak[1] + 1, k, comb);
    px(ctx, ox + MAMA.beak[0] + 1, oy + MAMA.beak[1] + 1, k, comb);
    /* blush */
    ctx.globalAlpha = 0.8;
    px(ctx, ox + MAMA.blushL, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushL + 1, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushR, oy + MAMA.blushY, k, BLUSH);
    px(ctx, ox + MAMA.blushR + 1, oy + MAMA.blushY, k, BLUSH);
    ctx.globalAlpha = 1;
    /* divine halo */
    if (tier === 7) stampAcc(ctx, 'halo', MAMA.headTop, ox, oy, k);

    cache.set(key, c);
    return c;
  }

  return { chickenSprite, eggSprite, nestSprite, mamaSprite, darken, lighten, CELL };
})();

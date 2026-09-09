/* ============================================================
   INF EGG CO. - HR, THE SECURITY ROOM
   A dark room with a wall of monitors, one camera on every
   worker, live. Tap a screen and their file comes up beside it:
   ratings to train, a post to move them to, a button to let them
   go. Posters go up from here too, and the applicants they bring
   walk in off the road like everyone else.
   ============================================================ */
'use strict';

window.HR = (() => {
  let UI = null, $ = null, S = null;
  const LW = 450, LH = 250, MK = 2;
  const FW = 64, FH = 44;                              /* a camera sees this much of the world */
  const COLS = 4, ROWS = 2, MW = 76, MH = 60, GAP = 8;
  const GX = Math.round((LW - (COLS * MW + (COLS - 1) * GAP)) / 2), GY = 12;
  let cv = null, g = null, side = null, feeds = [], hits = [], hover = null, selId = null, page = 0, tab = 'staff', sideSig = '', mouse = { x: 0, y: 0, inside: false };

  function feedCanvas(i) { if (!feeds[i]) feeds[i] = SPR.newCanvas(FW, FH); return feeds[i]; }
  function staffPage() { const st = S().staff; return st.slice(page * COLS * ROWS, (page + 1) * COLS * ROWS); }
  function pages() { return Math.max(1, Math.ceil(S().staff.length / (COLS * ROWS))); }

  function drawMonitor(x, y, w, i, now, big) {
    const BS = 1.5;                                    /* the desk monitor shows its feed half again as big */
    const scr = big ? { x: x + 6, y: y + 6, w: Math.round(FW * BS), h: Math.round(FH * BS) } : { x: x + 6, y: y + 5, w: FW, h: FH };
    const on = !!w;
    /* bezel */
    const BW = big ? scr.w + 12 : MW, BH = big ? scr.h + 16 : MH;
    g.fillStyle = '#1a1a22'; g.fillRect(x - 1, y - 1, BW + 2, BH + 2);
    g.fillStyle = '#4a4a58'; g.fillRect(x, y, BW, BH);
    g.fillStyle = '#6a6a7a'; g.fillRect(x, y, BW, 1);
    g.fillStyle = '#2e2e3a'; g.fillRect(x, y + BH - 1, BW, 1);
    if (on) {
      const fc = feedCanvas(big ? 8 : i);
      UI.cameraFeed(fc.getContext('2d'), w.x + 6, w.y + 8, FW, FH, now);
      g.drawImage(fc, scr.x, scr.y, scr.w, scr.h);
      /* a cross-hair on the worker, the camera's own overlay */
      g.fillStyle = 'rgba(126,242,168,.8)';
      const cx = scr.x + scr.w / 2, cy = scr.y + scr.h / 2;
      g.fillRect(cx - 7, cy - 7, 4, 1); g.fillRect(cx - 7, cy - 7, 1, 4); g.fillRect(cx + 4, cy - 7, 4, 1); g.fillRect(cx + 7, cy - 7, 1, 4);
      g.fillRect(cx - 7, cy + 7, 4, 1); g.fillRect(cx - 7, cy + 4, 1, 4); g.fillRect(cx + 4, cy + 7, 4, 1); g.fillRect(cx + 7, cy + 4, 1, 4);
      SPR.drawScanlines(g, scr.x, scr.y, scr.w, scr.h, now);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(scr.x, scr.y, scr.w, 7);
      SPR.drawTiny(g, 'CAM ' + String((page * COLS * ROWS) + i + 1).padStart(2, '0'), scr.x + 2, scr.y + 1, '#7ef2a8', 1);
      if (Math.floor(now / 500) % 2) { g.fillStyle = '#ff4a3a'; g.fillRect(scr.x + scr.w - 5, scr.y + 2, 3, 3); }
      SPR.drawTiny(g, 'REC', scr.x + scr.w - 18, scr.y + 1, '#ff8a7a', 1);
      const stl = S().unpaid ? 'UNPAID' : w.state === 'rest' ? 'ON A BREAK' : w.state === 'work' || w.state === 'walk' ? 'WORKING' : 'IDLE';
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(scr.x, scr.y + scr.h - 7, scr.w, 7);
      SPR.drawTiny(g, stl, scr.x + 2, scr.y + scr.h - 6, S().unpaid ? '#ff8a7a' : w.state === 'rest' ? '#9fd6ff' : '#7ef2a8', 1);
      if (big) SPR.drawTiny(g, (ROLES[w.role] || ROLES.hand).name.toUpperCase(), scr.x + scr.w - 4 - SPR.tinyW((ROLES[w.role] || ROLES.hand).name.toUpperCase(), 1), scr.y + scr.h - 6, '#fff8ec', 1);
    } else {
      g.fillStyle = '#0a0e14'; g.fillRect(scr.x, scr.y, scr.w, scr.h);
      /* static */
      for (let k = 0; k < (big ? 320 : 90); k++) { g.fillStyle = 'rgba(200,210,220,' + (0.1 + ((k * 7 + Math.floor(now / 60)) % 5) * 0.08).toFixed(2) + ')'; g.fillRect(scr.x + ((k * 37 + Math.floor(now / 50) * 13) % scr.w), scr.y + ((k * 53 + Math.floor(now / 70) * 7) % scr.h), 2, 1); }
      const t = 'NO SIGNAL'; SPR.drawTiny(g, t, scr.x + scr.w / 2 - SPR.tinyW(t, 1) / 2, scr.y + scr.h / 2 - 3, '#7a8290', 1);
    }
    /* the name plate under the screen */
    const plate = on ? w.name.toUpperCase().slice(0, big ? 30 : 15) : '-';
    g.fillStyle = '#2e2e3a'; g.fillRect(scr.x, scr.y + scr.h + 2, scr.w, 8);
    SPR.drawTiny(g, plate, scr.x + 2, scr.y + scr.h + 3, on ? '#fff8ec' : '#5a5a6a', 1);
    if (on && !big) SPR.drawBar(g, scr.x + scr.w - 16, scr.y + scr.h + 4, 14, w.energy === undefined ? 1 : w.energy, w.energy < 0.3 ? '#e8542f' : '#7ac74f', { h: 4, frame: '#1a1a22', trough: '#3a3a4a' });
    /* a little power lamp */
    g.fillStyle = on ? '#7ac74f' : '#4a2a2a'; g.fillRect(x + 2, y + BH - 5, 2, 2);
  }

  function draw(now, dt) {
    if (!cv) return;
    hits = [];
    g.imageSmoothingEnabled = false;
    g.setTransform(MK, 0, 0, MK, 0, 0);
    /* the room: dark wall, a wainscot, a desk */
    g.fillStyle = '#12141c'; g.fillRect(0, 0, LW, LH);
    g.fillStyle = '#181b26'; for (let y = 0; y < 160; y += 8) for (let x = ((y / 8) % 2) * 8; x < LW; x += 16) g.fillRect(x, y, 8, 8);
    g.fillStyle = '#2a2233'; g.fillRect(0, 150, LW, 100);
    g.fillStyle = '#3a2a16'; g.fillRect(0, 168, LW, 82); g.fillStyle = '#5e3d18'; g.fillRect(0, 168, LW, 3);
    g.fillStyle = '#4a3018'; for (let x = 0; x < LW; x += 20) g.fillRect(x, 176, 12, 1);
    /* the monitors */
    const list = staffPage();
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = GX + (i % COLS) * (MW + GAP), y = GY + Math.floor(i / COLS) * (MH + GAP);
      const w = list[i] || null;
      drawMonitor(x, y, w, i, now, false);
      if (w) hits.push({ id: w.id, x, y, w: MW, h: MH });
      if (w && (w.id === selId)) { g.fillStyle = '#ffd23f'; g.fillRect(x - 2, y - 2, MW + 4, 1); g.fillRect(x - 2, y + MH + 1, MW + 4, 1); g.fillRect(x - 2, y - 2, 1, MH + 4); g.fillRect(x + MW + 1, y - 2, 1, MH + 4); }
      else if (w && hover === w.id) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x - 1, y - 1, MW + 2, 1); g.fillRect(x - 1, y + MH, MW + 2, 1); }
    }
    /* the desk: the big monitor on the selected worker, a console, a mug */
    const selW = S().staff.find(w => w.id === selId) || null;
    const bx = 24, by = 158;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx + 4, by + 8, Math.round(FW * 1.5) + 12, Math.round(FH * 1.5) + 16);
    drawMonitor(bx, by, selW, 8, now, true);
    /* console */
    const cx0 = bx + Math.round(FW * 1.5) + 26, cy0 = 182;
    g.fillStyle = '#1a1a22'; g.fillRect(cx0, cy0, 200, 52); g.fillStyle = '#2e2e3a'; g.fillRect(cx0 + 1, cy0 + 1, 198, 50);
    for (let i = 0; i < 12; i++) { const lit = (i + Math.floor(now / 700)) % 4 === 0; g.fillStyle = lit ? '#7ef2a8' : (i % 3 ? '#e8542f' : '#ffd23f'); g.globalAlpha = lit ? 1 : 0.5; g.fillRect(cx0 + 6 + i * 8, cy0 + 6, 5, 3); g.globalAlpha = 1; }
    for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#4a4a58' : '#5a5a6a'; g.fillRect(cx0 + 6 + i * 9, cy0 + 14, 7, 5); }
    const st = S();
    const line1 = 'STAFF ' + st.staff.length + '/' + GAME.staffSlots() + '   WAGES ' + GAME.wagePerSec().toFixed(2) + '/S';
    const line2 = (st.applicants.length ? st.applicants.length + ' AT THE BOARD' : st.flyer ? 'POSTERS OUT ' + GAME.fmtTime(st.flyer.t) : 'NOBODY WAITING') + (st.unpaid ? '   PAYROLL EMPTY' : '');
    g.fillStyle = '#0a1a14'; g.fillRect(cx0 + 6, cy0 + 24, 188, 22);
    SPR.drawTiny(g, line1, cx0 + 10, cy0 + 27, '#7ef2a8', 1);
    SPR.drawTiny(g, line2, cx0 + 10, cy0 + 36, st.unpaid ? '#ff8a7a' : '#d8ffe8', 1);
    /* pages */
    if (pages() > 1) {
      const t = 'PAGE ' + (page + 1) + '/' + pages() + '  < >';
      SPR.drawTiny(g, t, LW - 8 - SPR.tinyW(t, 1), 156, '#fff8ec', 1);
      hits.push({ id: 'prev', x: LW - 26, y: 152, w: 9, h: 10 }); hits.push({ id: 'next', x: LW - 15, y: 152, w: 9, h: 10 });
    }
    /* mug and a chair back */
    g.fillStyle = '#1a1410'; g.fillRect(LW - 60, 196, 15, 19); g.fillRect(LW - 46, 200, 4, 9);
    g.fillStyle = '#3fa7d6'; g.fillRect(LW - 59, 197, 13, 17); g.fillRect(LW - 45, 201, 2, 7);
    g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 3; i++) g.fillRect(LW - 56 + i * 4, Math.round(190 - ((now / 130 + i * 9) % 12)), 1, 2);
    g.fillStyle = '#2e2216'; g.fillRect(LW / 2 - 30, 226, 60, 24); g.fillStyle = '#4a3a2a'; g.fillRect(LW / 2 - 28, 228, 56, 20);
    /* the pointer */
    if (mouse.inside) { const cur = SPR.cursorSprite(hover ? 'hand' : 'arrow', 1); g.drawImage(cur, Math.round(mouse.x) - (hover ? 4 : 0), Math.round(mouse.y) - (hover ? 2 : 0)); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!$('#modal-hr').hidden) renderSide();
  }

  function renderSide() {
    const st = S();
    const w = st.staff.find(x => x.id === selId) || null;
    const s2 = tab + '|' + selId + '|' + st.staff.length + '|' + st.applicants.length + '|' + st.coins.toFixed(0) + '|' + (w ? JSON.stringify(w.st) + w.role + (w.trained || 0) : '') + '|' + (st.flyer ? Math.floor(st.flyer.t) : '') + '|' + st.unpaid;
    if (s2 === sideSig) return;
    sideSig = s2;
    side.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'food-tabs';
    [['staff', 'FILE', 'doc'], ['hire', 'POSTERS', 'person'], ['bots', 'ROBOTS', 'robot']].forEach(([id, name, icon]) => {
      const b = document.createElement('button');
      b.className = 'tab-btn' + (tab === id ? ' active' : '');
      b.dataset.act = 'hr-tab'; b.dataset.tab = id;
      b.appendChild(UI.mkIcon(icon, 2)); b.appendChild(document.createTextNode(name));
      if (id === 'hire' && st.applicants.length) { const n = document.createElement('i'); n.className = 'tb-badge'; n.textContent = st.applicants.length; n.style.position = 'static'; b.appendChild(n); }
      tabs.appendChild(b);
    });
    side.appendChild(tabs);
    if (tab === 'staff') {
      if (!w) { const p = document.createElement('p'); p.className = 'pedia-intro'; p.textContent = st.staff.length ? 'Tap a monitor to bring up a file.' : 'Nobody on the payroll yet. Put posters up and hire whoever walks in.'; side.appendChild(p); }
      else {
        side.appendChild(UI.crewCard(w));
        if (!w.bot) {
          const tr = document.createElement('div');
          tr.className = 'hr-train';
          const h = document.createElement('i'); h.textContent = 'TRAINING  -  ' + GAME.fmt(GAME.trainCost(w)) + ' COINS A SESSION'; tr.appendChild(h);
          const row = document.createElement('div'); row.className = 'tickrow';
          STAT_KEYS.forEach(k => {
            const b = document.createElement('button');
            const ok = GAME.canTrain(w.id, k);
            b.className = 'tick' + (ok ? ' go' : ''); b.disabled = !ok;
            b.dataset.act = 'train'; b.dataset.id = String(w.id); b.dataset.stat = k;
            b.title = 'Train ' + STATS[k].name + ' (' + (w.st[k] || 0) + ' now) - ' + STATS[k].desc;
            b.appendChild(UI.mkIcon(STATS[k].icon, 2));
            row.appendChild(b);
          });
          tr.appendChild(row);
          const note = document.createElement('p'); note.className = 'wm-note'; note.textContent = 'Every session adds a point to one rating, and a little to their wage.'; tr.appendChild(note);
          side.appendChild(tr);
        }
      }
    } else if (tab === 'hire') {
      const p = document.createElement('p'); p.className = 'pedia-intro'; p.textContent = 'Posters go up along the road. Whoever reads one walks in off it and waits by the noticeboard.'; side.appendChild(p);
      UI.noticeBoard(side);
    } else UI.botBench(side);
    $('#hr-sub').textContent = st.staff.length + ' ON CAMERA  -  ' + GAME.wagePerSec().toFixed(2) + ' COINS/SEC' + (st.unpaid ? '  -  PAYROLL EMPTY' : '');
  }

  function hitAt(x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
  function coords(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * LW, y: (ev.clientY - r.top) / r.height * LH }; }
  function open() {
    if (!cv) setup();
    if (!S().staff.some(w => w.id === selId)) selId = S().staff.length ? S().staff[0].id : null;
    if (!S().staff.length) tab = 'hire';
    sideSig = '';
    UI.openModal('#modal-hr');
  }
  function setup() {
    cv = $('#hr-canvas'); g = cv.getContext('2d'); side = $('#hr-side');
    cv.width = LW * MK; cv.height = LH * MK;
    cv.addEventListener('pointermove', ev => { const p = coords(ev); mouse = { x: p.x, y: p.y, inside: true }; const h = hitAt(p.x, p.y); hover = h ? h.id : null; });
    cv.addEventListener('pointerleave', () => { mouse.inside = false; hover = null; });
    cv.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const p = coords(ev); const h = hitAt(p.x, p.y);
      if (!h) return;
      if (h.id === 'prev') { page = (page + pages() - 1) % pages(); UI.snd.plop(); return; }
      if (h.id === 'next') { page = (page + 1) % pages(); UI.snd.plop(); return; }
      selId = h.id; tab = 'staff'; sideSig = ''; UI.snd.plop();
    });
  }
  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S;
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'hr-tab': tab = btn.dataset.tab; sideSig = ''; UI.snd.plop(); break;
        case 'train': { if (GAME.trainStaff(+btn.dataset.id, btn.dataset.stat)) { UI.snd.skill(); UI.floatText('+1 ' + STATS[btn.dataset.stat].name, ev.clientX - 20, ev.clientY - 30, 'green', STATS[btn.dataset.stat].icon); } else UI.snd.error(); sideSig = ''; break; }
        case 'fire': case 'set-role': case 'hire-applicant': case 'assemble': case 'send-flyers': sideSig = ''; break;
      }
    });
  }
  return { init, open, draw };
})();

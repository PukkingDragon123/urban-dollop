/* ============================================================
   INF EGG CO. - THE GARAGE
   The wheels: buy the next vehicle, paint it, bolt upgrades on,
   and choose how it drives to every town - the highway with a
   toll, the free country lane, or the scenic route that pays.
   ============================================================ */
'use strict';

window.GARAGE = (() => {
  let UI = null, $ = null, S = null;
  let tab = 'cars', sig = '';

  function open(t) { if (t) tab = t; sig = ''; render(); UI.openModal('#modal-garage'); }
  function vehicleCard(veh, i) {
    const st = S();
    const owned = i <= st.vehicle, cur = i === st.vehicle, next = i === st.vehicle + 1;
    const card = document.createElement('div');
    card.className = 'veh-card' + (cur ? ' current' : owned ? ' owned' : next ? ' next' : ' locked');
    card.appendChild(UI.cloneCanvas(SPR.vehicleSprite(veh.id, 0, 2, owned ? GAME.paintInfo() : null)));
    const nm = document.createElement('b'); nm.textContent = veh.name.toUpperCase(); card.appendChild(nm);
    card.title = veh.desc;
    const line = document.createElement('span');
    line.appendChild(UI.mkIcon('egg', 3)); line.appendChild(document.createTextNode(String(veh.cap + (cur ? 5 * GAME.lvl('truckcap') + 4 * GAME.garageLevel('cargo') : 0))));
    line.appendChild(UI.mkIcon('clock', 3)); line.appendChild(document.createTextNode(GAME.fmtTime(veh.trip * GAME.city().dist)));
    card.appendChild(line);
    if (cur) { const t = document.createElement('em'); t.textContent = 'YOURS'; card.appendChild(t); }
    else if (next) {
      const b3 = document.createElement('button');
      const ok = st.coins >= veh.cost && st.truck.state === 'parked';
      b3.className = 'btn' + (ok ? ' btn-green' : ''); b3.disabled = !ok; b3.dataset.act = 'buy-vehicle';
      b3.appendChild(UI.mkIcon('coin', 2)); b3.appendChild(document.createTextNode(GAME.fmt(veh.cost)));
      card.appendChild(b3);
    } else if (!owned) { const t = document.createElement('em'); t.textContent = 'LATER'; card.appendChild(t); }
    return card;
  }
  function render() {
    const box = $('#garage-body');
    if (!box) return;
    const st = S();
    const v = GAME.vehicle();
    const s2 = tab + '|' + st.vehicle + '|' + st.coins.toFixed(0) + '|' + JSON.stringify(st.garage) + '|' + st.routes.join() + '|' + st.route + '|' + st.truck.state;
    if (s2 === sig) return;
    sig = s2;
    $('#garage-sub').textContent = v.name.toUpperCase() + '  -  ' + GAME.truckCap() + ' EGGS  -  ' + GAME.fmtTime(GAME.tripTime()) + ' TO ' + GAME.city().name.toUpperCase();
    box.innerHTML = '';
    /* the bay: the current vehicle, big, in its paint */
    const bay = document.createElement('div');
    bay.className = 'gar-bay';
    const floor = document.createElement('div');
    floor.className = 'gar-floor';
    floor.appendChild(UI.cloneCanvas(SPR.vehicleSprite(v.id, Math.floor(performance.now() / 300) % 2, 3, GAME.paintInfo())));
    bay.appendChild(floor);
    const stats = document.createElement('div');
    stats.className = 'gar-stats';
    [['egg', GAME.truckCap(), 'eggs per load'], ['clock', GAME.fmtTime(GAME.tripTime()), 'round trip to ' + GAME.city().name],
     ['coin', 'x' + GAME.payMultTo(st.route).toFixed(2), 'route and garage multiplier'], ['gear', GARAGE_KEYS.reduce((a, k) => a + GAME.garageLevel(k), 0), 'upgrades fitted']].forEach(([ic, val, tip]) => {
      const d = document.createElement('div');
      d.title = tip;
      d.appendChild(UI.mkIcon(ic, 3));
      const b = document.createElement('b'); b.textContent = String(val); d.appendChild(b);
      const s3 = document.createElement('small'); s3.textContent = tip.toUpperCase(); d.appendChild(s3);
      stats.appendChild(d);
    });
    bay.appendChild(stats);
    box.appendChild(bay);
    const tabs = document.createElement('div');
    tabs.className = 'food-tabs';
    [['cars', 'VEHICLES', 'truck'], ['upgrades', 'UPGRADES', 'gear'], ['paint', 'PAINT SHOP', 'brush'], ['routes', 'ROUTES', 'road']].forEach(([id, name, icon]) => {
      const b = document.createElement('button');
      b.className = 'tab-btn' + (tab === id ? ' active' : '');
      b.dataset.act = 'garage-tab'; b.dataset.tab = id;
      b.appendChild(UI.mkIcon(icon, 2)); b.appendChild(document.createTextNode(name));
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    if (tab === 'cars') {
      const row = document.createElement('div');
      row.className = 'veh-row';
      VEHICLES.forEach((veh, i) => row.appendChild(vehicleCard(veh, i)));
      box.appendChild(row);
    } else if (tab === 'upgrades') {
      const grid = document.createElement('div');
      grid.className = 'gar-grid';
      GARAGE_KEYS.forEach(id => {
        const u = GARAGE_UPGRADES[id], lv = GAME.garageLevel(id);
        const c = document.createElement('div');
        c.className = 'gar-card' + (lv >= u.max ? ' maxed' : '');
        const top = document.createElement('div'); top.className = 'fc-top';
        top.appendChild(UI.mkIcon(u.icon, 4));
        const mid = document.createElement('div');
        const nm = document.createElement('b'); nm.textContent = u.name.toUpperCase(); mid.appendChild(nm);
        const ds = document.createElement('span'); ds.textContent = u.desc; mid.appendChild(ds);
        top.appendChild(mid);
        c.appendChild(top);
        const pips = document.createElement('div'); pips.className = 'pips';
        for (let i = 0; i < u.max; i++) { const p = document.createElement('i'); if (i < lv) p.className = 'on'; pips.appendChild(p); }
        c.appendChild(pips);
        const btn = document.createElement('button');
        const ok = GAME.canUpgrade(id);
        btn.className = 'btn' + (ok ? ' btn-green' : ''); btn.disabled = !ok;
        btn.dataset.act = 'buy-upgrade'; btn.dataset.id = id;
        if (lv >= u.max) btn.textContent = 'FITTED';
        else { btn.appendChild(UI.mkIcon('coin', 2)); btn.appendChild(document.createTextNode(GAME.fmt(GAME.garagePrice(id)))); }
        c.appendChild(btn);
        grid.appendChild(c);
      });
      box.appendChild(grid);
    } else if (tab === 'paint') {
      const sec = document.createElement('div');
      sec.className = 'gar-paint';
      const h1 = document.createElement('i'); h1.textContent = 'PAINT'; sec.appendChild(h1);
      const cols = document.createElement('div'); cols.className = 'pt-cols';
      const none = document.createElement('button');
      none.className = 'pt-col' + (!st.garage.col ? ' active' : ''); none.dataset.act = 'set-paint'; none.dataset.col = '';
      none.style.background = 'repeating-linear-gradient(45deg,#c9ced6 0 4px,#e8e2d0 4px 8px)'; none.title = 'Factory paint';
      cols.appendChild(none);
      BRAND_COLS.forEach(col => {
        const b = document.createElement('button');
        b.className = 'pt-col' + (st.garage.col === col ? ' active' : '');
        b.dataset.act = 'set-paint'; b.dataset.col = col; b.style.background = col; b.title = col;
        cols.appendChild(b);
      });
      sec.appendChild(cols);
      const h2 = document.createElement('i'); h2.textContent = 'DECAL'; sec.appendChild(h2);
      const decs = document.createElement('div'); decs.className = 'pt-size';
      CAR_DECALS.forEach(d => {
        const b = document.createElement('button');
        b.className = 'btn' + ((st.garage.decal || 'none') === d ? ' btn-green' : '');
        b.dataset.act = 'set-decal'; b.dataset.decal = d;
        b.textContent = d === 'logo' ? 'THE MARK' : d.toUpperCase();
        decs.appendChild(b);
      });
      sec.appendChild(decs);
      const note = document.createElement('p'); note.className = 'pedia-intro';
      note.textContent = 'Paint is free and purely for show. The van in the trip window, on the road and on the map wears it.';
      sec.appendChild(note);
      box.appendChild(sec);
    } else {
      const intro = document.createElement('p'); intro.className = 'pedia-intro';
      intro.textContent = 'How you drive to each town. The highway is quick but tolled, the lane is free, the scenic route pays a little more and takes its time. Weather and events on the map change the sums.';
      box.appendChild(intro);
      const list = document.createElement('div'); list.className = 'route-list';
      CITIES.forEach((c, i) => {
        const open = st.routes.includes(c.id), active = st.route === c.id;
        const prevOpen = i === 0 || st.routes.includes(CITIES[i - 1].id);
        const card = document.createElement('div');
        card.className = 'route-card' + (active ? ' active' : open ? ' open' : prevOpen ? ' next' : ' locked');
        card.appendChild(UI.cloneCanvas(SPR.skylineSprite(c.sky, 64, 30, 2)));
        const mid = document.createElement('div'); mid.className = 'rc-mid';
        const nm = document.createElement('b'); nm.textContent = c.name.toUpperCase(); mid.appendChild(nm);
        const l1 = document.createElement('span');
        l1.appendChild(UI.mkIcon('coin', 3)); l1.appendChild(document.createTextNode('x' + (c.mult * GAME.payMultTo(c.id)).toFixed(2)));
        l1.appendChild(UI.mkIcon('clock', 3)); l1.appendChild(document.createTextNode(GAME.fmtTime(GAME.tripTimeTo(c.id))));
        const ev = GAME.eventAt(c.id);
        if (ev) { l1.appendChild(UI.mkIcon(ROAD_EVENT_BY_ID[ev.id].icon, 3)); l1.appendChild(document.createTextNode(ROAD_EVENT_BY_ID[ev.id].name.toUpperCase())); }
        mid.appendChild(l1);
        if (open) {
          const styles = document.createElement('div'); styles.className = 'rc-styles';
          ROUTE_STYLE_KEYS.forEach(sid => {
            const rs = ROUTE_STYLES[sid];
            const b = document.createElement('button');
            b.className = 'btn btn-tiny' + (GAME.routeStyle(c.id).id === sid ? ' btn-green' : '');
            b.dataset.act = 'set-style'; b.dataset.city = c.id; b.dataset.style = sid;
            b.title = rs.desc;
            b.appendChild(UI.mkIcon(rs.icon, 2)); b.appendChild(document.createTextNode(rs.name.toUpperCase()));
            styles.appendChild(b);
          });
          mid.appendChild(styles);
        }
        card.appendChild(mid);
        const act = document.createElement('div'); act.className = 'rc-act';
        if (active) { const t = document.createElement('em'); t.textContent = 'DELIVERING HERE'; act.appendChild(t); }
        else if (open) { const b4 = document.createElement('button'); b4.className = 'btn'; b4.dataset.act = 'set-route'; b4.dataset.id = c.id; b4.disabled = st.truck.state !== 'parked'; b4.textContent = 'DELIVER HERE'; act.appendChild(b4); }
        else if (prevOpen) {
          const b5 = document.createElement('button'); b5.className = 'btn' + (st.coins >= c.cost ? ' btn-green' : ''); b5.disabled = st.coins < c.cost; b5.dataset.act = 'buy-route'; b5.dataset.id = c.id;
          b5.appendChild(UI.mkIcon('coin', 2)); b5.appendChild(document.createTextNode(GAME.fmt(c.cost))); act.appendChild(b5);
          const t = document.createElement('em'); t.textContent = 'survey the road'; act.appendChild(t);
        } else { const t = document.createElement('em'); t.textContent = 'further down the road'; act.appendChild(t); }
        card.appendChild(act);
        list.appendChild(card);
      });
      box.appendChild(list);
    }
  }
  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S;
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'garage-tab': tab = btn.dataset.tab; sig = ''; render(); UI.snd.plop(); break;
        case 'buy-upgrade': { if (GAME.buyUpgrade(btn.dataset.id)) { UI.snd.skill(); UI.floatText('FITTED', ev.clientX - 20, ev.clientY - 30, 'green', 'gear'); } else UI.snd.error(); sig = ''; render(); break; }
        case 'set-paint': { GAME.setPaint(btn.dataset.col || null, undefined); UI.snd.plop(); sig = ''; render(); break; }
        case 'set-decal': { GAME.setPaint(undefined, btn.dataset.decal); UI.snd.plop(); sig = ''; render(); break; }
        case 'set-style': { if (GAME.setRouteStyle(btn.dataset.city, btn.dataset.style)) UI.snd.plop(); sig = ''; render(); break; }
        case 'buy-vehicle': case 'set-route': case 'buy-route': { setTimeout(() => { sig = ''; if (!$('#modal-garage').hidden) render(); }, 0); break; }
      }
    });
  }
  return { init, open, render };
})();

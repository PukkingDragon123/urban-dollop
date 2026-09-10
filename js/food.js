/* ============================================================
   INF EGG CO. - THE PANTRY
   Produce comes off the field with every harvest; the Cannery
   turns it into goods. Sell either, feed the super feed to the
   flock, and pick what the Cannery makes.
   ============================================================ */
'use strict';

window.FOODUI = (() => {
  let UI = null, $ = null, S = null;
  let tab = 'produce', sig = '';

  function open(t) {
    if (t) tab = t;
    sig = '';
    render();
    UI.openModal('#modal-food');
  }
  function card(id, spr, name, count, value, btns) {
    const c = document.createElement('div');
    c.className = 'food-card' + (count ? '' : ' empty');
    const top = document.createElement('div');
    top.className = 'fc-top';
    top.appendChild(UI.cloneCanvas(spr, 4));
    const mid = document.createElement('div');
    const nm = document.createElement('b'); nm.textContent = name.toUpperCase(); mid.appendChild(nm);
    const ct = document.createElement('span'); ct.textContent = 'x' + GAME.fmt(count); mid.appendChild(ct);
    top.appendChild(mid);
    c.appendChild(top);
    if (value) {
      const v = document.createElement('div');
      v.className = 'fc-val';
      v.appendChild(UI.mkIcon('coin', 2));
      v.appendChild(document.createTextNode(GAME.fmt(value) + ' EACH'));
      c.appendChild(v);
    }
    const row = document.createElement('div');
    row.className = 'fc-btns';
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.cls ? ' ' + b.cls : '');
      Object.keys(b.data).forEach(k => btn.dataset[k] = b.data[k]);
      btn.disabled = !!b.disabled;
      btn.textContent = b.label;
      row.appendChild(btn);
    });
    c.appendChild(row);
    return c;
  }
  function render() {
    const box = $('#food-body');
    if (!box) return;
    const st = S();
    const s2 = tab + '|' + JSON.stringify(st.pantry) + JSON.stringify(st.goods) + JSON.stringify(st.bugjar) + Object.keys(st.canneries).map(k => st.canneries[k].recipe + (st.canneries[k].cook ? Math.round(st.canneries[k].cook.t) : '')).join() + '|' + Math.floor(st.premiumT);
    if (s2 === sig) return;
    sig = s2;
    $('#food-sub').textContent = GAME.pantryTotal() + ' ITEMS' + (st.premiumT > 0 ? '  -  SUPER FEED FOR ' + GAME.fmtTime(st.premiumT) : '') + (GAME.hasCannery() ? '' : '  -  NO CANNERY YET');
    box.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'food-tabs';
    [['produce', 'PRODUCE', 'seed'], ['bugs', 'THE BUG JAR', 'bowl'], ['goods', 'GOODS', 'crate'], ['cannery', 'THE CANNERY', 'gear']].forEach(([id, name, icon]) => {
      const b = document.createElement('button');
      b.className = 'tab-btn' + (tab === id ? ' active' : '');
      b.dataset.act = 'food-tab'; b.dataset.tab = id;
      b.appendChild(UI.mkIcon(icon, 2)); b.appendChild(document.createTextNode(name));
      tabs.appendChild(b);
    });
    box.appendChild(tabs);
    const grid = document.createElement('div');
    grid.className = 'food-grid';
    if (tab === 'produce') {
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = 'Every harvest leaves a share of the crop here. Sell it, or let the Cannery have it.';
      box.appendChild(intro);
      PRODUCE_KEYS.forEach(id => {
        const n = GAME.pantryCount(id), P = PRODUCE[id];
        const crop = CROPS[P.crop];
        if (!n && !GAME.cropOpen(P.crop)) return;
        grid.appendChild(card(id, SPR.produceSprite(id, 1), P.name, n, Math.round(P.val * (1 + 0.15 * GAME.lvl('value'))),
          [{ label: 'SELL 1', data: { act: 'sell-produce', id, n: 1 }, disabled: n < 1 },
           { label: 'SELL ALL', data: { act: 'sell-produce', id, n: 0 }, disabled: n < 1, cls: n ? 'btn-green' : '' }]));
      });
    } else if (tab === 'bugs') {
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = GAME.jarCount()
        ? 'Dug up, picked up or farmed. Tip a handful over the flock and watch them run, or sell the jar to the bait trade.'
        : 'Empty. Install The Spade in the Lab (FARM lane), then dig anywhere on your land - turned soil is best.';
      box.appendChild(intro);
      /* the jar itself, and what you can do with the whole thing */
      const jar = document.createElement('div');
      jar.className = 'food-card' + (GAME.jarCount() ? '' : ' empty');
      const jtop = document.createElement('div');
      jtop.className = 'fc-top';
      jtop.appendChild(UI.cloneCanvas(SPR.bugSprite('worm', 0, 1), 4));
      const jmid = document.createElement('div');
      const jn = document.createElement('b'); jn.textContent = 'THE JAR'; jmid.appendChild(jn);
      const jc = document.createElement('span'); jc.textContent = GAME.jarCount() + ' BUGS  -  WORTH ' + GAME.fmt(GAME.jarValue()); jmid.appendChild(jc);
      jtop.appendChild(jmid);
      jar.appendChild(jtop);
      const jrow = document.createElement('div');
      jrow.className = 'fc-btns';
      [['SCATTER A HANDFUL', 'scatter-bugs', GAME.jarCount() < 1, 'btn-green'], ['SELL THE JAR', 'sell-jar', GAME.jarCount() < 1, '']].forEach(([label, act, dis, cls]) => {
        const b = document.createElement('button');
        b.className = 'btn' + (cls ? ' ' + cls : '');
        b.dataset.act = act;
        b.disabled = dis;
        b.textContent = label;
        jrow.appendChild(b);
      });
      jar.appendChild(jrow);
      grid.appendChild(jar);
      BUG_KEYS.forEach(id => {
        const n = st.bugjar[id] || 0, B = BUGS[id];
        const c = card(id, SPR.bugSprite(id, 0, 1), B.name, n, B.value,
          [{ label: 'SELL 1', data: { act: 'sell-bug', id, n: 1 }, disabled: n < 1 },
           { label: 'SCATTER 1', data: { act: 'scatter-bug', id }, disabled: n < 1, cls: n ? 'btn-green' : '' }]);
        const d = document.createElement('p'); d.className = 'fc-desc'; d.textContent = B.desc;
        c.insertBefore(d, c.lastChild);
        grid.appendChild(c);
      });
    } else if (tab === 'goods') {
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = GAME.hasCannery() ? 'What the Cannery has made. Worth far more than the produce that went in.' : 'Research Food Processing and build a Cannery to fill this shelf.';
      box.appendChild(intro);
      GOODS_KEYS.forEach(id => {
        const n = GAME.goodsCount(id), G = GOODS[id];
        if (!n && !GAME.hasCannery()) return;
        const btns = G.feed
          ? [{ label: 'FEED THE FLOCK', data: { act: 'use-goods', id }, disabled: n < 1, cls: n ? 'btn-green' : '' }]
          : [{ label: 'SELL 1', data: { act: 'sell-goods', id, n: 1 }, disabled: n < 1 },
             { label: 'SELL ALL', data: { act: 'sell-goods', id, n: 0 }, disabled: n < 1, cls: n ? 'btn-green' : '' }];
        const c = card(id, SPR.goodsSprite(id, 1), G.name, n, G.val ? Math.round(G.val * (1 + 0.15 * GAME.lvl('value')) * GAME.dishMult()) : 0, btns);
        if (G.desc) { const d = document.createElement('p'); d.className = 'fc-desc'; d.textContent = G.desc; c.insertBefore(d, c.lastChild); }
        grid.appendChild(c);
      });
    } else {
      const intro = document.createElement('p');
      intro.className = 'pedia-intro';
      intro.textContent = GAME.hasCannery()
        ? 'Pick a recipe. Every Cannery on the ranch makes it whenever the pantry can cover it.'
        : 'No Cannery yet. Research Food Processing in the Lab (FARM lane), then build one from the FARM shelf.';
      box.appendChild(intro);
      const cur = Object.values(st.canneries)[0];
      GOODS_KEYS.forEach(id => {
        const G = GOODS[id];
        const c = document.createElement('div');
        c.className = 'food-card recipe' + (cur && cur.recipe === id ? ' active' : '') + (GAME.canMake(id) ? '' : ' short');
        const top = document.createElement('div');
        top.className = 'fc-top';
        top.appendChild(UI.cloneCanvas(SPR.goodsSprite(id, 1), 4));
        const mid = document.createElement('div');
        const nm = document.createElement('b'); nm.textContent = G.name.toUpperCase(); mid.appendChild(nm);
        const val = document.createElement('span'); val.textContent = G.feed ? G.feed + ' PREMIUM FEED' : 'WORTH ' + GAME.fmt(G.val) + '  -  ' + G.time + 'S'; mid.appendChild(val);
        top.appendChild(mid);
        c.appendChild(top);
        const need = document.createElement('div');
        need.className = 'fc-need';
        Object.keys(G.need).forEach(pk => {
          const chip = document.createElement('span');
          chip.className = 'chip' + (GAME.pantryCount(pk) >= G.need[pk] ? ' ok' : ' no');
          chip.appendChild(UI.cloneCanvas(SPR.produceSprite(pk, 1), 2));
          chip.appendChild(document.createTextNode(GAME.pantryCount(pk) + '/' + G.need[pk]));
          chip.title = PRODUCE[pk].name;
          need.appendChild(chip);
        });
        c.appendChild(need);
        const row = document.createElement('div');
        row.className = 'fc-btns';
        const btn = document.createElement('button');
        btn.className = 'btn' + (cur && cur.recipe === id ? ' btn-green' : '');
        btn.dataset.act = 'set-cannery'; btn.dataset.id = id;
        btn.disabled = !GAME.hasCannery() || (cur && cur.recipe === id);
        btn.textContent = cur && cur.recipe === id ? 'MAKING THIS' : 'MAKE THIS';
        row.appendChild(btn);
        c.appendChild(row);
        grid.appendChild(c);
      });
    }
    box.appendChild(grid);
  }
  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S;
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.act) {
        case 'food-tab': tab = btn.dataset.tab; sig = ''; render(); UI.snd.plop(); break;
        case 'sell-produce': {
          const got = GAME.sellProduce(btn.dataset.id, +btn.dataset.n || undefined);
          if (got) { UI.snd.coin(); UI.floatText('+' + GAME.fmt(got), ev.clientX - 20, ev.clientY - 30, 'gold', 'coin'); } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'sell-goods': {
          const got = GAME.sellGoods(btn.dataset.id, +btn.dataset.n || undefined);
          if (got) { UI.snd.coin(); UI.floatText('+' + GAME.fmt(got), ev.clientX - 20, ev.clientY - 30, 'gold', 'coin'); } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'use-goods': { if (GAME.useGoods(btn.dataset.id)) { UI.snd.sparkle(); UI.floatText('SUPER FEED IN THE BARN', ev.clientX - 60, ev.clientY - 30, 'green', 'seed'); } else UI.snd.error(); sig = ''; render(); break; }
        case 'scatter-bugs': {
          const n = GAME.scatterBugs(6);
          if (n) { UI.snd.sprinkle(); UI.closeModals(); } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'scatter-bug': {
          const kind = btn.dataset.id;
          if ((S().bugjar[kind] || 0) > 0) {
            S().bugjar[kind]--;
            if (S().bugjar[kind] <= 0) delete S().bugjar[kind];
            const flock = S().chickens;
            const host = flock.length ? flock[(Math.random() * flock.length) | 0] : null;
            GAME.spawnBug(kind, host ? host.x + 10 + (Math.random() * 30 - 15) : UI.W.mama.x, host ? host.y + 16 : UI.W.mama.y + 20);
            UI.snd.plop(); UI.closeModals();
          } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'sell-jar': {
          const got = GAME.sellJar();
          if (got) { UI.snd.coin(); UI.floatText('+' + GAME.fmt(got), ev.clientX - 20, ev.clientY - 30, 'gold', 'coin'); } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'sell-bug': {
          const kind = btn.dataset.id;
          if ((S().bugjar[kind] || 0) > 0) {
            S().bugjar[kind]--;
            if (S().bugjar[kind] <= 0) delete S().bugjar[kind];
            GAME.earn(BUGS[kind].value);
            UI.snd.coin(); UI.floatText('+' + GAME.fmt(BUGS[kind].value), ev.clientX - 20, ev.clientY - 30, 'gold', 'coin');
          } else UI.snd.error();
          sig = ''; render(); break;
        }
        case 'set-cannery': { if (GAME.setAllCanneries(btn.dataset.id)) UI.snd.build(); else UI.snd.error(); sig = ''; render(); UI.refreshInspect(); break; }
      }
    });
    GAME.on('canned', () => { if (!$('#modal-food').hidden) render(); });
    GAME.on('produce', () => { if (!$('#modal-food').hidden) render(); });
  }
  return { init, open, render };
})();

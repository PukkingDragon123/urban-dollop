/* ============================================================
   INF EGG CO. - WORK ORDERS
   The founder does not stand over you explaining the job any
   more. It comes down as paperwork: a numbered order, a scope,
   a list of things to tick off and a reward you sign for.
   The clipboard sits under the readout; the full book of orders
   is the board.
   ============================================================ */
'use strict';

window.QUESTS_UI = (() => {
  let UI = null, $ = null, S = null;
  let sig = '', collapsed = false, sel = null, boardSig = '';

  const orderNo = q => 'WO-' + String(QUESTS.indexOf(q) + 1).padStart(3, '0');
  let openDept = null;
  const DEPT = { 'THE FARM': 'HUSBANDRY', 'THE BUSINESS': 'OPERATIONS', 'THE COMPANY': 'EXPANSION',
                 'THE EMPIRE': 'OVERSEAS', 'THE STARS': 'SPECIAL PROJECTS' };
  function rewardChips(q, into) {
    if (q.rw.c) { into.appendChild(UI.mkIcon('coin', 2)); into.appendChild(document.createTextNode(GAME.fmt(q.rw.c))); }
    if (q.rw.f) { into.appendChild(UI.mkIcon('feather', 2)); into.appendChild(document.createTextNode(String(q.rw.f))); }
  }
  function objRow(o) {
    const [c, n] = GAME.goalProgress(o);
    const done = c >= n;
    const row = document.createElement('div');
    row.className = 'obj' + (done ? ' done' : '');
    const box = document.createElement('i');
    box.className = 'obj-box';
    if (done) box.appendChild(UI.mkIcon('tick', 1));
    row.appendChild(box);
    const lab = document.createElement('span');
    lab.textContent = (o.label || '').toUpperCase();
    row.appendChild(lab);
    if (n > 1) {
      const num = document.createElement('b');
      num.textContent = GAME.fmt(c) + '/' + GAME.fmt(n);
      row.appendChild(num);
      const rail = document.createElement('u');
      const fill = document.createElement('s');
      fill.style.width = Math.round(c / n * 100) + '%';
      rail.appendChild(fill);
      row.appendChild(rail);
    }
    return row;
  }

  /* ---- the clipboard under the readout ---- */
  function update() {
    const box = $('#todo-panel');
    if (!box) return;
    if (!UI.titleHidden) { if (!box.hidden) box.hidden = true; sig = ''; return; }
    const act = GAME.activeQuests();
    const s2 = collapsed + '|' + act.map(q => q.id + ':' + GAME.questState(q) + ':' +
      GAME.questObjs(q).map(o => GAME.goalProgress(o).join('/')).join(',')).join(';');
    if (s2 === sig && !box.hidden) return;
    sig = s2;
    box.hidden = false;
    box.innerHTML = '';
    box.classList.toggle('collapsed', collapsed);

    const head = document.createElement('div');
    head.className = 'td-head';
    head.dataset.act = 'todo-toggle';
    head.setAttribute('role', 'button');
    head.title = collapsed ? 'Show the work orders' : 'Roll the clipboard up';
    head.appendChild(UI.mkIcon('doc', 2));
    const ht = document.createElement('b');
    ht.textContent = 'WORK ORDERS';
    head.appendChild(ht);
    const ready = act.filter(GAME.questReady).length;
    const cnt = document.createElement('small');
    cnt.textContent = ready ? ready + ' TO SIGN' : act.length + ' OPEN';
    if (ready) cnt.classList.add('hot');
    head.appendChild(cnt);
    const open = document.createElement('button');
    open.className = 'td-open';
    open.dataset.act = 'open-quests';
    open.title = 'Open the order book';
    open.appendChild(UI.mkIcon('book', 2));
    head.appendChild(open);
    box.appendChild(head);
    if (collapsed) return;

    act.forEach(q => {
      const st = GAME.questState(q);
      const card = document.createElement('div');
      card.className = 'td-quest ' + st;
      card.dataset.act = 'quest-focus';
      card.dataset.id = q.id;
      card.title = orderNo(q) + ' - ' + q.name;
      const top = document.createElement('div');
      top.className = 'td-top';
      const no = document.createElement('u');
      no.className = 'td-no';
      no.textContent = orderNo(q);
      top.appendChild(no);
      const nm = document.createElement('b');
      nm.textContent = q.name.toUpperCase();
      top.appendChild(nm);
      const rw = document.createElement('em');
      rewardChips(q, rw);
      top.appendChild(rw);
      card.appendChild(top);
      if (st === 'ready') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-green td-claim';
        btn.dataset.act = 'claim-quest';
        btn.dataset.id = q.id;
        btn.appendChild(UI.mkIcon('tick', 2));
        btn.appendChild(document.createTextNode('SIGN FOR IT'));
        card.appendChild(btn);
      } else {
        const list = document.createElement('div');
        list.className = 'td-objs';
        GAME.questObjs(q).forEach(o => list.appendChild(objRow(o)));
        card.appendChild(list);
      }
      box.appendChild(card);
    });
  }

  /* ---- the order book ---- */
  function open(id) {
    if (id) sel = id;
    if (!sel || !QUEST_BY_ID[sel] || GAME.questState(QUEST_BY_ID[sel]) === 'later') {
      const cq = GAME.currentQuest();
      sel = cq ? cq.id : QUESTS[0].id;
    }
    const cur = QUEST_BY_ID[sel];
    if (cur) openDept = cur.chapter;
    boardSig = '';
    render();
    UI.openModal('#modal-quests');
  }
  function render() {
    const box = $('#quests-body');
    if (!box) return;
    const claimed = QUESTS.filter(GAME.questDone).length;
    const s2 = sel + '|' + openDept + '|' + QUESTS.map(q => GAME.questState(q) + GAME.questProgress(q).join('/')).join('');
    if (s2 === boardSig) return;
    boardSig = s2;
    $('#quests-sub').textContent = claimed + ' / ' + QUESTS.length + ' SIGNED OFF  -  ' +
      QUESTS.filter(GAME.questReady).length + ' AWAITING SIGNATURE';
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'qb-wrap';

    /* The file: five department drawers, one open at a time. The board
       used to list all forty-seven orders at once, most of them reading
       NOT YET ISSUED; now a drawer shows only what has actually been
       issued, and says how many are still to come. */
    const list = document.createElement('div');
    list.className = 'qb-list';
    const byDept = [];
    QUESTS.forEach((q, i) => {
      let d = byDept.find(x => x.chapter === q.chapter);
      if (!d) { d = { chapter: q.chapter, rows: [] }; byDept.push(d); }
      d.rows.push({ q, i, st: GAME.questState(q) });
    });
    if (!openDept || !byDept.some(d => d.chapter === openDept)) {
      const cur = QUEST_BY_ID[sel];
      openDept = cur ? cur.chapter : byDept[0].chapter;
    }
    byDept.forEach(d => {
      const issued = d.rows.filter(r => r.st !== 'later');
      const later = d.rows.length - issued.length;
      const ready = d.rows.filter(r => r.st === 'ready').length;
      const closed = d.rows.filter(r => r.st === 'claimed').length;
      const isOpen = d.chapter === openDept;
      const h = document.createElement('button');
      h.className = 'qb-dept' + (isOpen ? ' open' : '') + (ready ? ' hot' : '');
      h.dataset.act = 'quest-dept';
      h.dataset.dept = d.chapter;
      const arrow = document.createElement('u'); arrow.textContent = isOpen ? '-' : '+'; h.appendChild(arrow);
      const nm = document.createElement('b'); nm.textContent = DEPT[d.chapter] || d.chapter; h.appendChild(nm);
      const cnt = document.createElement('small');
      cnt.textContent = ready ? ready + ' TO SIGN' : closed + '/' + d.rows.length;
      if (ready) cnt.className = 'hot';
      h.appendChild(cnt);
      list.appendChild(h);
      if (!isOpen) return;
      const drawer = document.createElement('div');
      drawer.className = 'qb-drawer';
      issued.forEach(({ q, i, st }) => {
        const row = document.createElement('button');
        row.className = 'qb-row ' + st + (q.id === sel ? ' sel' : '');
        row.dataset.act = 'quest-sel';
        row.dataset.id = q.id;
        const no = document.createElement('u');
        no.className = 'td-no';
        no.textContent = String(i + 1).padStart(3, '0');
        row.appendChild(no);
        const nm2 = document.createElement('b');
        nm2.textContent = q.name.toUpperCase();
        row.appendChild(nm2);
        const tag = document.createElement('small');
        if (st === 'claimed') tag.textContent = 'CLOSED';
        else if (st === 'ready') { tag.textContent = 'SIGN'; tag.className = 'hot'; }
        else { const [c, n] = GAME.questProgress(q); tag.textContent = c + '/' + n; }
        row.appendChild(tag);
        drawer.appendChild(row);
      });
      if (later) {
        const rest = document.createElement('div');
        rest.className = 'qb-rest';
        rest.textContent = later + (later === 1 ? ' MORE ORDER TO COME' : ' MORE ORDERS TO COME');
        drawer.appendChild(rest);
      }
      list.appendChild(drawer);
    });
    wrap.appendChild(list);

    /* the order itself */
    const q = QUEST_BY_ID[sel];
    const det = document.createElement('div');
    det.className = 'qb-detail';
    if (q) {
      const st = GAME.questState(q);
      const head = document.createElement('div');
      head.className = 'qb-order';
      const left = document.createElement('div');
      const no = document.createElement('b');
      no.textContent = orderNo(q);
      left.appendChild(no);
      const dept = document.createElement('small');
      dept.textContent = (DEPT[q.chapter] || q.chapter) + '  -  ISSUED BY THE OFFICE OF THE FOUNDER';
      left.appendChild(dept);
      head.appendChild(left);
      const stamp = document.createElement('div');
      stamp.className = 'qb-stamp ' + st;
      stamp.textContent = st === 'claimed' ? 'CLOSED' : st === 'ready' ? 'COMPLETE' : st === 'active' ? 'OPEN' : 'PENDING';
      head.appendChild(stamp);
      det.appendChild(head);

      const title = document.createElement('div');
      title.className = 'qb-title';
      title.appendChild(UI.mkIcon(st === 'later' ? 'lock' : q.icon, 4));
      const tw = document.createElement('div');
      const tb = document.createElement('b');
      tb.textContent = st === 'later' ? 'NOT YET ISSUED' : q.name.toUpperCase();
      tw.appendChild(tb);
      const scope = document.createElement('span');
      scope.textContent = st === 'later'
        ? 'This order is released when the ones before it are closed.'
        : q.hint + '.';
      tw.appendChild(scope);
      title.appendChild(tw);
      det.appendChild(title);

      const objs = document.createElement('div');
      objs.className = 'qb-objs';
      const ot = document.createElement('i');
      ot.textContent = 'SCOPE OF WORK';
      objs.appendChild(ot);
      GAME.questObjs(q).forEach(o => objs.appendChild(objRow(o)));
      det.appendChild(objs);

      const where = document.createElement('div');
      where.className = 'qb-where';
      const wl = document.createElement('i');
      wl.textContent = 'SITE';
      where.appendChild(wl);
      const wv = document.createElement('span');
      wv.textContent = ({ mama: 'The nest, by the farmhouse', lab: 'The Lab', truck: 'The loading bay on the road',
                          road: 'The lay-by on the road', inc: 'The incubators', field: 'Out on the field' }[q.where] || 'The ranch').toUpperCase();
      where.appendChild(wv);
      det.appendChild(where);

      const foot = document.createElement('div');
      foot.className = 'qb-foot';
      const rw = document.createElement('div');
      rw.className = 'qb-reward';
      const rl = document.createElement('i');
      rl.textContent = 'PAYABLE ON COMPLETION  -  DELIVERED BY COMPANY CAR';
      rw.appendChild(rl);
      const rv = document.createElement('span');
      rewardChips(q, rv);
      rw.appendChild(rv);
      foot.appendChild(rw);
      if (st === 'ready') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-green';
        btn.dataset.act = 'claim-quest';
        btn.dataset.id = q.id;
        btn.appendChild(UI.mkIcon('tick', 2));
        btn.appendChild(document.createTextNode('SIGN FOR IT'));
        foot.appendChild(btn);
      } else if (st === 'active' && q.where === 'lab') {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.dataset.act = 'quest-lab';
        btn.dataset.id = q.id;
        btn.textContent = 'OPEN THE LAB';
        foot.appendChild(btn);
      }
      det.appendChild(foot);
    }
    wrap.appendChild(det);
    box.appendChild(wrap);

    const ready = QUESTS.filter(GAME.questReady).length;
    if (ready > 1) {
      const all = document.createElement('button');
      all.className = 'btn btn-green qb-all';
      all.dataset.act = 'claim-all';
      all.textContent = 'SIGN FOR ALL ' + ready;
      box.appendChild(all);
    }
  }

  function init(ui) {
    UI = ui; $ = ui.$; S = ui.S;
    document.getElementById('app').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      switch (btn.dataset.act) {
        case 'todo-toggle': collapsed = !collapsed; sig = ''; UI.snd.plop(); break;
        case 'quest-focus': if (ev.target.closest('.td-claim')) return; open(btn.dataset.id); UI.snd.build(); break;
        case 'quest-sel': { sel = btn.dataset.id; const qq = QUEST_BY_ID[sel]; if (qq) openDept = qq.chapter; boardSig = ''; render(); UI.snd.plop(); break; }
        case 'quest-dept': openDept = openDept === btn.dataset.dept ? null : btn.dataset.dept; boardSig = ''; render(); UI.snd.plop(); break;
        case 'claim-quest': {
          if (GAME.claimQuest(btn.dataset.id)) UI.snd.grand();
          else UI.snd.error();
          sig = ''; boardSig = '';
          if (!$('#modal-quests').hidden) render();
          break;
        }
        case 'claim-all': { const n = GAME.claimAll(); if (n) UI.snd.grand(); sig = ''; boardSig = ''; render(); break; }
        case 'quest-lab': UI.labOn(btn.dataset.id); break;
      }
    });
    GAME.on('quest', () => { sig = ''; boardSig = ''; if (!$('#modal-quests').hidden) render(); });
    GAME.on('questready', () => { sig = ''; boardSig = ''; if (!$('#modal-quests').hidden) render(); });
  }
  return { init, update, open, render };
})();

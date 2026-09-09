/* ============================================================
   INF EGG CO. - THE QUEST BOARD
   Several jobs at once, each a to-do list with tick boxes, the
   founder talking you through them, and a CLAIM button that sends
   the limousine round with the reward in a box.
   The to-do panel sits under the HUD; the board is a modal.
   ============================================================ */
'use strict';

window.QUESTS_UI = (() => {
  let UI = null, $ = null, S = null;
  let sig = '', collapsed = false, sel = null, boardSig = '';

  function rewardText(q) {
    return [q.rw.c ? GAME.fmt(q.rw.c) + ' COINS' : '', q.rw.f ? q.rw.f + ' FEATHERS' : ''].filter(Boolean).join(' + ');
  }
  function objRow(o, big) {
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

  /* ---- the to-do panel under the HUD ---- */
  function update() {
    const box = $('#todo-panel');
    if (!box) return;
    if (!UI.titleHidden) { if (!box.hidden) box.hidden = true; sig = ''; return; }
    const act = GAME.activeQuests();
    const b = GAME.boss();
    const line = b && b.line ? b.line : '';
    const s2 = collapsed + '|' + line + '|' + act.map(q => q.id + ':' + GAME.questState(q) + ':' + GAME.questObjs(q).map(o => GAME.goalProgress(o).join('/')).join(',')).join(';');
    if (s2 === sig && !box.hidden) return;
    sig = s2;
    box.hidden = false;
    box.innerHTML = '';
    box.classList.toggle('collapsed', collapsed);
    const head = document.createElement('div');
    head.className = 'td-head';
    head.dataset.act = 'todo-toggle';
    head.appendChild(UI.mkIcon('quest', 2));
    const ht = document.createElement('b');
    ht.textContent = 'TO DO';
    head.appendChild(ht);
    const ready = act.filter(GAME.questReady).length;
    const cnt = document.createElement('small');
    cnt.textContent = ready ? ready + ' TO CLAIM' : act.length + ' JOBS';
    if (ready) cnt.classList.add('hot');
    head.appendChild(cnt);
    const open = document.createElement('button');
    open.className = 'td-open';
    open.dataset.act = 'open-quests';
    open.title = 'Open the quest board';
    open.appendChild(UI.mkIcon('book', 2));
    head.appendChild(open);
    box.appendChild(head);
    if (collapsed) return;
    /* what the founder is saying right now */
    if (line) {
      const say = document.createElement('div');
      say.className = 'td-say';
      say.appendChild(UI.cloneCanvas(SPR.raccoonSprite(b.pose === 'cheer' ? 'cheer' : 'boss', 1, S().wardrobe), 2));
      const t = document.createElement('span');
      t.textContent = '"' + line + '"';
      say.appendChild(t);
      box.appendChild(say);
    }
    act.forEach(q => {
      const st = GAME.questState(q);
      const card = document.createElement('div');
      card.className = 'td-quest ' + st;
      card.dataset.act = 'quest-focus';
      card.dataset.id = q.id;
      const top = document.createElement('div');
      top.className = 'td-top';
      top.appendChild(UI.mkIcon(q.icon, 2));
      const nm = document.createElement('b');
      nm.textContent = q.name.toUpperCase();
      top.appendChild(nm);
      const rw = document.createElement('em');
      rw.textContent = rewardText(q);
      top.appendChild(rw);
      card.appendChild(top);
      if (st === 'ready') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-green td-claim';
        btn.dataset.act = 'claim-quest';
        btn.dataset.id = q.id;
        btn.appendChild(UI.mkIcon('star', 2));
        btn.appendChild(document.createTextNode('CLAIM'));
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

  /* ---- the board ---- */
  function open(id) {
    if (id) sel = id;
    if (!sel || !QUEST_BY_ID[sel] || GAME.questState(QUEST_BY_ID[sel]) === 'later') { const cq = GAME.currentQuest(); sel = cq ? cq.id : QUESTS[0].id; }
    boardSig = '';
    render();
    UI.openModal('#modal-quests');
  }
  function render() {
    const box = $('#quests-body');
    if (!box) return;
    const claimed = QUESTS.filter(GAME.questDone).length;
    const s2 = sel + '|' + QUESTS.map(q => GAME.questState(q) + GAME.questProgress(q).join('/')).join('');
    if (s2 === boardSig) return;
    boardSig = s2;
    $('#quests-sub').textContent = claimed + ' / ' + QUESTS.length + ' CLAIMED  -  ' + GAME.activeQuests().filter(GAME.questReady).length + ' WAITING';
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'qb-wrap';
    /* the list, by chapter */
    const list = document.createElement('div');
    list.className = 'qb-list';
    let chapter = null;
    QUESTS.forEach((q, i) => {
      if (q.chapter !== chapter) {
        chapter = q.chapter;
        const h = document.createElement('div');
        h.className = 'qb-chapter';
        h.textContent = chapter;
        list.appendChild(h);
      }
      const st = GAME.questState(q);
      const row = document.createElement('button');
      row.className = 'qb-row ' + st + (q.id === sel ? ' sel' : '');
      row.dataset.act = 'quest-sel';
      row.dataset.id = q.id;
      row.appendChild(UI.mkIcon(st === 'later' ? 'lock' : q.icon, 2));
      const nm = document.createElement('b');
      nm.textContent = st === 'later' ? '? ? ?' : q.name.toUpperCase();
      row.appendChild(nm);
      const tag = document.createElement('small');
      if (st === 'claimed') tag.textContent = 'DONE';
      else if (st === 'ready') { tag.textContent = 'CLAIM'; tag.className = 'hot'; }
      else if (st === 'active') { const [c, n] = GAME.questProgress(q); tag.textContent = c + '/' + n; }
      else tag.textContent = '#' + (i + 1);
      row.appendChild(tag);
      list.appendChild(row);
    });
    wrap.appendChild(list);
    /* the detail: the founder talking, then the to-do list, then the reward */
    const q = QUEST_BY_ID[sel];
    const det = document.createElement('div');
    det.className = 'qb-detail';
    if (q) {
      const st = GAME.questState(q);
      const talk = document.createElement('div');
      talk.className = 'qb-talk';
      const face = document.createElement('div');
      face.className = 'qb-face';
      face.appendChild(UI.cloneCanvas(SPR.raccoonSprite(st === 'claimed' ? 'cheer' : 'boss', 1, S().wardrobe), 4));
      talk.appendChild(face);
      const bub = document.createElement('div');
      bub.className = 'qb-bubble';
      const who = document.createElement('b');
      who.textContent = 'THE FOUNDER';
      bub.appendChild(who);
      const txt = document.createElement('span');
      txt.textContent = '"' + (st === 'claimed' && q.doneSay ? q.doneSay : st === 'later' ? 'One thing at a time. Finish what is on the board first.' : q.say) + '"';
      bub.appendChild(txt);
      talk.appendChild(bub);
      det.appendChild(talk);
      requestAnimationFrame(() => UI.paintCloud(bub, 14, false, { px: 3, fill: '#fff9ec', ink: '#2e2216' }));

      const head = document.createElement('div');
      head.className = 'qb-head';
      head.appendChild(UI.mkIcon(q.icon, 4));
      const hn = document.createElement('div');
      const b = document.createElement('b'); b.textContent = q.name.toUpperCase(); hn.appendChild(b);
      const c2 = document.createElement('small'); c2.textContent = q.chapter + '  -  QUEST ' + (QUESTS.indexOf(q) + 1) + ' OF ' + QUESTS.length; hn.appendChild(c2);
      head.appendChild(hn);
      const stamp = document.createElement('div');
      stamp.className = 'qb-stamp ' + st;
      stamp.textContent = st === 'claimed' ? 'CLAIMED' : st === 'ready' ? 'READY' : st === 'active' ? 'ACTIVE' : 'LATER';
      head.appendChild(stamp);
      det.appendChild(head);

      const objs = document.createElement('div');
      objs.className = 'qb-objs';
      const ot = document.createElement('i'); ot.textContent = 'TO DO'; objs.appendChild(ot);
      GAME.questObjs(q).forEach(o => objs.appendChild(objRow(o, true)));
      det.appendChild(objs);

      const foot = document.createElement('div');
      foot.className = 'qb-foot';
      const rw = document.createElement('div');
      rw.className = 'qb-reward';
      const rl = document.createElement('i'); rl.textContent = 'REWARD, BY LIMOUSINE'; rw.appendChild(rl);
      const rv = document.createElement('span');
      if (q.rw.c) { rv.appendChild(UI.mkIcon('coin', 2)); rv.appendChild(document.createTextNode(GAME.fmt(q.rw.c))); }
      if (q.rw.f) { rv.appendChild(UI.mkIcon('feather', 2)); rv.appendChild(document.createTextNode(String(q.rw.f))); }
      rw.appendChild(rv);
      foot.appendChild(rw);
      if (st === 'ready') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-green';
        btn.dataset.act = 'claim-quest'; btn.dataset.id = q.id;
        btn.appendChild(UI.mkIcon('star', 2)); btn.appendChild(document.createTextNode('CLAIM IT'));
        foot.appendChild(btn);
      } else if (st === 'active' && q.where === 'lab') {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.dataset.act = 'quest-lab'; btn.dataset.id = q.id;
        btn.textContent = 'OPEN THE LAB';
        foot.appendChild(btn);
      }
      det.appendChild(foot);
      if (q.hint && st !== 'claimed') {
        const hint = document.createElement('p');
        hint.className = 'qb-hint';
        hint.textContent = 'Where: ' + ({ mama: 'by Mama\'s nest', lab: 'the Lab', truck: 'the vehicle on the road', road: 'the lay-by on the road', inc: 'the incubator', field: 'out on the field' }[q.where] || 'the ranch') + '. ' + q.hint + '.';
        det.appendChild(hint);
      }
    }
    wrap.appendChild(det);
    box.appendChild(wrap);
    const ready = QUESTS.filter(GAME.questReady).length;
    if (ready > 1) {
      const all = document.createElement('button');
      all.className = 'btn btn-green qb-all';
      all.dataset.act = 'claim-all';
      all.textContent = 'CLAIM ALL ' + ready;
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
        case 'quest-sel': sel = btn.dataset.id; boardSig = ''; render(); UI.snd.plop(); break;
        case 'claim-quest': {
          if (GAME.claimQuest(btn.dataset.id)) { UI.snd.grand(); UI.floatText('THE LIMO IS ON ITS WAY', ev.clientX - 90, ev.clientY - 30, 'gold', 'car'); }
          else UI.snd.error();
          sig = ''; boardSig = ''; if (!$('#modal-quests').hidden) render();
          break;
        }
        case 'claim-all': { const n = GAME.claimAll(); if (n) UI.snd.grand(); sig = ''; boardSig = ''; render(); break; }
        case 'quest-lab': { UI.labOn(btn.dataset.id); break; }
      }
    });
    GAME.on('quest', () => { sig = ''; boardSig = ''; if (!$('#modal-quests').hidden) render(); });
    GAME.on('questready', () => { sig = ''; boardSig = ''; if (!$('#modal-quests').hidden) render(); });
  }
  return { init, update, open, render };
})();

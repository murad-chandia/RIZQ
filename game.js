/*
 * Tarteeb Rush: game logic.
 * All player-facing text comes from content.js (window.TARTEEB_CONTENT).
 */
(() => {
  'use strict';

  const C = window.TARTEEB_CONTENT;
  if (!C) { document.body.textContent = 'content.js failed to load.'; return; }

  /* ================= HELPERS ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  function h(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function weightedPick(weights) {
    const keys = Object.keys(weights);
    let total = 0;
    for (const k of keys) total += weights[k];
    let r = Math.random() * total;
    for (const k of keys) { r -= weights[k]; if (r <= 0) return k; }
    return keys[keys.length - 1];
  }

  // Resolve "meta.tagline" style paths into content.js
  function contentPath(path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), C);
  }

  /* ================= STORAGE (always wrapped) ================= */
  const store = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
    },
  };
  const KEYS = { high: 'tarteebRush.highScore' };

  /* ================= TUNING ================= */
  const POINTS = {
    deliver: 100,
    wrong: -50,
    wrongTime: 2,        // seconds lost on wrong station
    timeBonus: 20,       // per second left on clear
    fix: 300,            // fixing a problem after it triggers
    prevent: 600,        // fixing it before it triggers (double)
    junkTime: 3,         // seconds lost touching junk
  };
  const ACTIVITY = { perSecond: 4, deliver: 18, prevent: 45, fix: 25 };
  const DRAIN_PER_PROBLEM = 1.6; // readiness % per second while a problem is live
  const DRAG_THRESHOLD = 8; // px before a press becomes a drag

  /* ================= DOM ================= */
  const el = {
    app: $('#app'),
    screens: {
      start: $('#screen-start'),
      game: $('#screen-game'),
    },
    howto: $('#howto'),
    btnStart: $('#btn-start'),
    startBest: $('#start-best'),
    score: $('#hud-score'),
    timer: $('#hud-timer'),
    timerWrap: $('#hud-timer').parentElement,
    timerLabel: $('#hud-timer-label'),
    level: $('#hud-level'),
    meterFill: $('#meter-fill'),
    meterText: $('#meter-text'),
    btnPause: $('#btn-pause'),
    arena: $('#arena'),
    supply: $('#supply'),
    stations: $('#stations'),
    layer: $('#layer'),
    npcs: $('#npcs'),
    runway: $('#runway'),
    runner: $('#runner'),
    runnerCarry: $('#runner-carry'),
    toasts: $('#toasts'),
    banner: $('#banner'),
    trackerName: $('#tracker-name'),
    trackerFill: $('#tracker-fill'),
    trackerCount: $('#tracker-count'),
    tickerTrack: $('#ticker-track'),
    overlay: $('#overlay'),
    cardKicker: $('#card-kicker'),
    cardTitle: $('#card-title'),
    cardBody: $('#card-body'),
    cardActions: $('#card-actions'),
  };
  const stationEls = {};

  /* ================= STATE ================= */
  const state = {
    screen: 'start',
    levelIndex: 0,
    running: false,
    paused: false,
    timeLeft: 0,
    readiness: 0,
    score: 0,
    levelStartScore: 0,
    combo: 0,
    spawnTimer: 0,
    nextId: 1,
    items: [],
    problems: [],
    junk: [],
    npcs: [],
    problemTimer: 0,
    junkTimer: 0,
    tickerTimer: 0,
    activity: 0,
    chaosTimer: 0,
    messageTimer: 0,
    toSpawn: 0,
    counted: 0,
    roastDeck: [],
    runner: { x: 0, targetX: 0, dir: 1, pause: 0 },
    selected: null,
    drag: null,
    highScore: store.get(KEYS.high, 0),
    stats: null,
  };

  function freshStats() {
    return { delivered: 0, wrong: 0, maxCombo: 0, prevented: 0, triggered: 0, lateFixes: 0, junkCaught: 0 };
  }

  const level = () => C.levels[state.levelIndex];
  const rules = () => level().rules;
  const isDismantle = () => rules().mode === 'dismantle';

  /* ================= SCREENS & CARDS ================= */
  function setScreen(name) {
    state.screen = name;
    for (const key in el.screens) el.screens[key].classList.toggle('active', key === name);
  }

  // buttons: [{ label, primary, onClick }]
  function showCard({ kicker = '', title = '', body = null, buttons = [] }) {
    el.overlay.querySelector('.card').classList.remove('roast');
    el.cardKicker.textContent = kicker;
    el.cardTitle.textContent = title;
    el.cardBody.replaceChildren();
    if (body) el.cardBody.append(...[].concat(body));
    el.cardActions.replaceChildren();
    for (const b of buttons) {
      const btn = h('button', 'btn ' + (b.primary ? 'btn-primary' : 'btn-ghost'), b.label);
      btn.type = 'button';
      btn.addEventListener('click', () => { b.onClick(); });
      el.cardActions.appendChild(btn);
    }
    el.overlay.hidden = false;
    const card = el.overlay.querySelector('.card');
    card.style.animation = 'none';
    void card.offsetWidth; // restart entrance animation
    card.style.animation = '';
    const first = el.cardActions.querySelector('.btn-primary');
    if (first) first.focus({ preventScroll: true });
  }
  function hideCard() { el.overlay.hidden = true; }

  function para(text, cls) { return h('p', cls || '', text); }

  function scoreTable(rows) {
    const table = h('table', 'score-table');
    for (const [label, value, cls] of rows) {
      const tr = h('tr', cls || '');
      tr.append(h('td', '', label), h('td', '', value));
      table.appendChild(tr);
    }
    return table;
  }

  /* ================= SETUP ================= */
  function fillStaticText() {
    document.querySelectorAll('[data-text]').forEach(node => {
      const v = contentPath(node.dataset.text);
      if (v != null) node.textContent = v;
    });
    el.howto.replaceChildren(...C.ui.howTo.map(t => h('li', '', t)));
    el.btnStart.textContent = C.ui.startButton;
    renderBest();
  }

  function renderBest() {
    el.startBest.textContent = state.highScore > 0 ? fill(C.ui.highScore, { score: fmt(state.highScore) }) : '';
  }

  function buildStations() {
    el.stations.replaceChildren();
    for (const s of C.stations) {
      const node = h('div', 'station');
      node.dataset.station = s.id;
      node.append(h('span', 'station-icon', s.icon), h('span', 'station-name', s.name), h('span', 'station-count', ''));
      el.stations.appendChild(node);
      stationEls[s.id] = node;
    }
    const st = C.storage;
    const storage = h('div', 'station storage');
    storage.dataset.station = 'storage';
    storage.append(h('span', 'station-icon', st.icon), h('span', 'station-name', st.name), h('span', 'station-count', ''));
    el.stations.appendChild(storage);
    stationEls.storage = storage;
  }

  // Apply per-level station names and show Storage only when dismantling.
  function applyStations() {
    const renames = level().stationNames || {};
    for (const s of C.stations) {
      const node = stationEls[s.id];
      const r = renames[s.id] || {};
      node.querySelector('.station-icon').textContent = r.icon || s.icon;
      node.querySelector('.station-name').textContent = r.name || s.name;
      node.style.order = '';
    }
    el.stations.classList.toggle('dismantle', isDismantle());
  }

  function shuffleStations() {
    const order = C.stations.map((s, i) => i).sort(() => Math.random() - 0.5);
    C.stations.forEach((s, i) => { stationEls[s.id].style.order = String(order[i]); });
  }

  /* ================= GEOMETRY ================= */
  function itemSize() {
    return parseFloat(getComputedStyle(el.app).getPropertyValue('--item')) || 64;
  }
  function localRect(node) {
    const a = el.arena.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height };
  }
  function toLocal(e) {
    const a = el.arena.getBoundingClientRect();
    return { x: e.clientX - a.left, y: e.clientY - a.top };
  }
  function stationAt(p) {
    for (const id in stationEls) {
      const r = localRect(stationEls[id]);
      if (!r.w) continue;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return id;
    }
    return null;
  }
  function stationCenter(id) {
    const r = localRect(stationEls[id]);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  /* ================= ITEMS ================= */
  function place(o) {
    o.el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
  }

  function freeSpot() {
    const size = itemSize();
    const sr = localRect(el.supply);
    const pad = 6;
    const minX = sr.x + pad, maxX = Math.max(minX, sr.x + sr.w - size - pad);
    const minY = sr.y + pad, maxY = Math.max(minY, sr.y + sr.h - size - pad);
    let best = null, bestD = -1;
    for (let i = 0; i < 16; i++) {
      const x = rand(minX, maxX), y = rand(minY, maxY);
      let d = Infinity;
      for (const it of state.items) d = Math.min(d, Math.hypot(it.homeX - x, it.homeY - y));
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    return best;
  }

  function spawnItem(type, extra = {}) {
    const def = extra.def || C.supplies[type];
    if (!def) return null;
    if (isDismantle() && !extra.station) {
      const ang = rand(0, Math.PI * 2), sp = rules().drift || 0;
      extra = { ...extra, station: 'storage', vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
    }
    const spot = freeSpot();
    const node = h('div', 'item spawn');
    const inner = h('div', 'item-inner');
    inner.style.setProperty('--bob-delay', `${rand(0, 2).toFixed(2)}s`);
    inner.append(h('span', 'item-emoji', def.emoji), h('span', 'item-label', def.label));
    node.appendChild(inner);
    const item = {
      id: state.nextId++, type, station: def.station,
      x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y,
      el: node, ...extra,
    };
    place(item);
    el.layer.appendChild(node);
    state.items.push(item);
    setTimeout(() => node.classList.remove('spawn'), 400);
    return item;
  }

  function removeItem(item, toward) {
    state.items = state.items.filter(i => i !== item);
    if (state.selected === item) clearSelection();
    if (toward) {
      const size = itemSize();
      item.el.classList.add('delivered');
      item.el.style.transform = `translate3d(${toward.x - size / 2}px, ${toward.y - size / 2}px, 0) scale(.3)`;
      setTimeout(() => item.el.remove(), 280);
    } else {
      item.el.remove();
    }
  }

  function returnHome(item) {
    item.el.classList.add('moving');
    item.x = item.homeX; item.y = item.homeY;
    place(item);
    setTimeout(() => item.el.classList.remove('moving'), 240);
  }

  function clearItems() {
    for (const it of state.items) it.el.remove();
    state.items = [];
    for (const j of state.junk) j.el.remove();
    state.junk = [];
    clearProblems();
    el.toasts.replaceChildren();
    el.banner.replaceChildren();
    state.selected = null;
    state.drag = null;
    el.layer.querySelectorAll('.flash').forEach(n => n.remove());
  }

  /* ================= SELECTION ================= */
  function select(item) {
    clearSelection();
    state.selected = item;
    item.el.classList.add('selected');
    for (const id in stationEls) stationEls[id].classList.add('armed');
  }
  function clearSelection() {
    if (state.selected) state.selected.el.classList.remove('selected');
    state.selected = null;
    for (const id in stationEls) stationEls[id].classList.remove('armed', 'hover');
  }

  /* ================= FEEDBACK ================= */
  function flash(text, x, y, cls = 'good') {
    const node = h('div', 'flash ' + cls, text);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    el.layer.appendChild(node);
    setTimeout(() => node.remove(), 950);
  }

  function shake() {
    el.screens.game.classList.remove('shake');
    void el.screens.game.offsetWidth;
    el.screens.game.classList.add('shake');
  }

  function bumpStation(id, cls) {
    const node = stationEls[id];
    node.classList.remove('hit', 'miss');
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /* ================= SCORING ================= */
  function comboMult() {
    return Math.min(3, 1 + Math.floor(state.combo / 4) * 0.5);
  }
  function addScore(pts) {
    state.score = Math.max(0, state.score + pts);
  }
  function addReadiness(pct) {
    state.readiness = clamp(state.readiness + pct, 0, 100);
    if (state.readiness >= 99.99 && state.running) { state.readiness = 100; levelClear(); }
  }


  /* ================= TOASTS & BANNER ================= */
  function deptName(id) {
    const d = C.departments.find(x => x.id === id);
    return d ? d.name : id;
  }

  function toast(from, text, cls = '') {
    const node = h('div', 'toast ' + cls);
    if (from) node.appendChild(h('span', 'toast-from', from));
    node.appendChild(document.createTextNode(text));
    el.toasts.appendChild(node);
    while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
    setTimeout(() => { node.classList.add('out'); setTimeout(() => node.remove(), 320); }, 3400);
  }

  function banner(text, sub) {
    el.banner.replaceChildren();
    const inner = h('div', 'banner-inner', text);
    if (sub) inner.appendChild(h('small', '', sub));
    el.banner.appendChild(inner);
    setTimeout(() => { if (inner.parentNode) inner.remove(); }, 1550);
  }

  /* ================= NPCs (other departments) ================= */
  function buildNpcs() {
    el.npcs.replaceChildren();
    state.npcs = C.departments.map(d => {
      const node = h('div', 'npc');
      const bubble = h('span', 'npc-bubble');
      node.append(bubble, h('div', 'npc-body', d.short));
      node.title = d.name;
      el.npcs.appendChild(node);
      return { dept: d, el: node, bubble, mood: '', moodTimer: 0 };
    });
  }

  function setMood(npc, mood) {
    npc.mood = mood;
    npc.el.className = 'npc ' + mood;
    npc.bubble.textContent = C.npcMoods[mood] || '';
  }

  function levelMoods() {
    return rules().npcMoods || ['sleep', 'phone', 'typing'];
  }

  function resetNpcs() {
    const moods = levelMoods();
    for (const n of state.npcs) { setMood(n, pick(moods)); n.moodTimer = rand(2, 6); }
  }

  function updateNpcs(dt) {
    const moods = levelMoods();
    for (const n of state.npcs) {
      n.moodTimer -= dt;
      if (n.moodTimer <= 0) { setMood(n, pick(moods)); n.moodTimer = rand(3, 7); }
    }
  }

  /* ================= JUNK (useless items NPCs drop) ================= */
  function dropJunk(npc) {
    const def = pick(C.junk);
    const a = localRect(npc.el);
    const node = h('div', 'junk');
    node.append(h('span', 'junk-emoji', def.emoji), h('span', '', def.label));
    el.layer.appendChild(node);
    const w = node.offsetWidth || 110;
    const arenaW = el.arena.clientWidth;
    const j = {
      def, el: node, w,
      x: clamp(a.x + a.w / 2 - w / 2, 4, arenaW - w - 4),
      y: a.y + a.h - 6,
      vy: rules().junkSpeed || rand(55, 75),
      sway: rand(0, Math.PI * 2),
      baseX: 0,
    };
    j.baseX = j.x;
    place(j);
    state.junk.push(j);
    npc.el.classList.remove('drop'); void npc.el.offsetWidth; npc.el.classList.add('drop');
  }

  function updateJunk(dt) {
    const limit = localRect(el.stations).y + 10;
    for (const j of state.junk.slice()) {
      j.y += j.vy * dt;
      j.sway += dt * 2.2;
      j.x = j.baseX + Math.sin(j.sway) * 12;
      place(j);
      if (j.y > limit) removeJunk(j, false);
    }
  }

  function removeJunk(j, caught) {
    state.junk = state.junk.filter(x => x !== j);
    if (caught) { j.el.classList.add('caught'); setTimeout(() => j.el.remove(), 220); }
    else j.el.remove();
  }

  function catchJunk(j) {
    removeJunk(j, true);
    state.stats.junkCaught++;
    state.timeLeft = Math.max(0, state.timeLeft - POINTS.junkTime);
    state.combo = 0;
    flash(fill(C.junkCaught, { label: j.def.label, s: POINTS.junkTime }), j.x + j.w / 2, j.y, 'bad');
    shake();
  }

  /* ================= PROBLEMS (initiative mechanic) ================= */
  function spawnProblem(forced) {
    const busy = new Set(state.problems.map(p => p.station));
    const options = C.problems.filter(p => !busy.has(p.station) && (!rules().problems || rules().problems.includes(p.id)));
    if (!options.length) return false;
    const def = pick(options);
    const stationNode = stationEls[def.station];
    const chip = h('div', 'station-alert');
    const label = h('span', '', `${C.initiative.warnPrefix} ${def.warn} → ${def.fix.emoji}`);
    const bar = h('span', 'alert-bar');
    chip.append(label, bar);
    stationNode.appendChild(chip);
    stationNode.classList.add('warn');
    const warnTime = rules().warnTime || 6;
    const problem = { def, station: def.station, phase: 'warning', t: warnTime, warnTime, chip, label, bar, fixItem: null };
    problem.fixItem = spawnItem('fix:' + def.id, { def: { emoji: def.fix.emoji, label: def.fix.label, station: def.station }, problem });
    problem.fixItem.el.classList.add('fix');
    state.problems.push(problem);
    sfx('warn');
    return true;
  }

  function triggerProblem(p) {
    p.phase = 'live';
    p.label.textContent = `${C.initiative.livePrefix} ${p.def.live} → ${p.def.fix.emoji}`;
    p.bar.style.width = '0%';
    const node = stationEls[p.station];
    node.classList.remove('warn');
    node.classList.add('live');
    state.stats.triggered++;
    toast(`${deptName(p.def.from)} → Tarteeb`, p.def.message);
    sfx('alarm');
    shake();
  }

  function resolveProblem(p) {
    state.problems = state.problems.filter(x => x !== p);
    p.chip.remove();
    stationEls[p.station].classList.remove('warn', 'live');
  }

  function clearProblems() {
    for (const p of state.problems.slice()) resolveProblem(p);
  }

  function updateProblems(dt) {
    const r = rules();
    if (r.problemEvery > 0) {
      state.problemTimer -= dt;
      if (state.problemTimer <= 0) {
        if (state.problems.length < (r.maxProblems || 1)) spawnProblem();
        state.problemTimer = r.problemEvery * rand(0.8, 1.2);
      }
    }
    let live = 0;
    for (const p of state.problems) {
      if (p.phase === 'warning') {
        p.t -= dt;
        p.bar.style.width = `${clamp(p.t / p.warnTime, 0, 1) * 100}%`;
        if (p.t <= 0) triggerProblem(p);
      } else {
        live++;
      }
    }
    if (live) state.readiness = clamp(state.readiness - live * DRAIN_PER_PROBLEM * dt, 0, 100);
  }

  /* ================= DRIFT (Dismantling: items wander off) ================= */
  function driftItems(dt) {
    const size = itemSize();
    const sr = localRect(el.supply);
    for (const it of state.items) {
      if ((state.drag && state.drag.item === it) || it.el.classList.contains('moving')) continue;
      it.x += (it.vx || 0) * dt;
      it.y += (it.vy || 0) * dt;
      if (it.x < sr.x) { it.x = sr.x; it.vx = Math.abs(it.vx); }
      if (it.x > sr.x + sr.w - size) { it.x = sr.x + sr.w - size; it.vx = -Math.abs(it.vx); }
      if (it.y < sr.y) { it.y = sr.y; it.vy = Math.abs(it.vy); }
      if (it.y > sr.y + sr.h - size) { it.y = sr.y + sr.h - size; it.vy = -Math.abs(it.vy); }
      it.homeX = it.x; it.homeY = it.y;
      place(it);
    }
  }

  /* ================= RUNNER (Tarteeb is always moving) ================= */
  function sendRunner(x, emoji) {
    const w = el.runway.clientWidth;
    state.runner.targetX = clamp(x - 15, 0, Math.max(0, w - 30));
    state.runner.pause = 0;
    if (emoji) el.runnerCarry.textContent = emoji;
  }

  function updateRunner(dt) {
    const r = state.runner;
    const w = el.runway.clientWidth;
    if (r.pause > 0) { r.pause -= dt; return; }
    const dx = r.targetX - r.x;
    const speed = 210;
    if (Math.abs(dx) < 2) {
      r.pause = rand(0.05, 0.25);
      r.targetX = rand(0, Math.max(0, w - 30));
      const supplies = Object.values(C.supplies);
      el.runnerCarry.textContent = pick(supplies).emoji;
    } else {
      r.dir = Math.sign(dx);
      r.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    }
    el.runner.style.transform = `translateX(${r.x}px) scaleX(${r.dir})`;
    el.runnerCarry.style.transform = `translateX(-50%) scaleX(${r.dir})`;
  }

  /* ================= ACTIVITY TRACKER ================= */
  function buildTicker() {
    el.tickerTrack.replaceChildren();
    // Two copies so the marquee loops seamlessly.
    for (let copy = 0; copy < 2; copy++) {
      for (const d of C.departments) {
        const chip = h('span', 'ticker-chip');
        chip.dataset.dept = d.id;
        chip.append(h('b', '', d.name), h('span', 'ticker-status', pick(C.tracker.statuses)));
        el.tickerTrack.appendChild(chip);
      }
    }
    el.trackerName.textContent = C.tracker.tarteebLabel;
  }

  function updateTicker(dt) {
    state.tickerTimer -= dt;
    if (state.tickerTimer > 0) return;
    state.tickerTimer = rand(1.2, 2.6);
    const d = pick(C.departments);
    const status = pick(C.tracker.statuses);
    el.tickerTrack.querySelectorAll(`.ticker-chip[data-dept="${d.id}"]`).forEach(chip => {
      chip.querySelector('.ticker-status').textContent = status;
      chip.classList.remove('flip'); void chip.offsetWidth; chip.classList.add('flip');
    });
  }

  function addActivity(n) { state.activity += n; }

  /* ================= SOUND (stub until Phase 4) ================= */
  function sfx() {}

  function bumpCount(stationId) {
    const node = stationEls[stationId];
    const n = (parseInt(node.dataset.count, 10) || 0) + 1;
    node.dataset.count = String(n);
    const label = node.querySelector('.station-count');
    if (stationId === 'seating' && level().seatCounter) {
      label.textContent = fill(level().seatCounter, { n: Math.min(300, n * (rules().chairsPer || 1)) });
    } else {
      label.textContent = String(n);
    }
  }

  /* ================= CHAOS EVENTS ================= */
  const CHAOS_EFFECTS = {
    timeCut() { state.timeLeft = Math.max(1, state.timeLeft - (C.chaosTimeCut || 5)); shake(); },
    shuffle() { clearSelection(); shuffleStations(); },
    junkStorm() {
      state.npcs.forEach((n, i) => setTimeout(() => { if (state.running && !state.paused) dropJunk(n); }, i * 260));
    },
    blackout() {
      el.arena.classList.add('blackout');
      setTimeout(() => el.arena.classList.remove('blackout'), 3200);
    },
    rush() { for (let i = 0; i < 3; i++) spawnItem(weightedPick(rules().supplies)); },
    problems() { spawnProblem(); spawnProblem(); },
  };

  function triggerChaos() {
    const allowed = rules().chaos || [];
    const options = C.chaos.filter(c => allowed.includes(c.effect));
    if (!options.length) return;
    const ev = pick(options);
    toast(`${C.ui.chaosPrefix} · ${deptName(ev.from)}`, ev.text, 'chaos');
    sfx('chaos');
    const fn = CHAOS_EFFECTS[ev.effect];
    if (fn) fn();
  }

  /* ================= DELIVERY ================= */
  function deliver(item, stationId) {
    clearSelection();
    const c = stationCenter(stationId);
    if (item.station === stationId && item.problem) {
      removeItem(item, c);
      const p = item.problem;
      const early = p.phase === 'warning';
      resolveProblem(p);
      state.combo++;
      state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
      const pts = early ? POINTS.prevent : POINTS.fix;
      addScore(pts);
      bumpStation(stationId, 'hit');
      sendRunner(c.x, item.problem.def.fix.emoji);
      if (early) {
        state.stats.prevented++;
        addActivity(ACTIVITY.prevent);
        banner(C.initiative.banner, `+${pts} · ×2`);
        sfx('prevent');
      } else {
        state.stats.lateFixes++;
        addActivity(ACTIVITY.fix);
        flash(`${C.initiative.lateFix} +${pts}`, c.x, c.y - 10, 'good');
        sfx('deliver');
      }
      addReadiness(100 / rules().target);
    } else if (item.station === stationId) {
      removeItem(item, c);
      addActivity(ACTIVITY.deliver);
      sendRunner(c.x, (C.supplies[item.type] || {}).emoji);
      sfx('deliver');
      state.combo++;
      state.stats.delivered++;
      state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
      const mult = comboMult();
      const pts = Math.round(POINTS.deliver * mult);
      addScore(pts);
      flash(mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, c.x, c.y - 10, 'good');
      bumpStation(stationId, 'hit');
      bumpCount(stationId);
      if (isDismantle()) state.counted++;
      addReadiness(100 / rules().target);
    } else {
      returnHome(item);
      state.combo = 0;
      state.stats.wrong++;
      addScore(POINTS.wrong);
      state.timeLeft = Math.max(0, state.timeLeft - POINTS.wrongTime);
      flash(`${C.ui.wrongStation} −${POINTS.wrongTime}s`, c.x, c.y - 10, 'bad');
      bumpStation(stationId, 'miss');
      sfx('wrong');
      shake();
    }
  }

  /* ================= INPUT (pointer events only) ================= */
  function onPointerDown(e) {
    if (!state.running || state.paused || state.drag) return;
    const junkNode = e.target.closest('.junk');
    if (junkNode) {
      const j = state.junk.find(x => x.el === junkNode);
      if (j) { e.preventDefault(); catchJunk(j); }
      return;
    }
    const itemNode = e.target.closest('.item');
    if (itemNode) {
      const item = state.items.find(i => i.el === itemNode);
      if (!item) return;
      e.preventDefault();
      const p = toLocal(e);
      state.drag = { item, pid: e.pointerId, sx: p.x, sy: p.y, ox: p.x - item.x, oy: p.y - item.y, moved: false };
      item.el.classList.add('dragging');
      try { el.arena.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }
    const stationNode = e.target.closest('.station');
    if (stationNode && state.selected) {
      deliver(state.selected, stationNode.dataset.station);
      return;
    }
    clearSelection();
  }

  function onPointerMove(e) {
    const d = state.drag;
    if (!d || e.pointerId !== d.pid) return;
    const p = toLocal(e);
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > DRAG_THRESHOLD) {
      d.moved = true;
      if (state.selected) clearSelection();
    }
    if (!d.moved) return;
    const size = itemSize();
    const a = el.arena.getBoundingClientRect();
    d.item.x = clamp(p.x - d.ox, 0, a.width - size);
    d.item.y = clamp(p.y - d.oy, 0, a.height - size);
    place(d.item);
    const over = stationAt(p);
    for (const id in stationEls) stationEls[id].classList.toggle('hover', id === over);
  }

  function onPointerUp(e) {
    const d = state.drag;
    if (!d || e.pointerId !== d.pid) return;
    state.drag = null;
    d.item.el.classList.remove('dragging');
    for (const id in stationEls) stationEls[id].classList.remove('hover');
    if (!state.items.includes(d.item)) return; // removed mid-drag
    if (d.moved) {
      const st = e.type === 'pointerup' ? stationAt(toLocal(e)) : null;
      if (st) deliver(d.item, st);
      else returnHome(d.item);
    } else if (state.selected === d.item) {
      clearSelection();
    } else {
      select(d.item);
    }
  }

  /* ================= LEVEL FLOW ================= */
  function startRun() {
    state.score = 0;
    state.activity = 0;
    state.levelIndex = 0;
    setScreen('game');
    showIntro();
  }

  function showIntro() {
    const lv = level();
    prepareLevel();
    showCard({
      kicker: `Level ${state.levelIndex + 1} of ${C.levels.length}`,
      title: lv.title,
      body: para(lv.intro, 'card-quote'),
      buttons: [{ label: C.ui.goButton, primary: true, onClick: beginLevel }],
    });
  }

  function prepareLevel() {
    clearItems();
    state.running = false;
    state.paused = false;
    state.timeLeft = rules().duration;
    state.readiness = 0;
    state.combo = 0;
    state.spawnTimer = 0;
    state.problemTimer = rules().problemFirst != null ? rules().problemFirst : 5;
    state.junkTimer = (rules().junkEvery || 0) * rand(0.6, 1);
    state.chaosTimer = rules().chaosFirst != null ? rules().chaosFirst : (rules().chaosEvery || 0);
    state.messageTimer = (rules().messageEvery || 0) * 0.5;
    state.counted = 0;
    state.toSpawn = 0;
    el.arena.classList.remove('blackout');
    applyStations();
    el.timerLabel.textContent = level().timerLabel || 'Doors in';
    state.levelStartScore = state.score;
    state.stats = freshStats();
    el.level.textContent = `${state.levelIndex + 1}. ${level().title}`;
    resetNpcs();
    for (const id in stationEls) {
      stationEls[id].querySelector('.station-count').textContent = '';
      stationEls[id].dataset.count = '0';
      stationEls[id].classList.remove('armed', 'hover', 'hit', 'miss');
    }
    renderHud(true);
  }

  function beginLevel() {
    hideCard();
    // Start with a few supplies on the table so the player can act immediately.
    const r = rules();
    if (isDismantle()) {
      const start = Math.min(r.startItems || 8, r.target);
      for (let i = 0; i < start; i++) spawnItem(weightedPick(r.supplies));
      state.toSpawn = r.target - start;
      state.spawnTimer = r.spawnEvery;
    } else {
      for (let i = 0; i < Math.min(3, r.maxItems); i++) spawnItem(weightedPick(r.supplies));
    }
    state.running = true;
    lastTime = performance.now();
  }

  function levelClear() {
    state.running = false;
    clearSelection();
    const bonus = Math.ceil(state.timeLeft) * POINTS.timeBonus;
    addScore(bonus);
    const levelScore = state.score - state.levelStartScore;
    saveHigh();
    const isLast = state.levelIndex >= C.levels.length - 1;
    showCard({
      kicker: fill(C.ui.levelClearedKicker, { n: state.levelIndex + 1 }),
      title: level().title,
      body: [
        para(level().clearLine, 'card-quote'),
        scoreTable([
          ...(state.stats.prevented ? [[C.ui.prevented, String(state.stats.prevented)]] : []),
          [C.ui.timeBonus, `+${fmt(bonus)}`],
          [C.ui.levelScore, fmt(levelScore)],
          [C.ui.totalScore, fmt(state.score), 'total'],
        ]),
      ],
      buttons: isLast
        ? [{ label: C.ui.continueButton, primary: true, onClick: finishRun }]
        : [{ label: C.ui.continueButton, primary: true, onClick: showRoast }],
    });
  }

  function nextRoast() {
    if (!state.roastDeck.length) {
      state.roastDeck = C.roasts.slice().sort(() => Math.random() - 0.5);
    }
    return state.roastDeck.pop();
  }

  function showRoast() {
    const r = nextRoast();
    const them = h('div', 'roast-them');
    them.append(h('span', 'roast-dept', r.dept), h('p', 'roast-line', r.them));
    const parts = [them];
    if (r.tarteeb) {
      const us = h('div', 'roast-us');
      us.append(h('span', 'roast-dept', C.ui.roastTarteeb), h('p', 'roast-line', r.tarteeb));
      parts.push(us);
    }
    showCard({
      kicker: C.ui.roastKicker,
      title: '',
      body: parts,
      buttons: [{ label: C.ui.nextButton, primary: true, onClick: nextLevel }],
    });
    el.overlay.querySelector('.card').classList.add('roast');
  }

  // Replaced by the Department Showdown in Phase 4.
  function finishRun() {
    saveHigh();
    showCard({
      kicker: 'Run complete',
      title: fmt(state.score),
      body: para('Tarteeb: We don\'t wait for the plan. We are the plan.', 'card-quote'),
      buttons: [{ label: C.ui.playAgainButton, primary: true, onClick: startRun }],
    });
  }

  function nextLevel() {
    state.levelIndex++;
    showIntro();
  }

  function levelFail() {
    state.running = false;
    clearSelection();
    shake();
    showCard({
      kicker: C.ui.levelFailedKicker,
      title: fill(C.ui.levelFailedTitle, { pct: Math.floor(state.readiness) }),
      body: para(pick(C.failLines), 'card-quote'),
      buttons: [
        { label: C.ui.retryButton, primary: true, onClick: retryLevel },
        { label: C.ui.endRunButton, primary: false, onClick: endRun },
      ],
    });
  }

  function retryLevel() {
    state.score = state.levelStartScore;
    showIntro();
  }

  function endRun() {
    state.running = false;
    clearItems();
    saveHigh();
    hideCard();
    renderBest();
    setScreen('start');
  }

  function saveHigh() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      store.set(KEYS.high, state.highScore);
    }
  }

  /* ================= PAUSE ================= */
  function pause() {
    if (!state.running || state.paused) return;
    state.paused = true;
    if (state.drag) { returnHome(state.drag.item); state.drag.item.el.classList.remove('dragging'); state.drag = null; }
    showCard({
      kicker: level().title,
      title: C.ui.pausedTitle,
      body: para(C.ui.pausedBody),
      buttons: [
        { label: C.ui.resumeButton, primary: true, onClick: resume },
        { label: C.ui.endRunButton, primary: false, onClick: endRun },
      ],
    });
  }
  function resume() {
    hideCard();
    state.paused = false;
    lastTime = performance.now();
  }

  /* ================= LOOP ================= */
  let lastTime = performance.now();

  function update(dt) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) { state.timeLeft = 0; levelFail(); return; }

    // Spawn supplies
    const r = rules();
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.items.length < r.maxItems && (!isDismantle() || state.toSpawn > 0)) {
      spawnItem(weightedPick(r.supplies));
      if (isDismantle()) state.toSpawn--;
      state.spawnTimer = r.spawnEvery * rand(0.8, 1.25);
    }
    if (isDismantle()) driftItems(dt);

    if (r.chaosEvery > 0) {
      state.chaosTimer -= dt;
      if (state.chaosTimer <= 0) { triggerChaos(); state.chaosTimer = r.chaosEvery * rand(0.85, 1.15); }
    }
    if (r.messageEvery > 0 && level().messages && level().messages.length) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        const m = pick(level().messages);
        toast(deptName(m.from), m.text);
        state.messageTimer = r.messageEvery * rand(0.8, 1.2);
      }
    }

    updateProblems(dt);
    if (!state.running) return;

    if (r.junkEvery > 0) {
      state.junkTimer -= dt;
      if (state.junkTimer <= 0) {
        const awake = state.npcs.filter(n => n.mood !== 'dinner');
        if (awake.length) dropJunk(pick(awake));
        state.junkTimer = r.junkEvery * rand(0.7, 1.3);
      }
    }
    updateJunk(dt);
    updateNpcs(dt);
    addActivity(ACTIVITY.perSecond * dt);
  }

  const hudCache = {};
  function setText(node, key, value) {
    if (hudCache[key] !== value) { hudCache[key] = value; node.textContent = value; }
  }

  function renderHud(force) {
    if (force) for (const k in hudCache) delete hudCache[k];
    setText(el.score, 'score', fmt(state.score));
    setText(el.timer, 'timer', String(Math.ceil(state.timeLeft)));
    el.timerWrap.classList.toggle('urgent', state.running && state.timeLeft <= 10);
    const act = Math.floor(state.activity);
    if (hudCache.act !== act) {
      hudCache.act = act;
      el.trackerCount.textContent = fmt(act);
      const w = Math.min(100, 12 + act / 6);
      el.trackerFill.style.width = `${w}%`;
      el.trackerFill.classList.toggle('maxed', w >= 100);
    }
    const pct = Math.floor(state.readiness);
    const pctKey = pct + ':' + state.counted;
    if (hudCache.pct !== pctKey) {
      hudCache.pct = pctKey;
      el.meterFill.style.width = `${state.readiness}%`;
      el.meterText.textContent = isDismantle()
        ? fill(C.ui.counted, { n: state.counted, total: rules().target })
        : `${C.ui.readiness} ${pct}%`;
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (state.running && !state.paused) update(dt);
    if (state.screen === 'game') {
      if (!state.paused) { updateRunner(dt); updateTicker(dt); }
      renderHud(false);
    }
    requestAnimationFrame(frame);
  }

  /* ================= RESIZE ================= */
  function onResize() {
    if (state.screen !== 'game') return;
    const size = itemSize();
    const sr = localRect(el.supply);
    for (const it of state.items) {
      it.homeX = clamp(it.homeX, sr.x, Math.max(sr.x, sr.x + sr.w - size));
      it.homeY = clamp(it.homeY, sr.y, Math.max(sr.y, sr.y + sr.h - size));
      if (!state.drag || state.drag.item !== it) { it.x = it.homeX; it.y = it.homeY; place(it); }
    }
  }

  /* ================= BOOT ================= */
  function boot() {
    fillStaticText();
    buildStations();
    buildNpcs();
    buildTicker();
    el.btnStart.addEventListener('click', startRun);
    el.btnPause.addEventListener('click', pause);
    el.arena.addEventListener('pointerdown', onPointerDown);
    el.arena.addEventListener('pointermove', onPointerMove);
    el.arena.addEventListener('pointerup', onPointerUp);
    el.arena.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    requestAnimationFrame(frame);
  }

  boot();

  // Small hook for automated smoke tests.
  window.__tarteeb = { state, C };
})();

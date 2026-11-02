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
  const KEYS = { high: 'tarteebRush.highScore', muted: 'tarteebRush.muted', levelBest: 'tarteebRush.levelBest' };

  /* ================= TUNING ================= */
  const POINTS = {
    deliver: 100,
    wrong: -50,
    wrongTime: 2,        // seconds lost on wrong station
    timeBonus: 20,       // per second left on clear
    fix: 300,            // fixing a problem after it triggers
    prevent: 600,        // fixing it before it triggers (double)
    junkTime: 3,         // seconds lost touching junk
    hype: 250,           // every 5-combo makes the other departments jealous
  };
  const HYPE_EVERY = 5;
  const ACTIVITY = { perSecond: 4, deliver: 18, prevent: 45, fix: 25 };
  const DRAIN_PER_PROBLEM = 1.6; // readiness % per second while a problem is live
  const DRAG_THRESHOLD = 8; // px before a press becomes a drag

  /* ================= DOM ================= */
  const el = {
    app: $('#app'),
    screens: {
      start: $('#screen-start'),
      game: $('#screen-game'),
      showdown: $('#screen-showdown'),
    },
    muteBtns: document.querySelectorAll('.mute-btn'),
    confetti: $('#confetti'),
    sdScore: $('#sd-score'),
    sdBest: $('#sd-best'),
    sdRank: $('#sd-rank'),
    chart: $('#chart'),
    chartWrap: $('.chart'),
    btnAgain: $('#btn-again'),
    btnShare: $('#btn-share'),
    shareStatus: $('#share-status'),
    shareFallback: $('#share-fallback'),
    howto: $('#howto'),
    btnStart: $('#btn-start'),
    btnLevels: $('#btn-levels'),
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
    run: null,
    lastTick: 0,
    practice: false,
    levelBest: store.get(KEYS.levelBest, {}) || {},
  };

  function freshStats() {
    return { delivered: 0, wrong: 0, maxCombo: 0, prevented: 0, triggered: 0, lateFixes: 0, junkCaught: 0, jealousy: 0, missed: 0 };
  }

  function bankStats() {
    if (!state.stats || !state.run) return;
    for (const k in state.stats) {
      if (k === 'maxCombo') state.run.maxCombo = Math.max(state.run.maxCombo, state.stats.maxCombo);
      else state.run[k] += state.stats[k];
    }
    state.stats = freshStats();
  }

  const level = () => C.levels[state.levelIndex];
  const rules = () => level().rules;
  const isDismantle = () => rules().mode === 'dismantle';
  const mode = () => rules().mode || 'setup';

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
    el.supply.className = 'mode-' + mode();
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

  // Conveyor: pick the lane with the most room at the left edge.
  function beltSpot(force) {
    const size = itemSize();
    const sr = localRect(el.supply);
    const lanes = clamp(Math.floor((sr.h - 10) / (size + 14)), 1, 4);
    const gap = (sr.h - lanes * size) / (lanes + 1);
    let best = null, bestRoom = -Infinity;
    for (let l = 0; l < lanes; l++) {
      const y = sr.y + gap + l * (size + gap);
      let room = Infinity;
      for (const it of state.items) if (Math.abs(it.y - y) < size / 2) room = Math.min(room, it.x - sr.x);
      if (room > bestRoom) { bestRoom = room; best = { x: sr.x + 4, y }; }
    }
    if (!force && bestRoom < size + 12) return null;
    return best;
  }

  function spawnItem(type, extra = {}) {
    const def = extra.def || C.supplies[type];
    if (!def) return null;
    if (isDismantle() && !extra.station) {
      const ang = rand(0, Math.PI * 2), sp = rules().drift || 0;
      extra = { ...extra, station: 'storage', vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
    }
    let spot;
    if (mode() === 'conveyor') {
      spot = beltSpot(!!extra.problem);
      if (!spot) return null;
      extra = { ...extra, vx: rules().beltSpeed || 70, vy: 0 };
    } else {
      spot = freeSpot();
    }
    if (mode() === 'tap') extra = { ...extra, life: rules().life || 2.5 };
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
    return rules().npcMoods || C.defaultMoods || ['stare', 'phone', 'typing'];
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
    sfx('junk');
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

  /* ================= SOUND (Web Audio, no files) ================= */
  const audio = { ctx: null, master: null, muted: !!store.get(KEYS.muted, false) };

  function initAudio() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
    } catch (e) { audio.ctx = null; }
  }

  function tone(freq, dur, opt = {}) {
    const ctx = audio.ctx;
    if (!ctx || audio.muted) return;
    const { type = 'sine', vol = 0.25, slide = 0, delay = 0 } = opt;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audio.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  const arp = (notes, step, opt) => notes.forEach((f, i) => tone(f, opt.dur || 0.16, { ...opt, delay: i * step }));

  const SFX = {
    pick:    () => tone(620, 0.05, { type: 'triangle', vol: 0.12 }),
    deliver: () => { tone(880, 0.08, { type: 'triangle', vol: 0.22 }); tone(1320, 0.1, { type: 'triangle', vol: 0.18, delay: 0.06 }); },
    wrong:   () => tone(190, 0.22, { type: 'sawtooth', vol: 0.14, slide: -90 }),
    warn:    () => { tone(1040, 0.07, { type: 'square', vol: 0.06 }); tone(1040, 0.07, { type: 'square', vol: 0.06, delay: 0.13 }); },
    alarm:   () => tone(460, 0.32, { type: 'sawtooth', vol: 0.12, slide: -220 }),
    prevent: () => arp([523, 659, 784, 1047], 0.07, { type: 'triangle', vol: 0.2, dur: 0.15 }),
    junk:    () => tone(150, 0.2, { type: 'square', vol: 0.12, slide: -60 }),
    chaos:   () => { tone(280, 0.2, { type: 'sawtooth', vol: 0.1, slide: 320 }); tone(600, 0.2, { type: 'sawtooth', vol: 0.1, slide: -320, delay: 0.16 }); },
    clear:   () => arp([523, 659, 784, 1047, 1319], 0.08, { type: 'triangle', vol: 0.2, dur: 0.2 }),
    fail:    () => arp([392, 330, 262], 0.16, { type: 'sawtooth', vol: 0.1, dur: 0.28 }),
    tick:    () => tone(1250, 0.035, { type: 'square', vol: 0.05 }),
    bar:     () => tone(rand(500, 900), 0.05, { type: 'triangle', vol: 0.07 }),
    hype:    () => arp([659, 784, 988], 0.06, { type: 'square', vol: 0.09, dur: 0.12 }),
    fanfare: () => arp([392, 523, 659, 784, 1047, 1319, 1568], 0.09, { type: 'triangle', vol: 0.2, dur: 0.24 }),
  };

  function sfx(name) {
    const f = SFX[name];
    if (f) { try { f(); } catch (e) { /* audio is optional */ } }
  }

  function renderMute() {
    el.muteBtns.forEach(b => {
      b.textContent = audio.muted ? '🔇' : '🔊';
      b.classList.toggle('muted', audio.muted);
      b.setAttribute('aria-label', audio.muted ? C.ui.unmute : C.ui.mute);
      b.setAttribute('aria-pressed', String(audio.muted));
    });
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    store.set(KEYS.muted, audio.muted);
    initAudio();
    renderMute();
    if (!audio.muted) sfx('pick');
  }

  /* ================= CONFETTI ================= */
  function confetti(count = 70) {
    const colors = ['#C9A227', '#E6C04A', '#F6F2E8', '#0E0E0E', '#8C6F12'];
    const w = el.app.clientWidth;
    for (let i = 0; i < count; i++) {
      const c = h('span', 'confetto');
      c.style.left = `${rand(0, w)}px`;
      c.style.background = pick(colors);
      c.style.setProperty('--dx', `${rand(-80, 80).toFixed(0)}px`);
      c.style.setProperty('--rot', `${rand(-720, 720).toFixed(0)}deg`);
      c.style.setProperty('--dur', `${rand(1.4, 2.4).toFixed(2)}s`);
      c.style.animationDelay = `${rand(0, 0.35).toFixed(2)}s`;
      if (Math.random() < 0.4) { c.style.width = '6px'; c.style.height = '6px'; c.style.borderRadius = '50%'; }
      el.confetti.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }

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

  /* ================= JEALOUSY (combo hype) ================= */
  function checkHype() {
    if (state.combo > 0 && state.combo % HYPE_EVERY === 0) {
      state.stats.jealousy++;
      addScore(POINTS.hype);
      addActivity(ACTIVITY.prevent);
      for (const n of state.npcs) { if (n.mood !== 'dinner') { setMood(n, 'stare'); n.moodTimer = 2.5; } }
      const line = pick(C.jealousLines);
      toast(deptName(line.from), line.text);
      const a = el.arena;
      flash(`${C.ui.hype} +${POINTS.hype}`, a.clientWidth / 2, a.clientHeight * 0.3, 'hype');
      sfx('hype');
    }
  }

  // Tap & conveyor helpers
  function updateTapItems(dt) {
    for (const it of state.items.slice()) {
      if (it.life == null) continue;
      it.life -= dt;
      if (it.life < 0.7) it.el.classList.add('expiring');
      if (it.life <= 0) { removeItem(it); state.combo = 0; state.stats.missed++; }
    }
  }

  function updateBelt(dt) {
    const size = itemSize();
    const sr = localRect(el.supply);
    for (const it of state.items.slice()) {
      if ((state.drag && state.drag.item === it) || it.el.classList.contains('moving')) continue;
      it.x += (it.vx || 0) * dt;
      it.homeX = it.x;
      place(it);
      if (it.x > sr.x + sr.w - size * 0.35) {
        removeItem(it);
        state.combo = 0;
        state.stats.missed++;
        if (it.problem && state.problems.includes(it.problem)) {
          const p = it.problem;
          p.fixItem = spawnItem(it.type, { def: { emoji: p.def.fix.emoji, label: p.def.fix.label, station: p.station }, problem: p });
          p.fixItem.el.classList.add('fix');
        }
      }
    }
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
      checkHype();
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
      checkHype();
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
      if (mode() === 'tap') { sfx('pick'); deliver(item, item.station); return; }
      const p = toLocal(e);
      state.drag = { item, pid: e.pointerId, sx: p.x, sy: p.y, ox: p.x - item.x, oy: p.y - item.y, moved: false };
      item.el.classList.add('dragging');
      sfx('pick');
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
    beginRun(0, false);
  }

  // Practice: play one chosen level (and optionally continue from there).
  function startPractice(index) {
    beginRun(index, true);
  }

  function beginRun(index, practice) {
    initAudio();
    state.practice = practice;
    state.score = 0;
    state.activity = 0;
    state.levelIndex = index;
    state.run = { ...freshStats(), levelsCleared: 0 };
    state.runStartHigh = state.highScore;
    state.stats = null;
    el.shareStatus.textContent = '';
    el.shareFallback.hidden = true;
    setScreen('game');
    showIntro();
  }

  function showIntro() {
    const lv = level();
    prepareLevel();
    showCard({
      kicker: `Level ${state.levelIndex + 1} of ${C.levels.length}`,
      title: lv.title,
      body: [para(lv.intro, 'card-quote'), ...(lv.howTo ? [para(lv.howTo, 'card-howto')] : [])],
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
    state.lastTick = 0;
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
      const first = mode() === 'tap' ? 4 : mode() === 'conveyor' ? 1 : 3;
      for (let i = 0; i < Math.min(first, r.maxItems); i++) spawnItem(weightedPick(r.supplies));
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
    const cleared = state.stats;
    bankStats();
    state.run.levelsCleared++;
    saveHigh();
    sfx('clear');
    confetti();
    const isLast = state.levelIndex >= C.levels.length - 1;
    if (state.practice) { practiceClear(levelScore, bonus, cleared, isLast); return; }
    const body = [
      para(level().clearLine, 'card-quote'),
      para([
        `+${fmt(levelScore)} (${C.ui.timeBonus.toLowerCase()} +${fmt(bonus)})`,
        ...(cleared.jealousy ? [`${C.ui.jealousyCaused}: ${cleared.jealousy}`] : []),
        ...(cleared.prevented ? [`${C.ui.prevented}: ${cleared.prevented}`] : []),
        `${C.ui.totalScore}: ${fmt(state.score)}`,
      ].join(' · '), 'card-stats'),
    ];
    if (!isLast) {
      body.push(roastBlock());
      const nx = C.levels[state.levelIndex + 1];
      const up = h('div', 'upnext');
      up.append(
        h('span', 'upnext-kicker', fill(C.ui.upNext, { n: state.levelIndex + 2 })),
        h('strong', 'upnext-title', nx.title),
        h('p', 'upnext-intro', nx.intro),
      );
      if (nx.howTo) up.appendChild(h('p', 'upnext-how', nx.howTo));
      body.push(up);
    }
    showCard({
      kicker: fill(C.ui.levelClearedKicker, { n: state.levelIndex + 1 }),
      title: level().title,
      body,
      buttons: isLast
        ? [{ label: C.ui.resultsButton, primary: true, onClick: showShowdown }]
        : [{ label: fill(C.ui.startLevel, { n: state.levelIndex + 2 }), primary: true, onClick: startNextLevel }],
    });
  }

  function startNextLevel() {
    state.levelIndex++;
    if (state.practice) state.score = 0;
    prepareLevel();
    beginLevel();
  }

  /* ================= LEVEL MENU (practice mode) ================= */
  function saveLevelBest(index, score) {
    const key = String(index);
    if (score > (state.levelBest[key] || 0)) {
      state.levelBest[key] = score;
      store.set(KEYS.levelBest, state.levelBest);
      return true;
    }
    return false;
  }

  function showLevelMenu() {
    initAudio();
    const list = h('div', 'level-list');
    C.levels.forEach((lv, i) => {
      const b = h('button', 'level-pick');
      b.type = 'button';
      const info = h('span', 'level-pick-info');
      info.append(h('strong', 'level-pick-title', lv.title), h('span', 'level-pick-tag', lv.tag || ''));
      const best = state.levelBest[String(i)];
      b.append(
        h('span', 'level-pick-num', String(i + 1)),
        info,
        h('span', 'level-pick-best', best ? fill(C.ui.levelBest, { score: fmt(best) }) : ''),
      );
      b.addEventListener('click', () => { hideCard(); startPractice(i); });
      list.appendChild(b);
    });
    showCard({
      kicker: C.ui.levelPickKicker,
      title: C.ui.levelPickTitle,
      body: [list, para(C.ui.levelPickNote, 'level-note')],
      buttons: [{ label: C.ui.backButton, primary: false, onClick: hideCard }],
    });
  }

  function practiceClear(levelScore, bonus, cleared, isLast) {
    const isNew = saveLevelBest(state.levelIndex, levelScore);
    const stats = [
      `+${fmt(levelScore)} (${C.ui.timeBonus.toLowerCase()} +${fmt(bonus)})`,
      ...(cleared.jealousy ? [`${C.ui.jealousyCaused}: ${cleared.jealousy}`] : []),
      ...(cleared.prevented ? [`${C.ui.prevented}: ${cleared.prevented}`] : []),
      isNew ? C.showdown.newBest : fill(C.ui.levelBest, { score: fmt(state.levelBest[String(state.levelIndex)] || levelScore) }),
    ];
    const buttons = [];
    if (!isLast) buttons.push({ label: fill(C.ui.startLevel, { n: state.levelIndex + 2 }), primary: true, onClick: startNextLevel });
    buttons.push({ label: C.ui.replayButton, primary: isLast, onClick: replayLevel });
    buttons.push({ label: C.ui.levelMenuButton, primary: false, onClick: backToMenu });
    showCard({
      kicker: C.ui.practiceDone,
      title: level().title,
      body: [para(level().clearLine, 'card-quote'), para(stats.join(' · '), 'card-stats'), roastBlock()],
      buttons,
    });
  }

  function replayLevel() {
    state.score = 0;
    prepareLevel();
    beginLevel();
  }

  function backToMenu() {
    state.running = false;
    state.paused = false;
    clearItems();
    hideCard();
    renderBest();
    setScreen('start');
    showLevelMenu();
  }

  function nextRoast() {
    if (!state.roastDeck.length) {
      state.roastDeck = C.roasts.slice().sort(() => Math.random() - 0.5);
    }
    return state.roastDeck.pop();
  }

  function roastBlock() {
    const r = nextRoast();
    const wrap = h('div', 'roast-wrap');
    wrap.appendChild(h('span', 'roast-kicker', C.ui.roastKicker));
    const them = h('div', 'roast-them');
    them.append(h('span', 'roast-dept', r.dept), h('p', 'roast-line', r.them));
    wrap.appendChild(them);
    if (r.tarteeb) {
      const us = h('div', 'roast-us');
      us.append(h('span', 'roast-dept', C.ui.roastTarteeb), h('p', 'roast-line', r.tarteeb));
      wrap.appendChild(us);
    }
    return wrap;
  }

  function nextLevel() {
    state.levelIndex++;
    showIntro();
  }

  function levelFail() {
    state.running = false;
    clearSelection();
    bankStats();
    sfx('fail');
    shake();
    showCard({
      kicker: C.ui.levelFailedKicker,
      title: fill(C.ui.levelFailedTitle, { pct: Math.floor(state.readiness) }),
      body: para(pick(C.failLines), 'card-quote'),
      buttons: [
        { label: C.ui.retryButton, primary: true, onClick: retryLevel },
        state.practice
          ? { label: C.ui.levelMenuButton, primary: false, onClick: backToMenu }
          : { label: C.ui.endRunButton, primary: false, onClick: endRun },
      ],
    });
  }

  function retryLevel() {
    state.score = state.levelStartScore;
    showIntro();
  }

  function endRun() {
    state.running = false;
    bankStats();
    showShowdown();
  }

  /* ================= DEPARTMENT SHOWDOWN ================= */
  function rankFor(score) {
    let title = C.ranks[0].title;
    for (const r of C.ranks) if (score >= r.min) title = r.title;
    return title;
  }

  function tarteebValues() {
    const r = state.run;
    const attempts = r.delivered + r.wrong + r.prevented + r.lateFixes;
    const effective = attempts ? Math.round(((attempts - r.wrong) / attempts) * 100) : 100;
    const jealous = r.jealousy + r.prevented;
    return {
      cool: `best combo ×${r.maxCombo} · ${effective}% clean`,
      aura: `${fmt(state.activity)} aura`,
      initiative: `${r.prevented} problem${r.prevented === 1 ? '' : 's'} prevented`,
      jealousy: `${jealous} jealous moment${jealous === 1 ? '' : 's'}`,
    };
  }

  function buildChart() {
    const S = C.showdown;
    const values = tarteebValues();
    el.chart.replaceChildren();
    const fills = [];
    S.categories.forEach((cat, gi) => {
      const group = h('div', 'chart-group');
      const head = h('div', 'chart-group-head');
      head.append(h('span', 'chart-cat', cat.label), h('span', 'chart-val', values[cat.key] || ''));
      group.appendChild(head);

      const rows = [{ name: C.tracker.tarteebLabel, us: true }].concat(C.departments.map(d => ({ name: d.name })));
      rows.forEach(row => {
        const r = h('div', 'bar-row' + (row.us ? ' us' : ''));
        const track = h('div', 'bar-track');
        const f = h('div', 'bar-fill');
        track.appendChild(f);
        if (row.us) {
          track.appendChild(h('span', 'bar-off', S.offChart));
          fills.push({ node: f, width: `${rand(135, 160).toFixed(0)}%`, delay: gi * 0.35 });
        } else {
          const w = rand(2, 9);
          const status = h('span', 'bar-status', pick(S.otherStatuses));
          status.style.left = `calc(${w}% + 6px)`;
          track.appendChild(status);
          fills.push({ node: f, width: `${w.toFixed(1)}%`, delay: gi * 0.35 + 0.2 });
        }
        r.append(h('span', 'bar-name', row.name), track);
        group.appendChild(r);
      });
      el.chart.appendChild(group);
    });
    return fills;
  }

  function showShowdown() {
    state.running = false;
    clearItems();
    hideCard();
    const prevHigh = state.runStartHigh || 0;
    saveHigh();
    renderBest();
    const S = C.showdown;
    el.sdScore.textContent = fmt(state.score);
    const isNew = state.score > prevHigh && state.score > 0;
    el.sdBest.textContent = isNew ? S.newBest : fill(S.best, { score: fmt(state.highScore) });
    el.sdBest.classList.toggle('new', isNew);
    el.sdRank.textContent = rankFor(state.score);
    el.shareStatus.textContent = '';
    el.shareStatus.classList.remove('err');
    el.shareFallback.hidden = true;
    el.chartWrap.classList.remove('go');
    const fills = buildChart();
    setScreen('showdown');
    el.screens.showdown.scrollTop = 0;
    sfx('fanfare');
    // Animate bars on the next frame so the transitions run.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.chartWrap.classList.add('go');
      fills.forEach(f => {
        f.node.style.transitionDelay = `${f.delay}s`;
        f.node.style.width = f.width;
      });
      C.showdown.categories.forEach((c, i) => setTimeout(() => sfx('bar'), 350 * i + 200));
      if (state.score > 0) setTimeout(() => confetti(90), 1400);
    }));
  }

  /* ================= SHARE (clipboard with fallbacks) ================= */
  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  async function share() {
    const text = fill(C.showdown.shareText, { score: fmt(state.score) });
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) ok = legacyCopy(text);

    el.shareStatus.classList.toggle('err', !ok);
    if (ok) {
      el.shareStatus.textContent = C.showdown.copied;
      el.shareFallback.hidden = true;
      sfx('deliver');
    } else {
      // Last resort: show the text so the player can copy it by hand.
      el.shareStatus.textContent = C.showdown.copyFailed;
      el.shareFallback.value = text;
      el.shareFallback.hidden = false;
      el.shareFallback.focus();
      el.shareFallback.select();
    }
  }

  function saveHigh() {
    if (state.practice) return; // only full runs count toward the overall best
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
        state.practice
          ? { label: C.ui.levelMenuButton, primary: false, onClick: backToMenu }
          : { label: C.ui.endRunButton, primary: false, onClick: endRun },
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
    const sec = Math.ceil(state.timeLeft);
    if (sec <= 5 && sec !== state.lastTick) { state.lastTick = sec; sfx('tick'); }

    // Spawn supplies
    const r = rules();
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.items.length < r.maxItems && (!isDismantle() || state.toSpawn > 0)) {
      spawnItem(weightedPick(r.supplies));
      if (isDismantle()) state.toSpawn--;
      state.spawnTimer = r.spawnEvery * rand(0.8, 1.25);
    }
    if (isDismantle()) driftItems(dt);
    if (mode() === 'tap') updateTapItems(dt);
    if (mode() === 'conveyor') updateBelt(dt);

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
    el.btnLevels.addEventListener('click', showLevelMenu);
    el.btnPause.addEventListener('click', pause);
    el.muteBtns.forEach(b => b.addEventListener('click', toggleMute));
    el.btnAgain.addEventListener('click', startRun);
    el.btnShare.addEventListener('click', share);
    document.addEventListener('pointerdown', initAudio, { passive: true });
    renderMute();
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

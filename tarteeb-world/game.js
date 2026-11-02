/*
 * Tarteeb: On Duty. A top-down 2D game where you walk a Tarteeb member around the venue.
 * All player-facing text comes from content.js (window.ON_DUTY_CONTENT).
 */
(() => {
  'use strict';

  const C = window.ON_DUTY_CONTENT;
  if (!C) { document.body.textContent = 'content.js failed to load.'; return; }

  /* ================= HELPERS ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function h(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  const path = p => p.split('.').reduce((o, k) => (o ? o[k] : undefined), C);
  const deptName = id => (C.departments.find(d => d.id === id) || { name: id }).name;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } },
  };
  const KEYS = { muted: 'onDuty.muted', position: 'onDuty.position', best: id => `onDuty.best.${id}` };

  /* ================= WORLD LAYOUT (world units, portrait) ================= */
  const W = 360, H = 600;
  const PR = 11;                 // player radius
  const ZONES = {
    stage:        { x: 70,  y: 20,  w: 220, h: 64 },
    seating:      { x: 46,  y: 132, w: 196, h: 150 },
    refreshments: { x: 268, y: 196, w: 80,  h: 132 },
    registration: { x: 236, y: 392, w: 112, h: 92 },
  };
  const STORAGE = { x: 12, y: 428, w: 134, h: 160 };
  const ENTRANCE = { x: 160, y: 588, w: 64, h: 12 };
  const SLOTS = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    SLOTS.push({ x: STORAGE.x + 26 + c * 41, y: STORAGE.y + 40 + r * 41 });
  }
  const zoneCenter = z => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });
  function inZone(p, z, pad = 0) {
    const cx = clamp(p.x, z.x, z.x + z.w), cy = clamp(p.y, z.y, z.y + z.h);
    return Math.hypot(p.x - cx, p.y - cy) <= pad;
  }

  /* ================= TUNING ================= */
  const T = {
    pickupRange: 20,
    bumpRange: 21,
    stun: 1.1,
    immune: 2.6,
    sprintTime: 3,
    sprintBoost: 1.7,
    volunteerSpeed: 95,
    npcSpeed: 30,
    problemFirst: 10,
    problemEvery: 16,
    warnTime: 9,
    approvalEvery: 11,
    approvalTime: 9,
    readiness: { deliver: 5, prevent: 8, missed: -10, approvalMissed: -4, drain: 1.5 },
    points: { base: 100, perSecondLeft: 4, prevent: 600, lateFix: 200, approval: 150, hype: 250, volunteerShare: 0.75 },
    hypeEvery: 4,
  };

  /* ================= DOM ================= */
  const el = {
    screens: { start: $('#screen-start'), game: $('#screen-game'), results: $('#screen-results') },
    positions: $('#positions'), howto: $('#howto'), startBest: $('#start-best'), btnStart: $('#btn-start'),
    badge: $('#hud-badge'), score: $('#hud-score'), carry: $('#hud-carry'), timer: $('#hud-timer'),
    timerWrap: $('#hud-timer').parentElement, meterFill: $('#meter-fill'), meterText: $('#meter-text'), tasks: $('#tasks'),
    wrap: $('#stage-wrap'), canvas: $('#canvas'), toasts: $('#toasts'), floaters: $('#floaters'),
    btnAbility: $('#btn-ability'), abilityName: $('#ability-name'), abilityCd: $('#ability-cd'), btnPause: $('#btn-pause'),
    muteBtns: document.querySelectorAll('.mute-btn'),
    resTitle: $('#res-title'), resScore: $('#res-score'), resBest: $('#res-best'), resRank: $('#res-rank'),
    resTable: $('#res-table'), resFinal: $('#res-final'),
    btnAgain: $('#btn-again'), btnChange: $('#btn-change'), btnShare: $('#btn-share'),
    shareStatus: $('#share-status'), shareFallback: $('#share-fallback'),
    overlay: $('#overlay'), cardTitle: $('#card-title'), cardBody: $('#card-body'), cardActions: $('#card-actions'),
    confetti: $('#confetti'),
  };
  const ctx = el.canvas.getContext('2d');

  /* ================= STATE ================= */
  const savedPos = store.get(KEYS.position, 'member');
  const state = {
    screen: 'start',
    pos: C.positions.find(p => p.id === savedPos) || C.positions[0],
    running: false,
    paused: false,
    time: 0,
    readiness: 0,
    score: 0,
    combo: 0,
    nextId: 1,
    player: null,
    tasks: [],
    npcs: [],
    volunteers: [],
    taskTimer: 0,
    problemTimer: 0,
    approvalTimer: 0,
    abilityCd: 0,
    stats: null,
    moveTarget: null,
    clock: 0,
    fullWarn: 0,
  };

  const freshStats = () => ({ delivered: 0, missed: 0, prevented: 0, lateFixes: 0, approvals: 0, jealousy: 0 });

  /* ================= VIEW (world -> screen) ================= */
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  function resize() {
    const r = el.wrap.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.cw = r.width; view.ch = r.height;
    el.canvas.width = Math.max(1, Math.round(r.width * view.dpr));
    el.canvas.height = Math.max(1, Math.round(r.height * view.dpr));
    view.scale = Math.min(r.width / W, r.height / H);
    view.ox = (r.width - W * view.scale) / 2;
    view.oy = (r.height - H * view.scale) / 2;
  }
  const toScreen = p => ({ x: view.ox + p.x * view.scale, y: view.oy + p.y * view.scale });
  const toWorld = (cx, cy) => {
    const r = el.wrap.getBoundingClientRect();
    return { x: (cx - r.left - view.ox) / view.scale, y: (cy - r.top - view.oy) / view.scale };
  };

  /* ================= FEEDBACK ================= */
  function toast(from, text, cls = '') {
    const n = h('div', 'toast ' + cls);
    if (from) n.appendChild(h('b', '', from));
    n.appendChild(document.createTextNode(text));
    el.toasts.appendChild(n);
    while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 320); }, 3000);
  }
  function floater(text, wp, cls = '') {
    const s = toScreen(wp);
    const n = h('div', 'floater ' + cls, text);
    n.style.left = `${s.x}px`; n.style.top = `${s.y}px`;
    el.floaters.appendChild(n);
    setTimeout(() => n.remove(), 1050);
  }
  function shake() {
    el.screens.game.classList.remove('shake'); void el.screens.game.offsetWidth; el.screens.game.classList.add('shake');
  }
  function confetti(count = 80) {
    const colors = ['#C9A227', '#E6C04A', '#F6F2E8', '#0E0E0E', '#8C6F12'];
    const w = el.confetti.clientWidth;
    for (let i = 0; i < count; i++) {
      const c = h('span', 'confetto');
      c.style.left = `${rand(0, w)}px`;
      c.style.background = pick(colors);
      c.style.setProperty('--dx', `${rand(-80, 80) | 0}px`);
      c.style.setProperty('--rot', `${rand(-720, 720) | 0}deg`);
      c.style.setProperty('--dur', `${rand(1.4, 2.4).toFixed(2)}s`);
      c.style.animationDelay = `${rand(0, 0.35).toFixed(2)}s`;
      el.confetti.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }

  /* ================= SOUND (Web Audio, no files) ================= */
  const audio = { ctx: null, master: null, muted: !!store.get(KEYS.muted, false) };
  function initAudio() {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
    } catch (e) { audio.ctx = null; }
  }
  function tone(freq, dur, o = {}) {
    const a = audio.ctx;
    if (!a || audio.muted) return;
    const { type = 'triangle', vol = 0.2, slide = 0, delay = 0 } = o;
    const t = a.currentTime + delay;
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(audio.master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  const arp = (notes, step, o) => notes.forEach((f, i) => tone(f, o.dur || 0.15, { ...o, delay: i * step }));
  const SFX = {
    pickup:  () => tone(660, 0.06, { vol: 0.14 }),
    deliver: () => { tone(880, 0.08); tone(1320, 0.1, { delay: 0.06, vol: 0.16 }); },
    prevent: () => arp([523, 659, 784, 1047], 0.07, { vol: 0.2 }),
    missed:  () => tone(220, 0.3, { type: 'sawtooth', vol: 0.12, slide: -110 }),
    bump:    () => tone(170, 0.18, { type: 'square', vol: 0.1, slide: -50 }),
    warn:    () => { tone(1040, 0.07, { type: 'square', vol: 0.06 }); tone(1040, 0.07, { type: 'square', vol: 0.06, delay: 0.13 }); },
    alarm:   () => tone(460, 0.32, { type: 'sawtooth', vol: 0.12, slide: -220 }),
    ability: () => arp([392, 523, 659], 0.05, { type: 'square', vol: 0.08, dur: 0.1 }),
    approve: () => { tone(740, 0.08); tone(988, 0.12, { delay: 0.07 }); },
    hype:    () => arp([659, 784, 988], 0.06, { type: 'square', vol: 0.09, dur: 0.12 }),
    tick:    () => tone(1250, 0.035, { type: 'square', vol: 0.05 }),
    end:     () => arp([392, 523, 659, 784, 1047, 1319], 0.09, { vol: 0.2, dur: 0.22 }),
    fail:    () => arp([392, 330, 262], 0.16, { type: 'sawtooth', vol: 0.1, dur: 0.28 }),
  };
  const sfx = n => { try { SFX[n] && SFX[n](); } catch (e) { /* optional */ } };
  function renderMute() {
    el.muteBtns.forEach(b => {
      b.textContent = audio.muted ? '🔇' : '🔊';
      b.classList.toggle('muted', audio.muted);
      b.setAttribute('aria-label', audio.muted ? C.ui.unmute : C.ui.mute);
    });
  }

  /* ================= START SCREEN ================= */
  function fillStatic() {
    document.querySelectorAll('[data-text]').forEach(n => { const v = path(n.dataset.text); if (v != null) n.textContent = v; });
    el.howto.replaceChildren(...C.ui.howTo.map(t => h('li', '', t)));
  }
  function buildPositions() {
    el.positions.replaceChildren();
    for (const p of C.positions) {
      const b = h('button', 'pos');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.id = p.id;
      const info = h('span', 'pos-info');
      const perks = h('span', 'pos-perks');
      p.perks.forEach(x => perks.appendChild(h('span', '', x)));
      info.append(h('span', 'pos-name', p.name), h('span', 'pos-blurb', p.blurb), perks);
      b.append(h('span', 'pos-badge', p.badge), info);
      b.addEventListener('click', () => choosePosition(p.id));
      el.positions.appendChild(b);
    }
    choosePosition(state.pos.id);
  }
  function choosePosition(id) {
    state.pos = C.positions.find(p => p.id === id) || C.positions[0];
    store.set(KEYS.position, state.pos.id);
    el.positions.querySelectorAll('.pos').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === state.pos.id)));
    const best = store.get(KEYS.best(state.pos.id), 0);
    el.startBest.textContent = best ? fill(C.ui.best, { position: state.pos.name, score: fmt(best) }) : '';
  }
  function setScreen(name) {
    state.screen = name;
    for (const k in el.screens) el.screens[k].classList.toggle('active', k === name);
    if (name === 'game') resize();
  }

  /* ================= SHIFT SETUP ================= */
  function startShift() {
    initAudio();
    const P = state.pos;
    state.time = C.shift.duration;
    state.readiness = C.shift.startReadiness;
    state.score = 0;
    state.combo = 0;
    state.tasks = [];
    state.stats = freshStats();
    state.taskTimer = 1.2;
    state.problemTimer = T.problemFirst;
    state.approvalTimer = 6;
    state.abilityCd = 0;
    state.moveTarget = null;
    state.lastTick = 0;
    state.player = { x: 190, y: 360, dir: 1, carry: [], stun: 0, immune: 0, sprint: 0, walk: 0, moving: false };
    const depts = C.departments.slice().sort(() => Math.random() - 0.5).slice(0, P.npcs);
    state.npcs = depts.map(d => {
      const p = randomFloorPoint();
      return { dept: d, x: p.x, y: p.y, tx: p.x, ty: p.y, pause: rand(0, 2), approval: 0, stare: 0 };
    });
    state.volunteers = [];
    for (let i = 0; i < P.volunteers; i++) {
      const home = { x: ENTRANCE.x + 14 + i * 34, y: ENTRANCE.y - 18 };
      state.volunteers.push({ x: home.x, y: home.y, home, task: null, phase: 'idle', walk: 0 });
    }
    el.badge.textContent = P.badge;
    el.abilityName.textContent = P.abilityName;
    el.toasts.replaceChildren();
    el.floaters.replaceChildren();
    el.shareStatus.textContent = '';
    el.shareFallback.hidden = true;
    setScreen('game');
    renderTasks();
    state.running = true;
    state.paused = false;
    last = performance.now();
  }

  function randomFloorPoint() {
    for (let i = 0; i < 30; i++) {
      const p = { x: rand(20, W - 20), y: rand(100, H - 30) };
      if (!inZone(p, STORAGE, 6)) return p;
    }
    return { x: 190, y: 330 };
  }

  /* ================= TASKS ================= */
  function freeSlot() {
    const used = new Set(state.tasks.filter(t => t.item.state === 'storage').map(t => t.item.slot));
    const free = SLOTS.map((s, i) => i).filter(i => !used.has(i));
    return free.length ? pick(free) : -1;
  }
  const progress = () => 1 - state.time / C.shift.duration;

  function spawnTask() {
    const slot = freeSlot();
    if (slot < 0) return;
    const busy = new Set(state.tasks.filter(t => t.kind === 'supply').map(t => t.type));
    const options = Object.keys(C.supplies).filter(k => !busy.has(k));
    if (!options.length) return;
    const type = pick(options);
    const def = C.supplies[type];
    const total = lerp(26, 17, progress()) + rand(-2, 2);
    state.tasks.push({ id: state.nextId++, kind: 'supply', type, def, station: def.station, t: total, total, assigned: false,
      item: { slot, state: 'storage' } });
    renderTasks();
  }

  function spawnProblem() {
    const slot = freeSlot();
    if (slot < 0) return;
    const busy = new Set(state.tasks.filter(t => t.kind === 'fix').map(t => t.station));
    const options = C.problems.filter(p => !busy.has(p.station));
    if (!options.length) return;
    const pr = pick(options);
    state.tasks.push({ id: state.nextId++, kind: 'fix', problem: pr, def: pr.fix, station: pr.station, t: T.warnTime, total: T.warnTime,
      phase: 'warning', assigned: false, item: { slot, state: 'storage' } });
    toast(C.stations[pr.station].name, `⚠ ${pr.warn}. Spare ${pr.fix.label.toLowerCase()} in Storage.`, 'gold');
    sfx('warn');
    renderTasks();
  }

  function removeTask(task) {
    state.tasks = state.tasks.filter(t => t !== task);
    const p = state.player;
    p.carry = p.carry.filter(t => t !== task);
    for (const v of state.volunteers) if (v.task === task) { v.task = null; v.phase = 'return'; }
    renderTasks();
  }

  function completeTask(task, byVolunteer) {
    const P = state.pos;
    const at = zoneCenter(ZONES[task.station]);
    let pts;
    if (task.kind === 'fix') {
      const early = task.phase === 'warning';
      pts = (early ? T.points.prevent : T.points.lateFix) * P.multiplier;
      if (early) {
        state.stats.prevented++;
        state.readiness += T.readiness.prevent;
        toast('', C.ui.sawItComing + ` · +${fmt(pts)}`, 'gold');
        floater(C.ui.sawItComing, at, 'big');
        sfx('prevent');
        confetti(40);
      } else {
        state.stats.lateFixes++;
        floater(`${C.ui.lateFix} +${fmt(pts)}`, at);
        sfx('deliver');
      }
    } else {
      const comboBonus = byVolunteer ? 1 : 1 + Math.min(state.combo, 10) * 0.05;
      pts = (T.points.base + Math.ceil(task.t) * T.points.perSecondLeft) * P.multiplier * comboBonus;
      if (byVolunteer) pts *= T.points.volunteerShare;
      state.stats.delivered++;
      state.readiness += T.readiness.deliver;
      floater(fill(C.ui.onTime, { pts: fmt(pts) }), at);
      sfx('deliver');
    }
    state.readiness = clamp(state.readiness, 0, 100);
    state.score += pts;
    if (!byVolunteer) {
      state.combo++;
      if (state.combo % T.hypeEvery === 0) hype();
    }
    removeTask(task);
  }

  function hype() {
    state.stats.jealousy++;
    const pts = T.points.hype * state.pos.multiplier;
    state.score += pts;
    for (const n of state.npcs) n.stare = 2.5;
    const line = pick(C.jealousLines);
    toast(deptName(line.from), line.text);
    floater(`${C.ui.jealousy} +${fmt(pts)}`, { x: state.player.x, y: state.player.y - 30 }, 'big');
    sfx('hype');
  }

  function updateTasks(dt) {
    for (const task of state.tasks.slice()) {
      if (task.kind === 'fix' && task.phase === 'live') {
        state.readiness -= T.readiness.drain * dt;
        continue;
      }
      task.t -= dt;
      if (task.t > 0) continue;
      if (task.kind === 'fix') {
        task.phase = 'live';
        task.t = 0;
        toast(`${deptName(task.problem.from)} → Tarteeb`, task.problem.message);
        sfx('alarm');
        shake();
        renderTasks();
      } else {
        state.stats.missed++;
        state.combo = 0;
        state.readiness += T.readiness.missed;
        toast(`${pick(C.departments).name} → Tarteeb`, `${task.def.emoji} ${pick(C.missedLines)}`);
        sfx('missed');
        shake();
        removeTask(task);
      }
    }
    // Spawning gets busier as the shift goes on.
    const P = state.pos;
    const maxTasks = Math.round(lerp(2, P.maxTasks, progress()));
    state.taskTimer -= dt;
    if (state.taskTimer <= 0) {
      if (state.tasks.filter(t => t.kind === 'supply').length < maxTasks) spawnTask();
      state.taskTimer = P.taskEvery * lerp(1, 0.65, progress()) * rand(0.8, 1.2);
    }
    state.problemTimer -= dt;
    if (state.problemTimer <= 0) { spawnProblem(); state.problemTimer = T.problemEvery * rand(0.8, 1.2); }
  }

  /* ================= PLAYER ================= */
  const keys = new Set();
  const joy = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0, vx: 0, vy: 0, t0: 0, moved: false };

  function inputVector() {
    let x = 0, y = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) y += 1;
    if (x || y) { state.moveTarget = null; const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (joy.active && (joy.vx || joy.vy)) { state.moveTarget = null; return { x: joy.vx, y: joy.vy }; }
    if (state.moveTarget) {
      const p = state.player;
      const dx = state.moveTarget.x - p.x, dy = state.moveTarget.y - p.y;
      const l = Math.hypot(dx, dy);
      if (l < 4) { state.moveTarget = null; return { x: 0, y: 0 }; }
      return { x: dx / l, y: dy / l };
    }
    return { x: 0, y: 0 };
  }

  function updatePlayer(dt) {
    const p = state.player;
    p.immune = Math.max(0, p.immune - dt);
    p.sprint = Math.max(0, p.sprint - dt);
    if (p.stun > 0) { p.stun -= dt; p.moving = false; return; }
    const v = inputVector();
    const speed = state.pos.speed * (p.sprint > 0 ? T.sprintBoost : 1);
    p.moving = !!(v.x || v.y);
    if (p.moving) {
      p.x = clamp(p.x + v.x * speed * dt, PR + 4, W - PR - 4);
      p.y = clamp(p.y + v.y * speed * dt, PR + 4, H - PR - 4);
      if (Math.abs(v.x) > 0.2) p.dir = Math.sign(v.x);
      p.walk += dt * (p.sprint > 0 ? 16 : 11);
    }

    // Pick up supplies in Storage.
    state.fullWarn = Math.max(0, state.fullWarn - dt);
    for (const task of state.tasks) {
      if (task.item.state !== 'storage' || task.assigned) continue;
      if (dist(p, SLOTS[task.item.slot]) > T.pickupRange) continue;
      if (p.carry.length >= state.pos.carry) {
        if (!state.fullWarn) { floater(C.ui.full, { x: p.x, y: p.y - 24 }, 'bad'); state.fullWarn = 1.5; }
        continue;
      }
      task.item.state = 'player';
      p.carry.push(task);
      floater(task.def.emoji, { x: p.x, y: p.y - 24 });
      sfx('pickup');
    }

    // Deliver to stations.
    for (const task of p.carry.slice()) {
      if (inZone(p, ZONES[task.station], PR)) completeTask(task, false);
    }

    // Bump into departments.
    for (const n of state.npcs) {
      if (dist(p, n) > T.bumpRange) continue;
      if (n.approval > 0) { approve(n); continue; }
      if (p.immune > 0) continue;
      p.stun = T.stun;
      p.immune = T.immune;
      n.pause = 1.4;
      state.moveTarget = null;
      toast(n.dept.name, pick(C.quickQuestions));
      floater(fill(C.ui.stopped, { dept: n.dept.short }), { x: p.x, y: p.y - 26 }, 'bad');
      sfx('bump');
      shake();
    }
  }

  /* ================= DEPARTMENTS (NPCs) ================= */
  function updateNpcs(dt) {
    for (const n of state.npcs) {
      n.stare = Math.max(0, n.stare - dt);
      if (n.approval > 0) {
        n.approval -= dt;
        if (n.approval <= 0) {
          n.approval = 0;
          state.readiness += T.readiness.approvalMissed;
          toast(n.dept.name, C.approvalMissed);
        }
        continue; // stands still waiting for the Director
      }
      if (n.pause > 0) { n.pause -= dt; continue; }
      const dx = n.tx - n.x, dy = n.ty - n.y, l = Math.hypot(dx, dy);
      if (l < 3) {
        const p = randomFloorPoint();
        n.tx = p.x; n.ty = p.y; n.pause = rand(0.6, 2.5);
      } else {
        n.x += (dx / l) * T.npcSpeed * dt;
        n.y += (dy / l) * T.npcSpeed * dt;
      }
    }
    if (state.pos.approvals) {
      state.approvalTimer -= dt;
      if (state.approvalTimer <= 0) {
        const free = state.npcs.filter(n => n.approval <= 0);
        if (free.length) { const n = pick(free); n.approval = T.approvalTime; toast(n.dept.name, '📝 needs the Director\'s sign-off. Walk over to approve.'); }
        state.approvalTimer = T.approvalEvery * rand(0.8, 1.2);
      }
    }
  }

  function approve(n) {
    n.approval = 0;
    n.pause = 1;
    state.stats.approvals++;
    const pts = T.points.approval * state.pos.multiplier;
    state.score += pts;
    floater(fill(C.ui.approved, { pts: fmt(pts) }), { x: n.x, y: n.y - 24 });
    toast(n.dept.name, pick(C.approvalLines));
    sfx('approve');
  }

  /* ================= VOLUNTEERS & ABILITY ================= */
  function useAbility() {
    if (!state.running || state.paused || state.abilityCd > 0) return;
    const P = state.pos;
    const p = state.player;
    if (P.ability === 'sprint') {
      p.sprint = T.sprintTime;
      floater(C.ui.sprint, { x: p.x, y: p.y - 26 });
    } else {
      const v = state.volunteers.find(x => x.phase === 'idle' || x.phase === 'return');
      if (!v) { floater(C.ui.noVolunteer, { x: p.x, y: p.y - 26 }, 'bad'); return; }
      const open = state.tasks.filter(t => t.item.state === 'storage' && !t.assigned)
        .sort((a, b) => (a.kind === 'fix' ? -1 : 0) - (b.kind === 'fix' ? -1 : 0) || a.t - b.t);
      if (!open.length) { floater(C.ui.nothingToDelegate, { x: p.x, y: p.y - 26 }, 'bad'); return; }
      const task = open[0];
      task.assigned = true;
      v.task = task;
      v.phase = 'toItem';
      floater(`${C.ui.delegated} ${task.def.emoji}`, { x: v.x, y: v.y - 20 });
      renderTasks();
    }
    state.abilityCd = P.cooldown;
    sfx('ability');
  }

  function moveTo(o, target, speed, dt) {
    const dx = target.x - o.x, dy = target.y - o.y, l = Math.hypot(dx, dy);
    if (l <= speed * dt) { o.x = target.x; o.y = target.y; return true; }
    o.x += (dx / l) * speed * dt; o.y += (dy / l) * speed * dt;
    o.walk += dt * 12;
    return false;
  }

  function updateVolunteers(dt) {
    for (const v of state.volunteers) {
      if (v.phase === 'idle') continue;
      if (v.task && !state.tasks.includes(v.task)) { v.task = null; v.phase = 'return'; }
      if (v.phase === 'toItem') {
        if (moveTo(v, SLOTS[v.task.item.slot], T.volunteerSpeed, dt)) { v.task.item.state = 'volunteer'; v.phase = 'toStation'; }
      } else if (v.phase === 'toStation') {
        if (moveTo(v, zoneCenter(ZONES[v.task.station]), T.volunteerSpeed, dt)) {
          const task = v.task; v.task = null; v.phase = 'return';
          completeTask(task, true);
        }
      } else if (v.phase === 'return') {
        if (moveTo(v, v.home, T.volunteerSpeed, dt)) v.phase = 'idle';
      }
    }
  }

  /* ================= HUD ================= */
  const taskEls = new Map();
  function renderTasks() {
    el.tasks.replaceChildren();
    taskEls.clear();
    const list = state.tasks.slice().sort((a, b) => (b.kind === 'fix') - (a.kind === 'fix') || a.t - b.t);
    for (const t of list) {
      const n = h('div', 'task' + (t.kind === 'fix' ? (t.phase === 'live' ? ' live' : ' fix') : ''));
      const name = t.kind === 'fix' ? (t.phase === 'live' ? t.problem.live : t.problem.warn) : C.stations[t.station].name;
      n.append(h('span', 't-emoji', t.def.emoji), h('span', '', t.assigned ? `${name} · 🙋` : name));
      const bar = h('span', 't-bar');
      n.appendChild(bar);
      el.tasks.appendChild(n);
      taskEls.set(t, { n, bar });
    }
  }
  const hudCache = {};
  function setText(node, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; } }
  function renderHud() {
    setText(el.score, 'score', fmt(state.score));
    setText(el.timer, 'timer', String(Math.ceil(state.time)));
    el.timerWrap.classList.toggle('urgent', state.time <= 10);
    const r = Math.round(state.readiness);
    if (hudCache.r !== r) {
      hudCache.r = r;
      el.meterFill.style.width = `${r}%`;
      el.meterFill.classList.toggle('low', r < 30);
      el.meterText.textContent = `${C.ui.readiness} ${r}%`;
    }
    const carryKey = state.player.carry.map(t => t.def.emoji).join('') + '|' + state.pos.carry;
    if (hudCache.carry !== carryKey) {
      hudCache.carry = carryKey;
      el.carry.replaceChildren();
      for (let i = 0; i < state.pos.carry; i++) {
        const t = state.player.carry[i];
        el.carry.appendChild(h('span', 'slot' + (t ? ' full' : ''), t ? t.def.emoji : ''));
      }
    }
    for (const [t, ref] of taskEls) {
      const pct = t.kind === 'fix' && t.phase === 'live' ? 100 : clamp(t.t / t.total, 0, 1) * 100;
      ref.bar.style.width = `${pct}%`;
      ref.n.classList.toggle('urgent', t.kind === 'supply' && t.t < 6);
    }
    const cd = Math.ceil(state.abilityCd);
    setText(el.abilityCd, 'cd', cd > 0 ? `${cd}s` : '');
    el.btnAbility.classList.toggle('cooling', cd > 0);
  }

  /* ================= DRAWING ================= */
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  function rr(x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function emoji(ch, x, y, size) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y + 1);
  }
  function label(text, x, y, size, color, weight = 800) {
    ctx.font = `${weight} ${size}px Montserrat, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawFloor() {
    ctx.fillStyle = '#121212';
    rr(0, 0, W, H, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let x = 24; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 24; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = '#8C6F12';
    ctx.lineWidth = 2;
    rr(1, 1, W - 2, H - 2, 14); ctx.stroke();
    // Entrance
    ctx.fillStyle = '#C9A227';
    ctx.fillRect(ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h);
    label(C.entranceName.toUpperCase(), ENTRANCE.x + ENTRANCE.w / 2, ENTRANCE.y + 6, 7, '#0E0E0E', 900);
  }

  function zoneStatus(id) {
    let s = '';
    for (const t of state.tasks) {
      if (t.station !== id) continue;
      if (t.kind === 'fix') s = t.phase === 'live' ? 'live' : (s === 'live' ? s : 'warn');
      else if (!s) s = 'need';
    }
    return s;
  }

  function drawZones() {
    const pulse = 0.5 + 0.5 * Math.sin(state.clock * 6);
    for (const id in ZONES) {
      const z = ZONES[id];
      const st = zoneStatus(id);
      ctx.save();
      if (st === 'warn') { ctx.shadowColor = 'rgba(230,192,74,.9)'; ctx.shadowBlur = 10 + pulse * 14; }
      if (st === 'live') { ctx.shadowColor = 'rgba(229,72,77,.9)'; ctx.shadowBlur = 10 + pulse * 10; }
      ctx.fillStyle = st === 'live' ? '#2a1415' : '#1b1b1b';
      rr(z.x, z.y, z.w, z.h, 12); ctx.fill();
      ctx.restore();
      ctx.lineWidth = st ? 2 : 1.5;
      ctx.strokeStyle = st === 'live' ? '#E5484D' : st ? '#C9A227' : '#3A3A3A';
      rr(z.x, z.y, z.w, z.h, 12); ctx.stroke();

      // Decorations
      if (id === 'seating') {
        ctx.fillStyle = '#2b2b2b';
        for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) { rr(z.x + 18 + c * 24, z.y + 44 + r * 24, 14, 12, 3); ctx.fill(); }
      }
      if (id === 'stage') {
        ctx.fillStyle = '#251f0c';
        rr(z.x + 10, z.y + 36, z.w - 20, 18, 6); ctx.fill();
      }
      const nameColor = st ? '#E6C04A' : '#9a9a9a';
      if (z.w >= 150) {
        emoji(C.stations[id].icon, z.x + 18, z.y + 18, 16);
        label(C.stations[id].name.toUpperCase(), z.x + z.w / 2 + 8, z.y + 18, 10, nameColor, 900);
      } else {
        emoji(C.stations[id].icon, z.x + z.w / 2, z.y + 18, 18);
        label(C.stations[id].name.toUpperCase(), z.x + z.w / 2, z.y + 38, 8, nameColor, 900);
      }

      // What this station is waiting for
      const needs = state.tasks.filter(t => t.station === id);
      needs.forEach((t, i) => {
        const bx = z.x + z.w / 2 - (needs.length - 1) * 13 + i * 26, by = z.y + z.h - 16;
        ctx.fillStyle = t.kind === 'fix' ? '#C9A227' : '#0E0E0E';
        ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = t.kind === 'fix' ? '#E6C04A' : '#5E5E5E'; ctx.lineWidth = 1.5; ctx.stroke();
        // countdown ring
        const frac = t.kind === 'fix' && t.phase === 'live' ? 1 : clamp(t.t / t.total, 0, 1);
        ctx.strokeStyle = t.kind === 'fix' && t.phase === 'live' ? '#E5484D' : (t.t < 6 && t.kind === 'supply' ? '#E5484D' : '#C9A227');
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(bx, by, 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
        emoji(t.def.emoji, bx, by, 12);
      });
    }
  }

  function drawStorage() {
    const z = STORAGE;
    ctx.fillStyle = '#17140a';
    rr(z.x, z.y, z.w, z.h, 12); ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#8C6F12'; ctx.lineWidth = 1.5;
    rr(z.x, z.y, z.w, z.h, 12); ctx.stroke();
    ctx.setLineDash([]);
    label('📦 ' + C.storageName.toUpperCase(), z.x + z.w / 2, z.y + 16, 10, '#C9A227', 900);
    const pulse = 0.5 + 0.5 * Math.sin(state.clock * 7);
    SLOTS.forEach((s, i) => {
      ctx.fillStyle = '#211c0d';
      rr(s.x - 16, s.y - 16, 32, 32, 7); ctx.fill();
      const task = state.tasks.find(t => t.item.slot === i && t.item.state === 'storage');
      if (!task) return;
      ctx.save();
      if (task.kind === 'fix') { ctx.shadowColor = 'rgba(230,192,74,.95)'; ctx.shadowBlur = 8 + pulse * 12; }
      ctx.fillStyle = task.kind === 'fix' ? '#4a3b0c' : '#2a2412';
      rr(s.x - 15, s.y - 15, 30, 30, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = task.kind === 'fix' ? '#E6C04A' : '#C9A227';
      ctx.lineWidth = task.assigned ? 1 : 1.5;
      rr(s.x - 15, s.y - 15, 30, 30, 7); ctx.stroke();
      ctx.globalAlpha = task.assigned ? 0.45 : 1;
      emoji(task.def.emoji, s.x, s.y, 17);
      ctx.globalAlpha = 1;
    });
  }

  function drawPerson(x, y, r, body, rim, text, walk, moving) {
    const bob = moving ? Math.sin(walk) * 1.6 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.95, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (moving) {
      ctx.strokeStyle = rim; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const s = Math.sin(walk) * 4;
      ctx.beginPath(); ctx.moveTo(x - 4, y + r * 0.5); ctx.lineTo(x - 4 + s, y + r + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y + r * 0.5); ctx.lineTo(x + 4 - s, y + r + 3); ctx.stroke();
    }
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x, y - bob, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
    if (text) label(text, x, y - bob + 0.5, r * 0.75, body === '#C9A227' ? '#0E0E0E' : '#bdbdbd', 900);
  }

  function bubble(text, x, y, bg, fg, isEmoji) {
    ctx.font = isEmoji ? `12px ${EMOJI_FONT}` : '800 8px Montserrat, sans-serif';
    const w = Math.max(18, ctx.measureText(text).width + 10);
    ctx.fillStyle = bg;
    rr(x - w / 2, y - 9, w, 16, 7); ctx.fill();
    if (isEmoji) emoji(text, x, y - 1, 11); else label(text, x, y - 1, 8, fg, 800);
  }

  function drawNpcs() {
    for (const n of state.npcs) {
      drawPerson(n.x, n.y, 11, '#3A3A3A', '#5E5E5E', n.dept.short, state.clock * 6, n.pause <= 0 && n.approval <= 0);
      if (n.approval > 0) {
        bubble('📝', n.x, n.y - 22, '#C9A227', '#0E0E0E', true);
        ctx.strokeStyle = '#E6C04A'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, 15, -Math.PI / 2, -Math.PI / 2 + (n.approval / T.approvalTime) * Math.PI * 2); ctx.stroke();
      } else if (n.stare > 0) {
        bubble('👀', n.x, n.y - 22, '#262626', '#ccc', true);
      } else if (n.pause > 0.9) {
        bubble('💬', n.x, n.y - 22, '#262626', '#ccc', true);
      }
    }
  }

  function drawVolunteers() {
    for (const v of state.volunteers) {
      drawPerson(v.x, v.y, 8, '#C9A227', '#8C6F12', 'V', v.walk, v.phase !== 'idle');
      if (v.phase === 'toStation' && v.task) emoji(v.task.def.emoji, v.x, v.y - 16, 12);
    }
  }

  function drawPlayer() {
    const p = state.player;
    if (p.sprint > 0) {
      ctx.fillStyle = 'rgba(201,162,39,.18)';
      ctx.beginPath(); ctx.arc(p.x - p.dir * 8, p.y, PR + 2, 0, Math.PI * 2); ctx.fill();
    }
    if (p.immune > 0 && p.stun <= 0 && Math.floor(state.clock * 10) % 2) ctx.globalAlpha = 0.6;
    drawPerson(p.x, p.y, PR + 1, '#C9A227', '#E6C04A', 'T', p.walk, p.moving);
    ctx.globalAlpha = 1;
    // Position badge
    bubble(state.pos.badge, p.x, p.y + PR + 12, '#0E0E0E', '#E6C04A', false);
    // Carried items stack above the head
    p.carry.forEach((t, i) => emoji(t.def.emoji, p.x - (p.carry.length - 1) * 8 + i * 16, p.y - PR - 12, 15));
    if (p.stun > 0) bubble('💬', p.x + 14, p.y - PR - 8, '#262626', '#ccc', true);
    // Tap-to-walk marker
    if (state.moveTarget) {
      ctx.strokeStyle = 'rgba(201,162,39,.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(state.moveTarget.x, state.moveTarget.y, 7 + Math.sin(state.clock * 8) * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawJoystick() {
    if (!joy.active || !joy.moved) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const r = el.wrap.getBoundingClientRect();
    const sx = joy.sx - r.left, sy = joy.sy - r.top;
    ctx.strokeStyle = 'rgba(201,162,39,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(201,162,39,.55)';
    ctx.beginPath(); ctx.arc(sx + joy.vx * 34, sy + joy.vy * 34, 18, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    if (!state.player) return;
    const s = view.dpr * view.scale;
    ctx.setTransform(s, 0, 0, s, view.dpr * view.ox, view.dpr * view.oy);
    drawFloor();
    drawZones();
    drawStorage();
    drawVolunteers();
    drawNpcs();
    drawPlayer();
    drawJoystick();
  }

  /* ================= INPUT ================= */
  function onDown(e) {
    if (state.screen !== 'game' || !state.running || state.paused) return;
    if (e.target.closest('.ability')) return;
    initAudio();
    joy.active = true; joy.id = e.pointerId;
    joy.sx = e.clientX; joy.sy = e.clientY; joy.vx = 0; joy.vy = 0;
    joy.t0 = performance.now(); joy.moved = false;
    try { el.wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function onMove(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    const dx = e.clientX - joy.sx, dy = e.clientY - joy.sy;
    const l = Math.hypot(dx, dy);
    if (l > 8) joy.moved = true;
    if (!joy.moved) return;
    const m = Math.min(1, l / 40);
    joy.vx = l ? (dx / l) * m : 0;
    joy.vy = l ? (dy / l) * m : 0;
  }
  function onUp(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    // A quick tap walks the player to that spot.
    if (!joy.moved && performance.now() - joy.t0 < 300 && e.type === 'pointerup') {
      const w = toWorld(e.clientX, e.clientY);
      if (w.x >= 0 && w.x <= W && w.y >= 0 && w.y <= H) state.moveTarget = { x: clamp(w.x, PR + 4, W - PR - 4), y: clamp(w.y, PR + 4, H - PR - 4) };
    }
    joy.active = false; joy.vx = 0; joy.vy = 0; joy.moved = false;
  }
  function onKey(e, down) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(k)) {
      if (state.screen === 'game') e.preventDefault();
      if (down) keys.add(k); else keys.delete(k);
    }
    if (down && (k === ' ' || k === 'e') && state.screen === 'game') { e.preventDefault(); useAbility(); }
    if (down && (k === 'Escape' || k === 'p') && state.screen === 'game') { if (state.paused) resume(); else pause(); }
  }

  /* ================= PAUSE ================= */
  function showCard(title, body, buttons) {
    el.cardTitle.textContent = title;
    el.cardBody.textContent = body;
    el.cardActions.replaceChildren();
    for (const b of buttons) {
      const btn = h('button', 'btn ' + (b.primary ? 'btn-primary' : 'btn-ghost'), b.label);
      btn.type = 'button';
      btn.addEventListener('click', b.onClick);
      el.cardActions.appendChild(btn);
    }
    el.overlay.hidden = false;
  }
  function pause() {
    if (!state.running || state.paused) return;
    state.paused = true;
    keys.clear(); joy.active = false;
    showCard(C.ui.pausedTitle, C.ui.pausedBody, [
      { label: C.ui.resume, primary: true, onClick: resume },
      { label: C.ui.quit, primary: false, onClick: quit },
    ]);
  }
  function resume() { el.overlay.hidden = true; state.paused = false; last = performance.now(); }
  function quit() { el.overlay.hidden = true; state.running = false; state.paused = false; choosePosition(state.pos.id); setScreen('start'); }

  /* ================= END OF SHIFT ================= */
  function endShift(collapsed) {
    state.running = false;
    keys.clear(); joy.active = false;
    const R = C.results;
    const bonus = collapsed ? 0 : Math.round(state.readiness * 10 * state.pos.multiplier);
    state.score = Math.round(state.score + bonus);
    const key = KEYS.best(state.pos.id);
    const prev = store.get(key, 0);
    const isNew = state.score > prev && state.score > 0;
    if (isNew) store.set(key, state.score);

    el.resTitle.textContent = collapsed ? R.titleCollapsed : R.titleDone;
    el.resScore.textContent = fmt(state.score);
    el.resBest.textContent = isNew ? R.newBest : fill(C.ui.best, { position: state.pos.name, score: fmt(Math.max(prev, state.score)) });
    el.resBest.classList.toggle('new', isNew);
    let rank = C.ranks[0].title;
    for (const r of C.ranks) if (state.score >= r.min) rank = r.title;
    el.resRank.textContent = rank;
    const s = state.stats;
    const rows = [
      [R.rows.position, state.pos.name],
      [R.rows.delivered, s.delivered],
      [R.rows.missed, s.missed],
      [R.rows.prevented, s.prevented],
      ...(state.pos.approvals ? [[R.rows.approvals, s.approvals]] : []),
      [R.rows.jealousy, s.jealousy + s.prevented],
      [R.rows.score, fmt(state.score)],
    ];
    el.resTable.replaceChildren(...rows.map(([a, b]) => { const tr = h('tr'); tr.append(h('td', '', a), h('td', '', String(b))); return tr; }));
    el.resFinal.textContent = collapsed ? R.collapsedLine : R.finalLine;
    el.shareStatus.textContent = '';
    el.shareFallback.hidden = true;
    setScreen('results');
    el.screens.results.scrollTop = 0;
    if (collapsed) sfx('fail'); else { sfx('end'); setTimeout(() => confetti(90), 300); }
  }

  /* ================= SHARE ================= */
  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  async function share() {
    const R = C.results;
    const text = fill(R.shareText, { score: fmt(state.score), position: state.pos.name });
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) ok = legacyCopy(text);
    el.shareStatus.classList.toggle('err', !ok);
    if (ok) { el.shareStatus.textContent = R.copied; el.shareFallback.hidden = true; }
    else {
      el.shareStatus.textContent = R.copyFailed;
      el.shareFallback.value = text; el.shareFallback.hidden = false;
      el.shareFallback.focus(); el.shareFallback.select();
    }
  }

  /* ================= LOOP ================= */
  let last = performance.now();
  function update(dt) {
    state.time -= dt;
    const sec = Math.ceil(state.time);
    if (sec <= 5 && sec > 0 && sec !== state.lastTick) { state.lastTick = sec; sfx('tick'); }
    state.abilityCd = Math.max(0, state.abilityCd - dt);
    updatePlayer(dt);
    updateNpcs(dt);
    updateVolunteers(dt);
    updateTasks(dt);
    state.readiness = clamp(state.readiness, 0, 100);
    if (state.readiness <= 0) { endShift(true); return; }
    if (state.time <= 0) { state.time = 0; endShift(false); }
  }
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state.screen === 'game') {
      if (state.running && !state.paused) { state.clock += dt; update(dt); }
      if (state.screen === 'game') { renderHud(); draw(); }
    }
    requestAnimationFrame(frame);
  }

  /* ================= BOOT ================= */
  function boot() {
    fillStatic();
    buildPositions();
    renderMute();
    el.btnStart.addEventListener('click', startShift);
    el.btnAgain.addEventListener('click', startShift);
    el.btnChange.addEventListener('click', () => { choosePosition(state.pos.id); setScreen('start'); el.screens.start.scrollTop = 0; });
    el.btnShare.addEventListener('click', share);
    el.btnPause.addEventListener('click', pause);
    el.btnAbility.addEventListener('click', e => { e.stopPropagation(); initAudio(); useAbility(); });
    el.btnAbility.addEventListener('pointerdown', e => e.stopPropagation());
    el.muteBtns.forEach(b => b.addEventListener('click', () => {
      audio.muted = !audio.muted; store.set(KEYS.muted, audio.muted); initAudio(); renderMute();
    }));
    el.wrap.addEventListener('pointerdown', onDown);
    el.wrap.addEventListener('pointermove', onMove);
    el.wrap.addEventListener('pointerup', onUp);
    el.wrap.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('resize', () => { if (state.screen === 'game') resize(); });
    window.addEventListener('blur', () => keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    requestAnimationFrame(frame);
  }
  boot();

  // Hook for automated tests.
  window.__onDuty = { state, ZONES, SLOTS, STORAGE, W, H, startShift, useAbility, choosePosition };
})();

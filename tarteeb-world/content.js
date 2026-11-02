/*
 * TARTEEB: ON DUTY. ALL GAME TEXT LIVES HERE.
 *
 * Edit jokes, positions and messages here without touching game.js.
 *   - Keep the quotes and commas exactly as they are.
 *   - Roast departments, never real people. No real names, event names or dates.
 *   - Words in {curly braces} are filled in by the game.
 */
window.ON_DUTY_CONTENT = {

  meta: {
    title: 'Tarteeb: On Duty',
    org: 'RIZQ Society · Logistics Department',
    tagline: 'Walk the venue. Carry the event. Make every department jealous.',
  },

  ui: {
    choosePosition: 'Choose your position',
    startButton: 'Start shift',
    howTo: [
      'Phone: drag anywhere to walk. Computer: arrow keys or WASD, Space for your ability.',
      'Walk over a supply in Storage to pick it up, then walk into the station that asked for it.',
      'Glowing gold items fix problems before they happen. Get them there early for double points.',
      'Grey characters are other departments. Bump into one and they\'ll stop you for a "quick question".',
    ],
    best: 'Best as {position}: {score}',
    score: 'Score',
    time: 'Doors in',
    readiness: 'Venue Readiness',
    carrying: 'Carrying',
    nothing: 'nothing',
    pausedTitle: 'Paused',
    pausedBody: 'The venue will wait. Briefly.',
    resume: 'Resume',
    quit: 'Quit shift',
    mute: 'Mute sound',
    unmute: 'Turn sound on',
    full: 'Hands full',
    nothingToDelegate: 'Nothing to delegate yet',
    delegated: 'Volunteer on it',
    noVolunteer: 'All volunteers busy',
    sprint: 'Sprint!',
    onTime: '+{pts}',
    sawItComing: 'Tarteeb saw it coming',
    lateFix: 'Fixed. Again.',
    approved: 'Approved +{pts}',
    jealousy: 'JEALOUSY +1',
    stopped: 'Stopped by {dept}',
  },

  /*
   * POSITIONS. Each one plays differently.
   *   speed      = walking speed
   *   carry      = items you can hold at once
   *   volunteers = helpers you can send with your ability (0 = none)
   *   ability    = 'sprint' or 'delegate'
   *   cooldown   = seconds between ability uses
   *   multiplier = score multiplier
   *   npcs       = how many departments wander around (and stop you)
   *   approvals  = true if departments keep asking you to sign things off
   *   taskEvery  = seconds between new requests at the start of the shift
   *   maxTasks   = most open requests at once (late in the shift)
   */
  positions: [
    {
      id: 'member', name: 'Team Member', badge: 'TM',
      blurb: 'Hands-on and quick. You run everything yourself.',
      perks: ['Fastest walker', 'Carry 1 item', 'Ability: Sprint', 'Score ×1'],
      speed: 150, carry: 1, volunteers: 0, ability: 'sprint', abilityName: 'Sprint', cooldown: 9,
      multiplier: 1, npcs: 3, approvals: false, taskEvery: 7, maxTasks: 4,
    },
    {
      id: 'ad', name: 'AD', badge: 'AD',
      blurb: 'More requests, bigger hands, and a volunteer to send on jobs.',
      perks: ['Carry 2 items', '1 volunteer', 'Ability: Delegate', 'Score ×1.25'],
      speed: 132, carry: 2, volunteers: 1, ability: 'delegate', abilityName: 'Delegate', cooldown: 8,
      multiplier: 1.25, npcs: 4, approvals: false, taskEvery: 6, maxTasks: 5,
    },
    {
      id: 'director', name: 'Director', badge: 'DIR',
      blurb: 'Everyone wants a word with you. Lead the volunteers, sign things off, keep the venue standing.',
      perks: ['2 volunteers', 'Signs off department requests', 'Every department stops you', 'Score ×1.5'],
      speed: 118, carry: 1, volunteers: 2, ability: 'delegate', abilityName: 'Delegate', cooldown: 6,
      multiplier: 1.5, npcs: 6, approvals: true, taskEvery: 5, maxTasks: 6,
    },
  ],

  shift: {
    duration: 100,          // seconds
    startReadiness: 70,
  },

  // Venue areas. "id" is used by game.js.
  stations: {
    stage:        { name: 'Stage',        icon: '🎤' },
    seating:      { name: 'Seating',      icon: '💺' },
    refreshments: { name: 'Refreshments', icon: '🥤' },
    registration: { name: 'Registration', icon: '🗂️' },
  },
  storageName: 'Storage',
  entranceName: 'Entrance',

  supplies: {
    chairs:  { emoji: '🪑', label: 'Chairs',         station: 'seating' },
    tables:  { emoji: '🍽️', label: 'Tables',         station: 'refreshments' },
    water:   { emoji: '💧', label: 'Water',          station: 'refreshments' },
    banner:  { emoji: '🎏', label: 'Banner',         station: 'stage' },
    cord:    { emoji: '🔌', label: 'Extension cord', station: 'stage' },
    sound:   { emoji: '🔊', label: 'Sound system',   station: 'stage' },
    standee: { emoji: '🪧', label: 'Standee',        station: 'registration' },
    badges:  { emoji: '🪪', label: 'Volunteer badges', station: 'registration' },
  },

  // Problems glow on a station before they happen. Deliver the gold fix item early.
  problems: [
    { warn: 'Mic about to die',        live: 'Mic died',          station: 'stage',        fix: { emoji: '🔋', label: 'Spare batteries' }, from: 'events',    message: 'mic not working?? Tarteeb pls' },
    { warn: 'Vendor stuck in traffic', live: 'No food yet',       station: 'refreshments', fix: { emoji: '🛵', label: 'Backup vendor' },   from: 'marketing', message: 'we promised food in the caption. Tarteeb can you handle?' },
    { warn: 'Guest list changed',      live: 'Wrong guest list',  station: 'registration', fix: { emoji: '📋', label: 'Updated list' },    from: 'hr',        message: 'oh the list changed yesterday, did nobody tell Tarteeb?' },
    { warn: 'Running short on seats',  live: 'People standing',   station: 'seating',      fix: { emoji: '🪑', label: 'Chair stack' },     from: 'projects',  message: 'what if... more chairs? Tarteeb thoughts?' },
  ],

  departments: [
    { id: 'events',    name: 'Events',            short: 'EVT' },
    { id: 'hr',        name: 'HR',                short: 'HR'  },
    { id: 'marketing', name: 'Marketing',         short: 'MKT' },
    { id: 'projects',  name: 'Projects',          short: 'PRJ' },
    { id: 'media',     name: 'Media & Design',    short: 'M&D' },
    { id: 'exec',      name: 'Executive Council', short: 'EC'  },
  ],

  // What a department says when you bump into them.
  quickQuestions: [
    '"Quick question" (it was not quick)',
    '"Can you be in our post real quick?"',
    '"Collab?" (they want the credit)',
    '"How are you this organised?"',
    '"Can we borrow your volunteers forever?"',
  ],

  // When a request runs out of time.
  missedLines: [
    'did nobody bring this?? Tarteeb?',
    'we\'ll just say it was intentional',
    'Tarteeb pls, the guests are looking',
  ],

  // Director only: departments asking for sign-off.
  approvalLines: [
    'Approved. (Tarteeb had already done it.)',
    'Signed. They\'re jealous of the signature too.',
    'Approved in 2 seconds. Their meeting took 2 hours.',
  ],
  approvalMissed: 'still waiting for the Director to sign off...',

  // Every few on-time deliveries.
  jealousLines: [
    { from: 'events',    text: 'how is Tarteeb this fast 😑' },
    { from: 'hr',        text: 'why do the volunteers only listen to Tarteeb' },
    { from: 'marketing', text: 'who gave Tarteeb a fan club??' },
    { from: 'projects',  text: 'new idea: be Tarteeb' },
    { from: 'media',     text: 'their setup looks better than our poster' },
    { from: 'exec',      text: 'noted. (secretly impressed)' },
  ],

  results: {
    kicker: 'Shift report',
    titleDone: 'Doors open. Venue ready.',
    titleCollapsed: 'The venue fell apart',
    collapsedLine: 'The other departments are celebrating a little too loudly. Run it back.',
    finalLine: 'Tarteeb: We don\'t wait for the plan. We are the plan.',
    rows: {
      position: 'Position',
      delivered: 'Requests delivered',
      missed: 'Requests missed',
      prevented: 'Problems prevented',
      approvals: 'Sign-offs',
      jealousy: 'Jealous departments',
      score: 'Score',
    },
    newBest: 'New best!',
    rankLabel: 'Rank',
    again: 'Play again',
    change: 'Change position',
    challenge: 'Challenge another department',
    shareText: 'I scored {score} as {position} in Tarteeb: On Duty. Your department couldn\'t. (It\'s okay to be jealous.)',
    copied: 'Copied! Now send it to them.',
    copyFailed: 'Couldn\'t copy automatically. Select the text below and copy it.',
  },

  // Rank by final score (lowest first).
  ranks: [
    { min: 0,    title: 'Volunteer' },
    { min: 1500, title: 'Chair Commander' },
    { min: 3500, title: 'Extension Cord Whisperer' },
    { min: 6000, title: 'Crisis Prevention Specialist' },
    { min: 9000, title: 'Director of Tarteeb' },
  ],
};

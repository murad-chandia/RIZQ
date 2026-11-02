/*
 * TARTEEB: ON DUTY. ALL GAME TEXT LIVES HERE.
 *
 * Theme: Tarteeb is the coolest department in RIZQ. Every other department is jealous
 * and keeps trying to take the credit.
 *
 * Edit jokes, positions, shifts and messages here without touching game.js.
 *   - Keep the quotes and commas exactly as they are.
 *   - Roast departments, never real people. No real names, event names or dates.
 *   - Words in {curly braces} are filled in by the game.
 */
window.ON_DUTY_CONTENT = {

  meta: {
    title: 'Tarteeb: On Duty',
    org: 'RIZQ Society · Logistics Department',
    tagline: 'Five events. One department doing all the work. Everyone else is jealous.',
  },

  ui: {
    choosePosition: 'Choose your position',
    startButton: 'Start the run',
    howTo: [
      'Phone: drag anywhere to walk, or tap a spot. Computer: arrow keys or WASD, Space for your ability.',
      'Walk over a supply in Storage to pick it up, then walk into the station that asked for it.',
      'Other departments race you for supplies to steal the credit. Get there first, or bump them to take it back.',
      'Bumping a department that isn\'t carrying anything gets you stopped for a "quick question".',
    ],
    best: 'Best as {position}: {score}',
    score: 'Score',
    time: 'Doors in',
    readiness: 'Venue Readiness',
    carrying: 'Carrying',
    pausedTitle: 'Paused',
    pausedBody: 'The venue will wait. Briefly.',
    resume: 'Resume',
    quit: 'Quit run',
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
    beatThem: 'Beat {dept} to it! +{pts}',
    tookBack: 'Took it back from {dept}! +{pts}',
    shiftKicker: 'Shift {n} of {total}',
    go: 'Go',
    shiftCleared: 'Shift {n} cleared',
    shiftFailed: 'Shift failed',
    failedReadiness: 'The venue fell apart',
    failedPacking: 'Security locked up with {left} items still out',
    retry: 'Retry shift',
    endRun: 'End run',
    startShift: 'Start Shift {n}',
    seeShowdown: 'See the showdown',
    upNext: 'Up next · Shift {n}',
    roastKicker: 'Overheard in other departments',
    roastTarteeb: 'Tarteeb',
    packed: 'Packed {n}/{total}',
    boardLeader: 'Tarteeb',
    chaosPrefix: 'CHAOS',
  },

  /*
   * POSITIONS. Each one plays differently.
   *   speed      = walking speed
   *   carry      = items you can hold at once
   *   volunteers = helpers you can send with your ability (0 = none)
   *   ability    = 'sprint' or 'delegate'
   *   cooldown   = seconds between ability uses
   *   multiplier = score multiplier
   *   npcs       = how many departments wander around (and compete with you)
   *   approvals  = true if departments keep asking you to sign things off
   *   taskEvery  = seconds between new requests at the start of a shift
   *   maxTasks   = most open requests at once (late in a shift)
   */
  positions: [
    {
      id: 'member', name: 'Team Member', badge: 'TM',
      blurb: 'Hands-on and quick. You run everything yourself.',
      perks: ['Fastest walker', 'Carry 1 item', 'Ability: Sprint', '3 rival departments', 'Score ×1'],
      speed: 150, carry: 1, volunteers: 0, ability: 'sprint', abilityName: 'Sprint', cooldown: 9,
      multiplier: 1, npcs: 3, approvals: false, taskEvery: 7, maxTasks: 4,
    },
    {
      id: 'ad', name: 'AD', badge: 'AD',
      blurb: 'More requests, bigger hands, and a volunteer to send on jobs.',
      perks: ['Carry 2 items', '1 volunteer', 'Ability: Delegate', '4 rival departments', 'Score ×1.25'],
      speed: 132, carry: 2, volunteers: 1, ability: 'delegate', abilityName: 'Delegate', cooldown: 8,
      multiplier: 1.25, npcs: 4, approvals: false, taskEvery: 6, maxTasks: 5,
    },
    {
      id: 'director', name: 'Director', badge: 'DIR',
      blurb: 'Everyone wants a word with you. Lead the volunteers, sign things off, keep the venue standing.',
      perks: ['2 volunteers', 'Signs off requests', 'All 6 departments compete', 'Score ×1.5'],
      speed: 118, carry: 1, volunteers: 2, ability: 'delegate', abilityName: 'Delegate', cooldown: 6,
      multiplier: 1.5, npcs: 6, approvals: true, taskEvery: 5, maxTasks: 6,
    },
  ],

  startReadiness: 70,

  /*
   * SHIFTS (the five events). Each one is one object. To add a shift, copy a whole { ... } block.
   *   mode         = 'setup' (deliver requests to stations) or 'dismantle' (carry everything back to Storage)
   *   duration     = seconds on the clock
   *   pace         = how fast requests come (1 = normal, bigger = faster)
   *   supplies     = which supplies get requested, and how often (bigger number = more often)
   *   problems     = which problems can happen (ids from PROBLEMS below); [] = none
   *   stealEvery   = seconds between departments racing you for a supply (0 = never)
   *   chaosEvery   = seconds between chaos events (0 = never); chaos = which ones
   *   stationNames = optional renames for this shift
   *   total        = 'dismantle' only: items to carry back to Storage
   *   messages     = optional messages that pop up during the shift
   */
  shifts: [
    {
      title: 'Orientation Session',
      intro: 'Events said it\'s a small session. It is not a small session.',
      howTo: 'Learn the venue: grab supplies from Storage and deliver them before the countdown rings run out.',
      clearLine: 'Small session. Big setup. The freshers already want to join Tarteeb.',
      rules: {
        mode: 'setup', duration: 50, pace: 1,
        supplies: { chairs: 2, water: 2, banner: 1, standee: 1, sound: 1, badges: 1 },
        problems: ['mic', 'vendor', 'guests'], stealEvery: 0, chaosEvery: 0,
      },
    },
    {
      title: 'Panel Discussion',
      intro: 'Marketing promised 300 attendees. Tarteeb has to find 300 chairs.',
      howTo: 'Chairs, chairs, chairs. And now departments race you for supplies to take the credit. Get there first.',
      clearLine: 'Every seat filled. Marketing is "not impressed" (very impressed).',
      rules: {
        mode: 'setup', duration: 45, pace: 1.25,
        supplies: { chairs: 6, sound: 1, standee: 1, water: 1 },
        problems: ['seats', 'mic'], stealEvery: 11, chaosEvery: 0,
      },
    },
    {
      title: 'Charity Drive',
      intro: 'Projects had the idea. Tarteeb has the boxes, the vans and the volunteers.',
      howTo: 'The stage is now the Loading Bay. Boxes and van keys go there. Watch for departments grabbing boxes for a photo.',
      clearLine: 'Van loaded. Projects is drafting a plan called "be more like Tarteeb".',
      stationNames: { stage: { name: 'Loading Bay', icon: '🚐' } },
      rules: {
        mode: 'setup', duration: 50, pace: 1.15,
        supplies: { boxes: 4, vankeys: 1, badges: 2, water: 2, tables: 1 },
        problems: ['van', 'vendor', 'guests'], stealEvery: 9, chaosEvery: 0,
      },
    },
    {
      title: 'Flagship Event',
      intro: 'Every department is panicking at once. Tarteeb is not.',
      howTo: 'Everything at once, plus chaos: lights going out, rushes of requests, and departments crowding you.',
      clearLine: 'Flagship delivered. Four departments just asked to "collab" with Tarteeb.',
      rules: {
        mode: 'setup', duration: 55, pace: 1.45,
        supplies: { chairs: 2, tables: 1, water: 2, banner: 1, cord: 1, sound: 1, standee: 1, badges: 1 },
        problems: ['mic', 'vendor', 'guests', 'seats', 'cord'], stealEvery: 8,
        chaosEvery: 11, chaos: ['timeCut', 'rush', 'blackout', 'swarm', 'steals'],
      },
    },
    {
      title: 'Boss: Dismantling',
      intro: 'Everyone left for dinner. Return and count every item before security locks the venue.',
      howTo: 'Reverse it: pick up every item left around the venue and carry it back to Storage. No one else is helping.',
      clearLine: 'Every item counted. Even security asked how to join Tarteeb.',
      messages: [
        { from: 'exec',      text: 'Is it done? Also, are Tarteeb hoodies available in medium?' },
        { from: 'events',    text: 'Great event guys!! (has left the building)' },
        { from: 'marketing', text: 'Posted the recap. Cut Tarteeb out of the photos. Likes dropped 80%.' },
        { from: 'projects',  text: 'What if next time we... also helped?' },
      ],
      rules: {
        mode: 'dismantle', duration: 50, total: 14, startItems: 7,
        supplies: { chairs: 3, tables: 2, water: 1, banner: 1, cord: 1, sound: 1, standee: 1, badges: 1 },
        problems: [], stealEvery: 0, chaosEvery: 0,
      },
    },
  ],

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
    chairs:  { emoji: '🪑', label: 'Chairs',           station: 'seating' },
    tables:  { emoji: '🍽️', label: 'Tables',           station: 'refreshments' },
    water:   { emoji: '💧', label: 'Water',            station: 'refreshments' },
    banner:  { emoji: '🎏', label: 'Banner',           station: 'stage' },
    cord:    { emoji: '🔌', label: 'Extension cord',   station: 'stage' },
    sound:   { emoji: '🔊', label: 'Sound system',     station: 'stage' },
    standee: { emoji: '🪧', label: 'Standee',          station: 'registration' },
    badges:  { emoji: '🪪', label: 'Volunteer badges', station: 'registration' },
    boxes:   { emoji: '📦', label: 'Donation boxes',   station: 'stage' },
    vankeys: { emoji: '🔑', label: 'Van keys',         station: 'stage' },
  },

  // Problems glow on a station before they happen. Deliver the gold fix item early.
  problems: [
    { id: 'mic',    warn: 'Mic about to die',         live: 'Mic died',          station: 'stage',        fix: { emoji: '🔋', label: 'Spare batteries' }, from: 'events',    message: 'mic not working?? Tarteeb pls (we\'ll say we fixed it)' },
    { id: 'cord',   warn: 'Extension cord missing',   live: 'Projector has no power', station: 'stage',   fix: { emoji: '🔌', label: 'Spare cord' },      from: 'media',     message: 'our laptop died mid-slideshow. Does Tarteeb have a cord? (they always do)' },
    { id: 'van',    warn: 'Van driver not answering', live: 'No van yet',        station: 'stage',        fix: { emoji: '🚐', label: 'Backup van' },      from: 'projects',  message: 'the van is a logistics thing, right? Tarteeb?' },
    { id: 'vendor', warn: 'Vendor stuck in traffic',  live: 'No food yet',       station: 'refreshments', fix: { emoji: '🛵', label: 'Backup vendor' },   from: 'marketing', message: 'we promised food in the caption. Tarteeb can you handle?' },
    { id: 'guests', warn: 'Guest list changed',       live: 'Wrong guest list',  station: 'registration', fix: { emoji: '📋', label: 'Updated list' },    from: 'hr',        message: 'oh the list changed yesterday, did nobody tell Tarteeb?' },
    { id: 'seats',  warn: 'Running short on seats',   live: 'People standing',   station: 'seating',      fix: { emoji: '🪑', label: 'Chair stack' },     from: 'projects',  message: 'what if... more chairs? Tarteeb thoughts?' },
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

  // Credit stealing: a department races you for a supply.
  stealStart: 'is going for the {item} to take the credit. Beat them to it!',
  stealWin: [
    'we did this 😌 (Tarteeb did the other 90%)',
    'posting "our team set this up" now',
    'carried it 10 metres. Exhausted. Iconic.',
  ],
  stealLose: 'fine. Tarteeb can have it. (jealous)',

  // When a request runs out of time.
  missedLines: [
    'did nobody bring this?? Tarteeb?',
    'we\'ll just say it was intentional',
    'Tarteeb pls, the guests are looking',
  ],

  // Director only: departments asking for sign-off.
  approvalAsk: '📝 needs the Director\'s sign-off. Walk over to approve.',
  approvalLines: [
    'Approved. (Tarteeb had already done it.)',
    'Signed. They\'re jealous of the signature too.',
    'Approved in 2 seconds. Their meeting took 2 hours.',
  ],
  approvalMissed: 'still waiting for the Director to sign off...',

  // Every few deliveries in a row.
  jealousLines: [
    { from: 'events',    text: 'how is Tarteeb this fast 😑' },
    { from: 'hr',        text: 'why do the volunteers only listen to Tarteeb' },
    { from: 'marketing', text: 'who gave Tarteeb a fan club??' },
    { from: 'projects',  text: 'new idea: be Tarteeb' },
    { from: 'media',     text: 'their setup looks better than our poster' },
    { from: 'exec',      text: 'noted. (secretly impressed)' },
  ],

  // Live scoreboard: what the other departments are "doing".
  boardStatuses: ['typing...', 'Seen ✓✓', 'in a meeting', 'watching Tarteeb', 'loading...', 'pretending not to care'],

  /*
   * CHAOS EVENTS (Flagship). "effect" must be one of:
   *   timeCut (clock loses seconds), rush (three requests at once), blackout (lights go out),
   *   swarm (every department crowds you), steals (two departments race you at once)
   */
  chaos: [
    { effect: 'timeCut',  from: 'marketing', text: 'Moved the start time up so their post "goes live first".' },
    { effect: 'rush',     from: 'events',    text: '"Oh, also, these all need to be there now."' },
    { effect: 'blackout', from: 'media',     text: 'Turned the lights off so Tarteeb looks less cool. Didn\'t work.' },
    { effect: 'swarm',    from: 'hr',        text: 'Everyone wants a "quick word" with Tarteeb. At once.' },
    { effect: 'steals',   from: 'exec',      text: 'Two departments want credit for the same event. Race them.' },
  ],
  chaosTimeCut: 6,

  /*
   * ROAST CARDS. One is shown at random between shifts.
   */
  roasts: [
    { dept: 'Events',            them: '"Why do the volunteers keep asking to join Tarteeb instead?"', tarteeb: 'Because we let them carry the speaker.' },
    { dept: 'Events',            them: '"We\'ll confirm the venue tomorrow."',            tarteeb: 'Booked it last week.' },
    { dept: 'HR',                them: 'Filed a complaint: "Tarteeb is having too much fun."', tarteeb: 'Complaint noted. Fun continued.' },
    { dept: 'HR',                them: 'Made a spreadsheet to track who\'s active.',       tarteeb: 'Was the whole spreadsheet.' },
    { dept: 'Marketing',         them: 'Posted a photo of Tarteeb\'s setup as their own content.', tarteeb: 'It became their most-liked post of the year.' },
    { dept: 'Marketing',         them: '"BIG ANNOUNCEMENT COMING SOON 👀" (week 4)',      tarteeb: 'The venue has been ready since week 2.' },
    { dept: 'Projects',          them: 'Started a plan called "How to be more like Tarteeb." Still in the thinking stage.', tarteeb: 'Step 1: show up. We\'ll wait.' },
    { dept: 'Projects',          them: '"What if we did something impactful?"',          tarteeb: 'Already loading the van.' },
    { dept: 'Media & Design',    them: 'Asked Tarteeb to pose for the poster.',            tarteeb: 'Too busy working. The blurry background photo still looked cooler.' },
    { dept: 'Media & Design',    them: 'Took 400 photos of the event.',                    tarteeb: 'Is in none of them because Tarteeb was working.' },
    { dept: 'Executive Council', them: 'Wore a Tarteeb hoodie "by accident".',             tarteeb: 'Sure.' },
    { dept: 'Executive Council', them: '"Great work, team!"',                              tarteeb: 'The team was Tarteeb.' },
  ],

  /*
   * END SCREEN: Coolest Department Showdown.
   */
  results: {
    kicker: 'Run complete',
    titleDone: 'Coolest Department Showdown',
    titleEnded: 'Run ended early',
    chartTitle: 'Official* Department Rankings',
    footnote: '*Data collected and verified by Tarteeb. Other departments want it counted again.',
    offChart: 'off the chart ↗',
    categories: [
      { key: 'points',     label: 'Points this run' },
      { key: 'initiative', label: 'Problems prevented' },
      { key: 'credit',     label: 'Credit actually earned' },
      { key: 'jealousy',   label: 'Jealousy caused' },
    ],
    otherStatuses: ['Pretending not to care', 'Wants a re-count', 'Seen ✓✓', 'Still discussing', 'Watching from a distance', 'Asking for the hoodie link'],
    rows: {
      position: 'Position',
      shifts: 'Shifts cleared',
      delivered: 'Requests delivered',
      prevented: 'Problems prevented',
      raced: 'Races won vs departments',
      stolen: 'Credit stolen by departments',
      approvals: 'Sign-offs',
    },
    newBest: 'New best!',
    rankLabel: 'Rank',
    finalLine: 'Tarteeb: We don\'t wait for the plan. We are the plan.',
    finalSub: 'Everyone else: 👀',
    again: 'Play again',
    change: 'Change position',
    challenge: 'Challenge another department',
    shareText: 'I scored {score} as {position} in Tarteeb: On Duty. Your department couldn\'t. (It\'s okay to be jealous.)',
    copied: 'Copied! Now send it to them.',
    copyFailed: 'Couldn\'t copy automatically. Select the text below and copy it.',
  },

  // Rank by final score (lowest first).
  ranks: [
    { min: 0,     title: 'Volunteer' },
    { min: 4000,  title: 'Chair Commander' },
    { min: 9000,  title: 'Extension Cord Whisperer' },
    { min: 15000, title: 'Crisis Prevention Specialist' },
    { min: 22000, title: 'Director of Tarteeb' },
  ],
};

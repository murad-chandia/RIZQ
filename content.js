/*
 * TARTEEB RUSH: ALL GAME TEXT LIVES HERE.
 *
 * You can edit jokes, level intros, roast cards and messages in this file
 * without touching game.js. Rules:
 *   - Keep the quotes and commas exactly as they are around each line.
 *   - Roast departments, never real people. No real names, event names or dates.
 *   - Words in {curly braces} are filled in by the game (e.g. {score}).
 */
window.TARTEEB_CONTENT = {

  meta: {
    title: 'Tarteeb Rush',
    org: 'RIZQ Society · Logistics Department',
    tagline: 'The doors open soon. Everyone else is still discussing it.',
  },

  ui: {
    startButton: 'Start setting up',
    howTo: [
      'Drag each supply to its station. Or tap it, then tap the station.',
      'Fill Venue Readiness to 100% before the doors open.',
    ],
    highScore: 'Best: {score}',
    goButton: 'Doors open soon. Go',
    nextButton: 'Next level',
    retryButton: 'Retry level',
    endRunButton: 'End run',
    playAgainButton: 'Play again',
    pausedTitle: 'Paused',
    pausedBody: 'Tarteeb never pauses. You may.',
    resumeButton: 'Resume',
    wrongStation: 'Wrong station',
    readiness: 'Venue Readiness',
    levelClearedKicker: 'Level {n} cleared',
    levelFailedKicker: 'Doors opened',
    levelFailedTitle: 'Venue only {pct}% ready',
    continueButton: 'Continue',
    counted: 'Counted {n}/{total}',
    timeBonus: 'Time bonus',
    prevented: 'Problems prevented',
    roastKicker: 'Meanwhile, in other departments',
    roastTarteeb: 'Tarteeb',
    chaosPrefix: 'CHAOS',
    levelScore: 'Level score',
    totalScore: 'Total score',
  },

  // Where things go. "id" is used by game.js, so don't rename ids; names and icons are safe to edit.
  stations: [
    { id: 'stage',         name: 'Stage',         icon: '🎤' },
    { id: 'registration',  name: 'Registration',  icon: '🗂️' },
    { id: 'seating',       name: 'Seating',       icon: '💺' },
    { id: 'refreshments',  name: 'Refreshments',  icon: '🥤' },
  ],

  // Supplies. "station" must match a station id above.
  supplies: {
    chairs:   { emoji: '🪑', label: 'Chairs',          station: 'seating' },
    tables:   { emoji: '🍽️', label: 'Tables',          station: 'refreshments' },
    water:    { emoji: '💧', label: 'Water',           station: 'refreshments' },
    banner:   { emoji: '🎏', label: 'Banner',          station: 'stage' },
    cord:     { emoji: '🔌', label: 'Extension cord',  station: 'stage' },
    sound:    { emoji: '🔊', label: 'Sound system',    station: 'stage' },
    standee:  { emoji: '🪧', label: 'Standee',         station: 'registration' },
    desk:     { emoji: '🗃️', label: 'Reg. desk',       station: 'registration' },
    badges:   { emoji: '🪪', label: 'Volunteer badges', station: 'registration' },
    boxes:    { emoji: '📦', label: 'Donation boxes',  station: 'stage' },
    vankeys:  { emoji: '🔑', label: 'Van keys',        station: 'stage' },
  },

  // Level 5 only: everything goes here.
  storage: { name: 'Storage', icon: '📦' },

  /*
   * LEVELS. Each level is one object: text on top, tuning numbers in "rules".
   * To add a level, copy one whole { ... } block, paste it where you want it, and edit it.
   *
   * Text:
   *   title, intro (shown before the level), clearLine (shown after clearing it)
   *   timerLabel   = label above the countdown
   *   stationNames = optional renames for this level, e.g. { stage: { name: 'Loading Bay', icon: '🚐' } }
   *   seatCounter  = optional, text on the Seating station ({n} = chairs placed)
   *   messages     = optional messages that pop up during the level
   *
   * Rules:
   *   mode         = 'setup' (deliver to stations) or 'dismantle' (collect everything into Storage)
   *   duration     = seconds on the clock
   *   target       = correct deliveries for 100% (setup) / total items to count (dismantle)
   *   maxItems     = most supplies on screen at once
   *   spawnEvery   = seconds between new supplies
   *   supplies     = which supplies appear, and how often (bigger number = more often)
   *   problems     = which problems can happen (ids from the PROBLEMS list below)
   *   problemEvery = seconds between new problems (0 = none)
   *   warnTime     = seconds a problem glows before it triggers
   *   maxProblems  = most problems at once
   *   junkEvery    = seconds between NPCs dropping useless items (0 = none)
   *   chaosEvery   = seconds between chaos events (0 = none); chaos = which effects can happen
   *   npcMoods     = what the department NPCs do during this level
   */
  levels: [
    {
      title: 'Orientation Session',
      intro: 'Events said it\'s a small session. It is not a small session.',
      clearLine: 'Small session. Big setup. Done.',
      timerLabel: 'Doors in',
      rules: {
        mode: 'setup', duration: 45, target: 10, maxItems: 5, spawnEvery: 0.8,
        supplies: { chairs: 3, water: 2, banner: 1, standee: 1, desk: 1, sound: 1 },
        problems: ['mic', 'vendor', 'guests', 'cord'],
        problemEvery: 11, warnTime: 6, maxProblems: 1, junkEvery: 9,
      },
    },
    {
      title: 'Panel Discussion',
      intro: 'Marketing promised 300 attendees. Tarteeb has to find 300 chairs.',
      clearLine: '300 chairs. In rows. Facing the right way.',
      timerLabel: 'Doors in',
      seatCounter: '{n}/300',
      rules: {
        mode: 'setup', duration: 50, target: 14, maxItems: 6, spawnEvery: 0.7, chairsPer: 25,
        supplies: { chairs: 7, sound: 1, water: 1, standee: 1, desk: 1, cord: 1 },
        problems: ['mic', 'seats', 'cord', 'booking'],
        problemEvery: 9, warnTime: 5.5, maxProblems: 2, junkEvery: 7,
      },
    },
    {
      title: 'Charity Drive',
      intro: 'Projects had the idea. Tarteeb has the boxes, the vans and the volunteers.',
      clearLine: 'Van loaded. Boxes counted. The idea now physically exists.',
      timerLabel: 'Van leaves in',
      stationNames: { stage: { name: 'Loading Bay', icon: '🚐' } },
      rules: {
        mode: 'setup', duration: 50, target: 14, maxItems: 6, spawnEvery: 0.7,
        supplies: { boxes: 4, vankeys: 1, badges: 3, water: 2, tables: 1, chairs: 1 },
        problems: ['van', 'vendor', 'guests', 'seats'],
        problemEvery: 9, warnTime: 5.5, maxProblems: 2, junkEvery: 7,
        chaosEvery: 20, chaos: ['rush', 'junkStorm'],
      },
    },
    {
      title: 'Flagship Event',
      intro: 'Every department is panicking at once. Tarteeb is not.',
      clearLine: 'Flagship delivered. Everyone else is posting about it.',
      timerLabel: 'Doors in',
      rules: {
        mode: 'setup', duration: 60, target: 18, maxItems: 7, spawnEvery: 0.6,
        supplies: { chairs: 3, tables: 1, water: 2, banner: 1, cord: 1, sound: 1, standee: 1, desk: 1, badges: 1 },
        problems: ['mic', 'vendor', 'booking', 'cord', 'guests', 'seats'],
        problemEvery: 6, warnTime: 5, maxProblems: 3, junkEvery: 4, problemFirst: 3,
        chaosEvery: 9, chaosFirst: 6, chaos: ['timeCut', 'shuffle', 'junkStorm', 'blackout', 'rush', 'problems'],
        npcMoods: ['panic'],
      },
    },
    {
      title: 'Boss: Dismantling',
      intro: 'Everyone left for dinner. Return and count every item before security locks the venue.',
      clearLine: 'Every item counted. Venue empty. Security impressed.',
      timerLabel: 'Lockup in',
      messages: [
        { from: 'exec',      text: 'Is it done? (sent from dinner)' },
        { from: 'events',    text: 'Great event guys!! (has left the building)' },
        { from: 'hr',        text: 'Who\'s on dismantling duty? Asking for a spreadsheet.' },
        { from: 'marketing', text: 'Recap post is live! Tarteeb is still carrying chairs.' },
        { from: 'media',     text: 'Uploading 400 photos. ETA: eventually.' },
        { from: 'projects',  text: 'What if next time we... also helped?' },
      ],
      rules: {
        mode: 'dismantle', duration: 45, target: 18, maxItems: 8, startItems: 8, spawnEvery: 1.2,
        supplies: { chairs: 4, tables: 2, water: 1, banner: 1, cord: 2, sound: 1, standee: 1, desk: 1, badges: 1 },
        problemEvery: 0, junkEvery: 0, messageEvery: 7, drift: 26,
        npcMoods: ['dinner'],
      },
    },
  ],

  /*
   * DEPARTMENTS (the NPCs). "id" is used by game.js; "short" is shown on the little character.
   */
  departments: [
    { id: 'events',    name: 'Events',            short: 'EVT' },
    { id: 'hr',        name: 'HR',                short: 'HR'  },
    { id: 'marketing', name: 'Marketing',         short: 'MKT' },
    { id: 'projects',  name: 'Projects',          short: 'PRJ' },
    { id: 'media',     name: 'Media & Design',    short: 'M&D' },
    { id: 'exec',      name: 'Executive Council', short: 'EC'  },
  ],

  // What the idle NPCs show above their heads.
  npcMoods: {
    sleep:  'Zzz',
    phone:  '📱',
    typing: 'typing',
    panic:  '!!',
    dinner: '🍽️',
  },

  // Useless things NPCs drop. Touching one costs time.
  junk: [
    { emoji: '📝', label: 'Another Google Form' },
    { emoji: '📅', label: 'Meeting invite: Discuss the discussion' },
    { emoji: '✨', label: 'Motivational quote' },
    { emoji: '🗳️', label: 'Poll: which font?' },
    { emoji: '🔁', label: 'Reminder about the reminder' },
  ],
  junkCaught: '{label}  −{s}s',

  /*
   * PROBLEMS (the initiative mechanic). Each glows on its station before it triggers.
   *   warn    = shown while you can still prevent it
   *   live    = shown once it has happened
   *   station = which station it hits (must match a station id)
   *   fix     = the item that fixes it
   *   from    = department id that messages Tarteeb when it triggers
   *   message = what they send
   */
  problems: [
    { id: 'mic', warn: 'Mic about to die', live: 'Mic died', station: 'stage',
      fix: { emoji: '🔋', label: 'Spare batteries' },
      from: 'events', message: 'mic not working?? can someone from Tarteeb check 🙏' },
    { id: 'vendor', warn: 'Vendor stuck in traffic', live: 'No food. Vendor still stuck.', station: 'refreshments',
      fix: { emoji: '🛵', label: 'Backup vendor' },
      from: 'marketing', message: 'we kind of promised food in the caption. Tarteeb can you handle?' },
    { id: 'booking', warn: 'Venue double-booked', live: 'Another society is here', station: 'registration',
      fix: { emoji: '📄', label: 'Booking proof' },
      from: 'exec', message: 'Why are there two societies in the hall? Tarteeb please sort.' },
    { id: 'cord', warn: 'Extension cord missing', live: 'Projector has no power', station: 'stage',
      fix: { emoji: '🔌', label: 'Spare cord' },
      from: 'media', message: 'our laptop died mid-slideshow. Does Tarteeb have a cord?' },
    { id: 'guests', warn: 'Guest list changed', live: 'Wrong guest list at the desk', station: 'registration',
      fix: { emoji: '📋', label: 'Updated list' },
      from: 'hr', message: 'oh the list changed yesterday, did nobody tell Tarteeb?' },
    { id: 'van', warn: 'Van driver not answering', live: 'No van. Boxes going nowhere.', station: 'stage',
      fix: { emoji: '🚐', label: 'Backup van' },
      from: 'projects', message: 'the van is a logistics thing, right? Tarteeb?' },
    { id: 'seats', warn: 'Running short on seats', live: 'People standing at the back', station: 'seating',
      fix: { emoji: '🪑', label: 'Chair stack' },
      from: 'projects', message: 'what if... more chairs? Tarteeb thoughts?' },
  ],

  // Top bar: Tarteeb's activity climbs; everyone else shows one of these.
  tracker: {
    tarteebLabel: 'Tarteeb',
    statuses: ['Loading...', 'Seen ✓✓', 'Will get back to you', 'typing...', 'In a meeting', 'Reacted 👍'],
  },

  initiative: {
    banner: 'Tarteeb saw it coming',
    lateFix: 'Fixed. Again.',
    warnPrefix: '⚠',
    livePrefix: '🔥',
  },

  /*
   * CHAOS EVENTS (Levels 3 and 4). "effect" must be one of:
   *   timeCut (clock loses seconds), shuffle (stations move), junkStorm (everyone drops junk),
   *   blackout (lights dim), rush (extra supplies arrive at once), problems (two problems at once)
   */
  chaos: [
    { effect: 'timeCut',   from: 'marketing', text: 'Posted the start time 30 minutes early. Guests are arriving now.' },
    { effect: 'shuffle',   from: 'exec',      text: 'Requested a "small" layout change. Every station moved.' },
    { effect: 'junkStorm', from: 'hr',        text: 'Sent everyone a calendar invite. Six of them.' },
    { effect: 'blackout',  from: 'media',     text: 'Turned the lights down "for the vibe".' },
    { effect: 'rush',      from: 'events',    text: '"Oh, also, these just arrived."' },
    { effect: 'problems',  from: 'projects',  text: 'Added three new ideas to the event. Today.' },
  ],
  chaosTimeCut: 5,

  /*
   * ROAST CARDS. One is shown at random between levels.
   * "dept" must match a department name; "them" is their side; "tarteeb" is the punchline (can be empty).
   */
  roasts: [
    { dept: 'Events',            them: '"We\'ll finalize the venue tomorrow."',         tarteeb: 'Booked it last week.' },
    { dept: 'Events',            them: 'Planned the event.',                               tarteeb: 'Made it physically exist.' },
    { dept: 'HR',                them: 'Scheduled a meeting about the volunteer shortage.', tarteeb: 'Deployed 20 volunteers during the meeting.' },
    { dept: 'HR',                them: 'Made a spreadsheet to track who\'s active.',       tarteeb: 'Was the whole spreadsheet.' },
    { dept: 'Marketing',         them: '"BIG ANNOUNCEMENT COMING SOON 👀" (week 4)',      tarteeb: 'The venue has been ready since week 2.' },
    { dept: 'Marketing',         them: 'Promised free food in the caption.',              tarteeb: 'Found out from the caption.' },
    { dept: 'Projects',          them: 'Currently in Phase 7 of the ideation phase.',     tarteeb: '' },
    { dept: 'Projects',          them: '"What if we did something impactful?"',          tarteeb: 'Already loading the van.' },
    { dept: 'Media & Design',    them: 'Final_FINAL_v9_REAL_use_this.png',                 tarteeb: 'Printed v3 and hung it straight.' },
    { dept: 'Media & Design',    them: 'Took 400 photos of the event.',                    tarteeb: 'Is in none of them because Tarteeb was working.' },
    { dept: 'Executive Council', them: 'Approved the plan.',                               tarteeb: 'Executed it before the approval email arrived.' },
    { dept: 'Executive Council', them: '"Great work, team!"',                              tarteeb: 'The team was Tarteeb.' },
  ],

  failLines: [
    'Events: "It\'s fine, nobody noticed." Everybody noticed.',
    'Executive Council: "Let\'s discuss what went wrong." Tarteeb is already fixing it.',
    'Marketing has already posted "Doors open!" Nobody checked with logistics.',
  ],
};

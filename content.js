/*
 * TARTEEB RUSH: ALL GAME TEXT LIVES HERE.
 *
 * Theme: Tarteeb is the coolest department in RIZQ, and every other department is quietly jealous.
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
    tagline: 'The coolest department in RIZQ. Everyone else is just jealous.',
  },

  ui: {
    startButton: 'Show them how it\'s done',
    howTo: [
      'Every level plays differently. Read the one-line brief before it starts.',
      'Combos make the other departments jealous. Jealousy is points.',
      'Ignore their distractions. Touching one costs time.',
    ],
    highScore: 'Best: {score}',
    goButton: 'Go',
    nextButton: 'Next level',
    startLevel: 'Start Level {n}',
    resultsButton: 'See the showdown',
    retryButton: 'Retry level',
    endRunButton: 'End run',
    playAgainButton: 'Play again',
    pausedTitle: 'Paused',
    pausedBody: 'Even the coolest department takes a breather. Briefly.',
    mute: 'Mute sound',
    unmute: 'Turn sound on',
    resumeButton: 'Resume',
    wrongStation: 'Wrong station',
    readiness: 'Venue Readiness',
    levelClearedKicker: 'Level {n} cleared',
    levelFailedKicker: 'Time\'s up',
    levelFailedTitle: 'Venue only {pct}% ready',
    counted: 'Counted {n}/{total}',
    timeBonus: 'Time bonus',
    prevented: 'Problems prevented',
    jealousyCaused: 'Jealousy caused',
    roastKicker: 'Overheard in other departments',
    roastTarteeb: 'Tarteeb',
    upNext: 'Up next · Level {n}',
    chaosPrefix: 'CHAOS',
    levelScore: 'Level score',
    totalScore: 'Total score',
    hype: 'JEALOUSY +1',
    tapHint: 'TAP',
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
    chairs:   { emoji: '🪑', label: 'Chairs',           station: 'seating' },
    tables:   { emoji: '🍽️', label: 'Tables',           station: 'refreshments' },
    water:    { emoji: '💧', label: 'Water',            station: 'refreshments' },
    banner:   { emoji: '🎏', label: 'Banner',           station: 'stage' },
    cord:     { emoji: '🔌', label: 'Extension cord',   station: 'stage' },
    sound:    { emoji: '🔊', label: 'Sound system',     station: 'stage' },
    standee:  { emoji: '🪧', label: 'Standee',          station: 'registration' },
    desk:     { emoji: '🗃️', label: 'Reg. desk',        station: 'registration' },
    badges:   { emoji: '🪪', label: 'Volunteer badges', station: 'registration' },
    boxes:    { emoji: '📦', label: 'Donation boxes',   station: 'stage' },
    vankeys:  { emoji: '🔑', label: 'Van keys',         station: 'stage' },
  },

  // Level 5 only: everything goes here.
  storage: { name: 'Storage', icon: '📦' },

  /*
   * LEVELS. Each level is one object: text on top, tuning numbers in "rules".
   * To add a level, copy one whole { ... } block, paste it where you want it, and edit it.
   *
   * Text:
   *   title, intro (the one-line brief), howTo (one line on how this level plays), clearLine
   *   timerLabel   = label above the countdown
   *   stationNames = optional renames for this level, e.g. { stage: { name: 'Loading Bay', icon: '🚐' } }
   *   seatCounter  = optional, text on the Seating station ({n} = chairs placed)
   *   messages     = optional messages that pop up during the level
   *
   * Rules:
   *   mode         = 'setup'     drag supplies to stations
   *                  'tap'       tap supplies; they fly to their station by themselves (fast and frantic)
   *                  'conveyor'  supplies slide past on a belt; grab them before they leave
   *                  'dismantle' collect drifting items into Storage
   *   duration     = seconds on the clock
   *   target       = deliveries for 100% (or total items to count when dismantling)
   *   maxItems     = most supplies on screen at once
   *   spawnEvery   = seconds between new supplies
   *   life         = 'tap' mode only: seconds before an untapped supply disappears
   *   beltSpeed    = 'conveyor' mode only: pixels per second
   *   supplies     = which supplies appear, and how often (bigger number = more often)
   *   problems     = which problems can happen (ids from the PROBLEMS list below)
   *   problemEvery = seconds between new problems (0 = none)
   *   warnTime     = seconds a problem glows before it triggers
   *   maxProblems  = most problems at once
   *   junkEvery    = seconds between NPCs dropping distractions (0 = none)
   *   chaosEvery   = seconds between chaos events (0 = none); chaos = which effects can happen
   *   npcMoods     = what the department NPCs do during this level
   */
  levels: [
    {
      title: 'Orientation Session',
      intro: 'Events said it\'s a small session. It is not a small session.',
      howTo: 'Drag each supply to its station, or tap it and then tap the station.',
      clearLine: 'Small session. Big setup. The freshers already want to join Tarteeb.',
      timerLabel: 'Doors in',
      rules: {
        mode: 'setup', duration: 40, target: 8, maxItems: 5, spawnEvery: 0.8,
        supplies: { chairs: 2, water: 2, banner: 1, standee: 1, desk: 1, sound: 1 },
        problems: ['mic', 'vendor', 'guests', 'cord'],
        problemEvery: 10, warnTime: 6, maxProblems: 1, problemFirst: 6, junkEvery: 10,
      },
    },
    {
      title: 'Panel Discussion',
      intro: 'Marketing promised 300 attendees. Tarteeb has to find 300 chairs.',
      howTo: 'Chair Rush: just TAP chairs. They fly to Seating by themselves. Don\'t tap the distractions.',
      clearLine: '300 chairs in 25 seconds. Marketing is "not impressed" (very impressed).',
      timerLabel: 'Panel in',
      seatCounter: '{n}/300',
      rules: {
        mode: 'tap', duration: 25, target: 12, maxItems: 7, spawnEvery: 0.45, life: 2.6, chairsPer: 25,
        supplies: { chairs: 1 },
        problemEvery: 0, junkEvery: 2.2, junkSpeed: 95,
        npcMoods: ['stare', 'jealous'],
      },
    },
    {
      title: 'Charity Drive',
      intro: 'Projects had the idea. Tarteeb has the boxes, the vans and the volunteers.',
      howTo: 'Conveyor: supplies slide past on a belt. Grab them before they leave the screen.',
      clearLine: 'Van loaded. Projects is drafting an idea called "be more like Tarteeb".',
      timerLabel: 'Van leaves in',
      stationNames: { stage: { name: 'Loading Bay', icon: '🚐' } },
      rules: {
        mode: 'conveyor', duration: 45, target: 12, maxItems: 7, spawnEvery: 1.0, beltSpeed: 70,
        supplies: { boxes: 4, vankeys: 1, badges: 3, water: 2, tables: 1, chairs: 1 },
        problems: ['van', 'vendor', 'guests', 'seats'],
        problemEvery: 11, warnTime: 7, maxProblems: 1, problemFirst: 8, junkEvery: 8,
      },
    },
    {
      title: 'Flagship Event',
      intro: 'Every department is panicking at once. Tarteeb is not.',
      howTo: 'Everything at once: drag supplies, fix the glowing problems early, survive the chaos.',
      clearLine: 'Flagship delivered. Four departments just asked to "collab" with Tarteeb.',
      timerLabel: 'Doors in',
      rules: {
        mode: 'setup', duration: 55, target: 16, maxItems: 7, spawnEvery: 0.6,
        supplies: { chairs: 3, tables: 1, water: 2, banner: 1, cord: 1, sound: 1, standee: 1, desk: 1, badges: 1 },
        problems: ['mic', 'vendor', 'booking', 'cord', 'guests', 'seats'],
        problemEvery: 7, warnTime: 5.5, maxProblems: 2, junkEvery: 5, problemFirst: 4,
        chaosEvery: 10, chaosFirst: 7, chaos: ['timeCut', 'shuffle', 'junkStorm', 'blackout', 'rush', 'problems'],
        npcMoods: ['panic', 'stare'],
      },
    },
    {
      title: 'Boss: Dismantling',
      intro: 'Everyone left for dinner. Return and count every item before security locks the venue.',
      howTo: 'Items are wandering around. Drag every single one into Storage.',
      clearLine: 'Every item counted. Even security asked how to join Tarteeb.',
      timerLabel: 'Lockup in',
      messages: [
        { from: 'exec',      text: 'Is it done? Also, are Tarteeb hoodies available in medium?' },
        { from: 'events',    text: 'Great event guys!! (has left the building)' },
        { from: 'hr',        text: 'Who\'s on dismantling duty? Asking for a spreadsheet.' },
        { from: 'marketing', text: 'Posted the recap. Cut Tarteeb out of the photos. Likes dropped 80%.' },
        { from: 'media',     text: 'Can Tarteeb pose with a chair for the after-movie? Asking for "reasons".' },
        { from: 'projects',  text: 'What if next time we... also looked that cool?' },
      ],
      rules: {
        mode: 'dismantle', duration: 40, target: 14, maxItems: 8, startItems: 8, spawnEvery: 1.2,
        supplies: { chairs: 4, tables: 2, water: 1, banner: 1, cord: 2, sound: 1, standee: 1, desk: 1, badges: 1 },
        problemEvery: 0, junkEvery: 0, messageEvery: 7, drift: 30,
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

  // What the NPCs show above their heads.
  npcMoods: {
    stare:   '👀',
    jealous: '😒',
    phone:   '📱',
    typing:  'typing',
    panic:   '!!',
    dinner:  '🍽️',
  },
  defaultMoods: ['stare', 'jealous', 'phone', 'typing'],

  /*
   * JEALOUSY. Every 5-delivery combo makes all NPCs stare and one of them says something.
   */
  jealousLines: [
    { from: 'events',    text: 'how is Tarteeb this fast 😑' },
    { from: 'hr',        text: 'can we get volunteers to like US that much' },
    { from: 'marketing', text: 'should we post this? no. yes. no.' },
    { from: 'projects',  text: 'new idea: be Tarteeb' },
    { from: 'media',     text: 'their setup looks better than our poster' },
    { from: 'exec',      text: 'noted. (secretly impressed)' },
    { from: 'events',    text: 'we could\'ve done that. we didn\'t, but we could\'ve' },
    { from: 'marketing', text: 'who gave Tarteeb a fan club??' },
  ],

  // Distractions jealous departments drop. Touching one costs time.
  junk: [
    { emoji: '🤝', label: '"Collab?" (take credit)' },
    { emoji: '📅', label: 'Meeting: why is Tarteeb so popular' },
    { emoji: '📝', label: 'Google Form: rate Tarteeb (low)' },
    { emoji: '📸', label: '"Pose for our post real quick"' },
    { emoji: '❓', label: '"Quick question" (not quick)' },
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
      from: 'events', message: 'mic not working?? Tarteeb pls (we\'ll say we fixed it)' },
    { id: 'vendor', warn: 'Vendor stuck in traffic', live: 'No food. Vendor still stuck.', station: 'refreshments',
      fix: { emoji: '🛵', label: 'Backup vendor' },
      from: 'marketing', message: 'we kind of promised food in the caption. Tarteeb can you handle?' },
    { id: 'booking', warn: 'Venue double-booked', live: 'Another society is here', station: 'registration',
      fix: { emoji: '📄', label: 'Booking proof' },
      from: 'exec', message: 'Why are there two societies in the hall? Tarteeb please sort.' },
    { id: 'cord', warn: 'Extension cord missing', live: 'Projector has no power', station: 'stage',
      fix: { emoji: '🔌', label: 'Spare cord' },
      from: 'media', message: 'our laptop died mid-slideshow. Does Tarteeb have a cord? (they always do)' },
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

  // Top bar: Tarteeb's aura climbs; everyone else shows one of these.
  tracker: {
    tarteebLabel: 'Tarteeb aura',
    statuses: ['Watching Tarteeb\'s story', 'Pretending not to care', 'Seen ✓✓', 'typing "how do they..."', 'Screenshotted it', 'Asking for the hoodie link'],
  },

  initiative: {
    banner: 'Tarteeb saw it coming',
    lateFix: 'Fixed. Again.',
    warnPrefix: '⚠',
    livePrefix: '🔥',
  },

  /*
   * CHAOS EVENTS (Flagship). "effect" must be one of:
   *   timeCut (clock loses seconds), shuffle (stations move), junkStorm (everyone drops distractions),
   *   blackout (lights dim), rush (extra supplies arrive at once), problems (two problems at once)
   */
  chaos: [
    { effect: 'timeCut',   from: 'marketing', text: 'Moved the start time up so their post "goes live first".' },
    { effect: 'shuffle',   from: 'exec',      text: 'Rearranged the layout to "add their touch". Every station moved.' },
    { effect: 'junkStorm', from: 'hr',        text: 'Jealousy spike: everyone wants a "quick word" with Tarteeb.' },
    { effect: 'blackout',  from: 'media',     text: 'Dimmed the lights so Tarteeb looks less cool. Didn\'t work.' },
    { effect: 'rush',      from: 'events',    text: '"Oh, also, these just arrived."' },
    { effect: 'problems',  from: 'projects',  text: 'Added three new ideas to the event. Today.' },
  ],
  chaosTimeCut: 5,

  /*
   * ROAST CARDS. One is shown at random between levels.
   * "dept" must match a department name; "them" is their side; "tarteeb" is the punchline (can be empty).
   */
  roasts: [
    { dept: 'Events',            them: '"Why do the volunteers keep asking to join Tarteeb instead?"', tarteeb: 'Because we let them carry the speaker.' },
    { dept: 'Events',            them: '"We\'ll confirm the venue tomorrow."',          tarteeb: 'Booked it last week.' },
    { dept: 'HR',                them: 'Filed a complaint: "Tarteeb is having too much fun."', tarteeb: 'Complaint noted. Fun continued.' },
    { dept: 'HR',                them: 'Made a spreadsheet to track who\'s active.',      tarteeb: 'Was the whole spreadsheet.' },
    { dept: 'Marketing',         them: 'Posted a photo of Tarteeb\'s setup as their own content.', tarteeb: 'It became their most-liked post of the year.' },
    { dept: 'Marketing',         them: '"BIG ANNOUNCEMENT COMING SOON 👀" (week 4)',     tarteeb: 'The venue has been ready since week 2.' },
    { dept: 'Projects',          them: 'Started a plan called "How to be more like Tarteeb." Still in the thinking stage.', tarteeb: 'Step 1: show up. We\'ll wait.' },
    { dept: 'Projects',          them: '"What if we did something impactful?"',         tarteeb: 'Already loading the van.' },
    { dept: 'Media & Design',    them: 'Asked Tarteeb to pose for the poster.',           tarteeb: 'Too busy working. The blurry background photo still looked cooler.' },
    { dept: 'Media & Design',    them: 'Took 400 photos of the event.',                   tarteeb: 'Is in none of them because Tarteeb was working.' },
    { dept: 'Executive Council', them: 'Wore a Tarteeb hoodie "by accident".',           tarteeb: 'Sure.' },
    { dept: 'Executive Council', them: '"Great work, team!"',                             tarteeb: 'The team was Tarteeb.' },
  ],

  /*
   * END SCREEN: "Department Showdown".
   */
  showdown: {
    kicker: 'Run complete',
    title: 'Coolest Department Showdown',
    scoreLabel: 'Final score',
    newBest: 'New best!',
    best: 'Best: {score}',
    rankLabel: 'Your rank',
    chartTitle: 'Official* Coolest Department Rankings',
    footnote: '*Data collected and verified by Tarteeb. Other departments want it counted again.',
    offChart: 'off the chart ↗',
    categories: [
      { key: 'cool',       label: 'Coolness' },
      { key: 'aura',       label: 'Aura' },
      { key: 'initiative', label: 'Initiative' },
      { key: 'jealousy',   label: 'Jealousy caused' },
    ],
    // What the other departments' bars say instead of a number.
    otherStatuses: ['Pretending not to care', 'Wants it counted again', 'Seen ✓✓', 'Still discussing', 'Watching from a distance', 'Asking for the hoodie link'],
    finalLine: 'Tarteeb: We don\'t wait for the plan. We are the plan.',
    finalSub: 'Everyone else: 👀',
    playAgain: 'Play Again',
    challenge: 'Challenge another department',
    shareText: 'I scored {score} in Tarteeb Rush. Your department couldn\'t. (It\'s okay to be jealous.)',
    copied: 'Copied! Now send it to them.',
    copyFailed: 'Couldn\'t copy automatically. Select the text below and copy it.',
  },

  // Rank titles by final score (lowest first). "min" = score needed.
  ranks: [
    { min: 0,     title: 'Volunteer' },
    { min: 2500,  title: 'Chair Commander' },
    { min: 5500,  title: 'Extension Cord Whisperer' },
    { min: 8500,  title: 'Crisis Prevention Specialist' },
    { min: 12000, title: 'Director of Tarteeb' },
  ],

  failLines: [
    'Events: "It\'s fine, nobody noticed." Everybody noticed. They\'re still jealous.',
    'Marketing has already posted "Doors open!" Nobody checked with logistics.',
    'The other departments are celebrating a little too loudly. Run it back.',
  ],
};

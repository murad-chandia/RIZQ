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
    timeBonus: 'Time bonus',
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
  },

  /*
   * LEVELS. Each level is one object: text on top, tuning numbers in "rules".
   * rules.duration  = seconds on the clock
   * rules.target    = correct deliveries needed for 100% readiness
   * rules.maxItems  = most supplies on screen at once
   * rules.spawnEvery= seconds between new supplies
   * rules.supplies  = which supplies appear, and how often (bigger number = more often)
   */
  levels: [
    {
      title: 'Orientation Session',
      intro: 'Events said it\'s a small session. It is not a small session.',
      clearLine: 'Small session. Big setup. Done.',
      rules: {
        duration: 45, target: 10, maxItems: 5, spawnEvery: 0.8,
        supplies: { chairs: 3, water: 2, banner: 1, standee: 1, desk: 1, sound: 1 },
      },
    },
  ],

  failLines: [
    'Events: "It\'s fine, nobody noticed." Everybody noticed.',
    'Executive Council: "Let\'s discuss what went wrong." Tarteeb is already fixing it.',
    'Marketing has already posted "Doors open!" Nobody checked with logistics.',
  ],
};

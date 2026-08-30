const AFFIRMATIONS = [
  "You showed up for yourself today — that's everything.",
  "Look at you, taking such good care of your own heart.",
  "That was a beautiful thing to do for yourself.",
  "Proud of you. Truly, deeply proud.",
  "You're doing so much better than you think.",
  "What a gift, to keep choosing yourself like this.",
  "Every note like this is you loving yourself a little more.",
  "You did that. And it mattered.",
  "So glad you paused to check in with yourself.",
  "This is what taking care of you looks like — and you're doing it.",
  "You deserve every bit of credit for this.",
  "Someone is so proud of you right now.",
  "Small and steady — that's exactly how good things are built.",
  "You keep showing up, and it doesn't go unnoticed.",
  "That took a little courage, and you did it anyway.",
];

export function randomAffirmation() {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

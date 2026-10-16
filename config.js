/*
  Game settings. Edit this file to change the sums, the secret word, the mascot or what it says.

  Each round is one sum. The answer must be between 1 and 26,
  because it gets turned into a letter (A = 1, B = 2 ... Z = 26).
  The letters of all the answers, in order, spell the secret word.

  Default word: 26 -> Z, 9 -> I, 16 -> P, 16 -> P, 25 -> Y  =  ZIPPY
*/
window.GAME_CONFIG = {
  mascotName: "Zippy",

  // The tiger's expressions. To use sharper artwork, export the same seven poses
  // from Figma (2x or 3x PNG, transparent background) and overwrite the files in assets/tiger/.
  // Keep the same file names, or point these paths somewhere else.
  poses: {
    calm:    "./calm.png",     // waiting to be found
    happy:   "./happy.png",    // right answer
    sad:     "./sad.png",      // wrong answer
    cry:     "./cry.png",      // three wrong answers in a row
    shocked: "./shocked.png",  // the moment it wakes up
    party:   "./party.png",    // celebration, with confetti
    cheer:   "./cheer.png"     // celebration
  },

  // How far down the image the mascot's head starts (in %). Keeps the last step of the reveal snug.
  revealTop: 6,

  rounds: [
    { sum: "13 × 2", answer: 26, hint: "Try 10 × 2 first, then add 3 × 2." },
    { sum: "3 × 3",  answer: 9,  hint: "Think of 3 + 3 + 3." },
    { sum: "20 − 4", answer: 16, hint: "Count back 4 from 20." },
    { sum: "4 × 4",  answer: 16, hint: "Four groups of four. Try 4 + 4 + 4 + 4." },
    { sum: "5 × 5",  answer: 25, hint: "Count in fives: 5, 10, 15, 20 ..." }
  ],

  // {name} becomes the child's name (or "friend" if left blank). {mascot} becomes mascotName.
  messages: {
    intro: "Psst! I'm stuck in the code. Can you help me out?",
    // What the mascot says after each correct clue, as more of it appears (one line per clue except the last).
    stages: [
      "Ooh, something is tickling my tummy!",
      "I can feel my tummy now. Keep going!",
      "Are those my paws? Another clue, please!",
      "I can see you! Just one more to go!"
    ],
    ready: "That's every clue! Tap the button to set me free.",
    wrong: ["Not quite. Have another go!", "So close. Try again!", "Take your time, you can do it!"],
    wrongBubble: ["Oops! I believe in you!", "Hmm, not that one. Try again!", "Don't give up, {name}!"],
    waking: "Wait... is that really me? I'm free!",
    winTitle: "You did it, {name}!",
    // What the mascot says (and speaks aloud) when it comes to life.
    thanks: "Thank you for finding me, {name}! You solved every sum and set me free. Thanks for playing with me!"
  }
};

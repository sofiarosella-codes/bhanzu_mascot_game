/*
  Game settings. Edit this file to change the sums, the secret word or the mascot.

  Each round is one sum. The answer must be between 1 and 26,
  because it gets turned into a letter (A = 1, B = 2 ... Z = 26).
  The letters of all the answers, in order, spell the mascot's secret word.

  Default word: 26 -> Z, 9 -> I, 16 -> P, 16 -> P, 25 -> Y  =  ZIPPY
*/
window.GAME_CONFIG = {
  mascotName: "Zippy",

  // To use your own artwork, put a PNG/SVG in this folder and set e.g. "zippy.png".
  // Leave it as "" to use the built-in drawn mascot.
  mascotImage: "",

  rounds: [
    { sum: "13 × 2", answer: 26, hint: "Try 10 × 2 first, then add 3 × 2." },
    { sum: "3 × 3",  answer: 9,  hint: "Think of 3 + 3 + 3." },
    { sum: "20 − 4", answer: 16, hint: "Count back 4 from 20." },
    { sum: "4 × 4",  answer: 16, hint: "Four groups of four. Try 4 + 4 + 4 + 4." },
    { sum: "5 × 5",  answer: 25, hint: "Count in fives: 5, 10, 15, 20 ..." }
  ],

  // {name} is replaced by the child's name (or "friend" if left blank).
  messages: {
    correct: ["Bug squashed!", "Nice one!", "You found it!", "Brilliant!", "Yes! One less bug!"],
    wrong: ["Not quite. Have another go!", "So close. Try again!", "Take your time, you can do it!"],
    winTitle: "You set {mascot} free!",
    // What the mascot says when it comes to life.
    thanks: "Thank you for finding me, {name}! You solved every sum and squashed every bug. You set me free! Thanks for playing with me!"
  }
};

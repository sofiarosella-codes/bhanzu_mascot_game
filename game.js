(function () {
  "use strict";

  var CFG = window.GAME_CONFIG;
  var ROUNDS = CFG.rounds;
  var TOTAL = ROUNDS.length;
  var PART_COUNT = 5; // matches data-part 0..4 in index.html

  function $(id) { return document.getElementById(id); }
  var el = {
    stage: $("stage"), bubble: $("bubble"), wrap: $("mascotWrap"), svg: $("mascot"), img: $("mascotImg"),
    glitch: $("glitch"), bugs: $("bugs"), word: $("word"),
    start: $("screenStart"), play: $("screenPlay"), win: $("screenWin"),
    nameInput: $("nameInput"), startBtn: $("startBtn"),
    progress: $("progress"), stepLabel: $("stepLabel"),
    askBox: $("askBox"), sumText: $("sumText"), form: $("answerForm"), answer: $("answer"),
    feedback: $("feedback"), hint: $("hint"),
    decodeBox: $("decodeBox"), decodeLine: $("decodeLine"), alpha: $("alpha"),
    winTitle: $("winTitle"), winText: $("winText"), speakBtn: $("speakBtn"), againBtn: $("againBtn"),
    mute: $("mute"), confetti: $("confetti")
  };

  var state = { idx: 0, name: "", wrong: 0, muted: false, busy: false, thanks: "" };
  var bugEls = [];

  /* ---------- helpers ---------- */
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function letterFor(n) { return String.fromCharCode(64 + n); }
  function fill(text) {
    return text.replace(/\{name\}/g, state.name || "friend").replace(/\{mascot\}/g, CFG.mascotName);
  }

  // Sanity check the config so a typo is obvious in the console.
  ROUNDS.forEach(function (r, i) {
    if (!(r.answer >= 1 && r.answer <= 26)) {
      console.warn("Round " + (i + 1) + ": answer must be between 1 and 26 to become a letter.");
    }
  });

  /* ---------- sound ---------- */
  var audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }
  function tone(freq, start, dur, type, vol) {
    var c = ctx();
    if (!c || state.muted) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    var t = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function sfxGood() { tone(523, 0, .14, "triangle"); tone(659, .1, .14, "triangle"); tone(784, .2, .22, "triangle"); }
  function sfxBad() { tone(220, 0, .18, "sawtooth", .08); tone(180, .12, .22, "sawtooth", .08); }
  function sfxWin() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * .13, .2, "triangle", .16); });
  }

  el.mute.addEventListener("click", function () {
    state.muted = !state.muted;
    el.mute.textContent = state.muted ? "🔇" : "🔊";
    el.mute.setAttribute("aria-label", state.muted ? "Turn sound on" : "Turn sound off");
    if (state.muted && window.speechSynthesis) window.speechSynthesis.cancel();
  });

  /* ---------- speech ---------- */
  function speak(text) {
    if (state.muted || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.4; u.volume = 1;
      var voices = window.speechSynthesis.getVoices() || [];
      var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
      if (en.length) u.voice = en[0];
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is a bonus, ignore failures */ }
  }

  /* ---------- mascot ---------- */
  var useImage = !!CFG.mascotImage;
  if (useImage) {
    el.img.src = CFG.mascotImage;
    el.img.hidden = false;
    el.svg.style.display = "none";
    el.img.addEventListener("error", function () {
      // Fall back to the drawn mascot if the image path is wrong.
      useImage = false;
      el.img.hidden = true;
      el.svg.style.display = "";
      console.warn("Could not load " + CFG.mascotImage + ", using the built-in mascot.");
    });
  }

  function partsFor(round) {
    // Spread the 5 mascot parts across however many rounds there are.
    var per = PART_COUNT / TOTAL;
    var from = Math.round(round * per);
    var to = Math.round((round + 1) * per);
    var list = [];
    for (var i = from; i < to; i++) list.push(i);
    return list;
  }

  function resetMascot() {
    el.stage.classList.remove("alive");
    var parts = el.svg.querySelectorAll(".part");
    for (var i = 0; i < parts.length; i++) {
      parts[i].classList.add("broken");
      parts[i].classList.remove("fixed-pop");
    }
    el.img.style.setProperty("--p", 0);
    el.glitch.style.setProperty("--glitch", 1);
    el.bubble.hidden = true;
  }

  function revealProgress(round) {
    // round = number of rounds solved so far
    partsFor(round - 1).forEach(function (n) {
      var p = el.svg.querySelector('.part[data-part="' + n + '"]');
      if (p) {
        p.classList.remove("broken");
        p.classList.add("fixed-pop");
      }
    });
    el.img.style.setProperty("--p", (round / TOTAL).toFixed(2));
    el.glitch.style.setProperty("--glitch", (1 - round / TOTAL).toFixed(2));
  }

  function spawnBugs() {
    el.bugs.innerHTML = "";
    bugEls = [];
    var icons = ["🐛", "🪲", "🐞", "🪳", "🐜"];
    for (var i = 0; i < TOTAL; i++) {
      var b = document.createElement("span");
      b.className = "bug";
      b.textContent = icons[i % icons.length];
      // Scatter bugs over the mascot but keep them away from the very edge.
      b.style.left = (18 + Math.random() * 64) + "%";
      b.style.top = (16 + Math.random() * 68) + "%";
      b.style.animationDelay = (-Math.random() * 2) + "s";
      el.bugs.appendChild(b);
      bugEls.push(b);
    }
  }

  function squashBug() {
    var b = bugEls.pop();
    if (!b) return;
    b.classList.add("squash");
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 520);
  }

  /* ---------- word tiles ---------- */
  function buildWord() {
    el.word.innerHTML = "";
    for (var i = 0; i < TOTAL; i++) {
      var t = document.createElement("div");
      t.className = "tile";
      t.textContent = "?";
      el.word.appendChild(t);
    }
  }
  function revealTile(i) {
    var t = el.word.children[i];
    t.textContent = letterFor(ROUNDS[i].answer);
    t.classList.add("on");
  }

  /* ---------- progress dots ---------- */
  function renderProgress() {
    el.progress.innerHTML = "";
    for (var i = 0; i < TOTAL; i++) {
      var d = document.createElement("span");
      d.className = "dot" + (i < state.idx ? " done" : (i === state.idx ? " now" : ""));
      el.progress.appendChild(d);
    }
  }

  /* ---------- game flow ---------- */
  function showOnly(which) {
    el.start.hidden = which !== "start";
    el.play.hidden = which !== "play";
    el.win.hidden = which !== "win";
  }

  function startGame() {
    state.name = el.nameInput.value.trim();
    state.idx = 0;
    state.busy = false;
    resetMascot();
    spawnBugs();
    buildWord();
    showOnly("play");
    showRound();
    // Browsers only allow audio after a tap, so warm it up here.
    var c = ctx(); if (c && c.state === "suspended") c.resume();
  }

  function showRound() {
    var r = ROUNDS[state.idx];
    state.wrong = 0;
    state.busy = false;
    el.stepLabel.textContent = "Bug " + (state.idx + 1) + " of " + TOTAL;
    el.sumText.textContent = r.sum + " = ?";
    el.answer.value = "";
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    el.hint.hidden = true;
    el.decodeBox.hidden = true;
    el.askBox.hidden = false;
    renderProgress();
    // Avoid popping the keyboard open on touch screens before the child is ready.
    if (!("ontouchstart" in window)) el.answer.focus();
  }

  function buildAlpha(hit) {
    el.alpha.innerHTML = "";
    for (var i = 1; i <= 26; i++) {
      var s = document.createElement("span");
      s.textContent = letterFor(i);
      s.title = i;
      el.alpha.appendChild(s);
    }
    // Walk along the alphabet until we land on the right letter.
    var n = 0;
    var step = setInterval(function () {
      n++;
      var spans = el.alpha.children;
      if (n > 1) spans[n - 2].classList.remove("hit");
      spans[n - 1].classList.add("hit");
      if (n >= hit) {
        clearInterval(step);
        for (var k = 0; k < hit - 1; k++) spans[k].classList.add("lit");
      }
    }, Math.max(35, Math.min(90, 1400 / hit)));
  }

  function onCorrect() {
    var r = ROUNDS[state.idx];
    var letter = letterFor(r.answer);
    state.busy = true;
    sfxGood();

    el.askBox.hidden = true;
    el.decodeBox.hidden = false;
    el.decodeLine.innerHTML = r.sum + " = <b>" + r.answer + "</b> &rarr; letter number " + r.answer +
      " is <b>" + letter + "</b>";
    buildAlpha(r.answer);

    var solved = state.idx + 1;
    var delay = Math.max(35, Math.min(90, 1400 / r.answer)) * r.answer + 250;
    setTimeout(function () {
      squashBug();
      revealTile(state.idx);
      revealProgress(solved);
      sfxGood();
    }, delay);

    var isLast = solved === TOTAL;
    // Replace any older continue button.
    var old = el.decodeBox.querySelector(".next");
    if (old) old.remove();
    var next = document.createElement("button");
    next.className = "btn primary next";
    next.type = "button";
    next.textContent = isLast ? "Wake up " + CFG.mascotName + "!" : "Next bug";
    next.addEventListener("click", function () {
      if (isLast) { win(); } else { state.idx++; showRound(); }
    });
    el.decodeBox.appendChild(next);
    setTimeout(function () { next.focus(); }, delay);
  }

  function onWrong() {
    state.wrong++;
    sfxBad();
    el.feedback.textContent = pick(CFG.messages.wrong);
    el.feedback.className = "feedback bad";
    el.sumText.classList.remove("shake");
    void el.sumText.offsetWidth; // restart the animation
    el.sumText.classList.add("shake");
    if (state.wrong >= 2 && ROUNDS[state.idx].hint) {
      el.hint.textContent = "Hint: " + ROUNDS[state.idx].hint;
      el.hint.hidden = false;
    }
    el.answer.select();
  }

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    var raw = el.answer.value.trim();
    if (raw === "") {
      el.feedback.textContent = "Type your answer first.";
      el.feedback.className = "feedback bad";
      return;
    }
    if (parseInt(raw, 10) === ROUNDS[state.idx].answer) onCorrect(); else onWrong();
  });

  // Digits only
  el.answer.addEventListener("input", function () {
    el.answer.value = el.answer.value.replace(/[^0-9]/g, "");
  });

  /* ---------- win ---------- */
  function win() {
    showOnly("win");
    var word = ROUNDS.map(function (r) { return letterFor(r.answer); }).join("");
    el.winTitle.textContent = fill(CFG.messages.winTitle);
    el.winText.textContent = "The secret word was " + word + ". Look who is awake!";
    state.thanks = fill(CFG.messages.thanks);

    el.stage.classList.add("alive");
    el.glitch.style.setProperty("--glitch", 0);
    el.bubble.textContent = state.thanks;
    el.bubble.hidden = false;

    sfxWin();
    burstConfetti();
    setTimeout(function () { speak(state.thanks); }, 700);
  }

  el.speakBtn.addEventListener("click", function () { speak(state.thanks); });
  el.againBtn.addEventListener("click", function () {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    resetMascot();
    showOnly("start");
    clearConfetti();
    el.bugs.innerHTML = "";
    buildWord();
  });
  el.startBtn.addEventListener("click", startGame);
  el.nameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") startGame(); });

  /* ---------- confetti ---------- */
  var cctx = el.confetti.getContext("2d");
  var pieces = [];
  var raf = 0;
  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    el.confetti.width = window.innerWidth * dpr;
    el.confetti.height = window.innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();

  function burstConfetti() {
    var colors = ["#d4400a", "#ffd23f", "#4fd1c5", "#8f80ee", "#ff8fa3", "#1f9d6b"];
    var w = window.innerWidth;
    for (var i = 0; i < 160; i++) {
      pieces.push({
        x: w / 2 + (Math.random() - .5) * w * .5,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - .5) * 5,
        vy: 2 + Math.random() * 4,
        r: 5 + Math.random() * 6,
        rot: Math.random() * 6,
        vr: (Math.random() - .5) * .3,
        c: colors[i % colors.length]
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += p.vr;
      cctx.save();
      cctx.translate(p.x, p.y); cctx.rotate(p.rot);
      cctx.fillStyle = p.c;
      cctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * .6);
      cctx.restore();
    });
    pieces = pieces.filter(function (p) { return p.y < window.innerHeight + 30; });
    if (pieces.length) { raf = requestAnimationFrame(tick); }
    else { raf = 0; cctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  function clearConfetti() { pieces = []; }

  /* ---------- initial state ---------- */
  resetMascot();
  buildWord();
  showOnly("start");
  // Some browsers load voices late; touching the list early helps.
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
})();

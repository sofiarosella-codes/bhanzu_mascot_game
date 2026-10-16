(function () {
  "use strict";

  var CFG = window.GAME_CONFIG;
  var ROUNDS = CFG.rounds;
  var TOTAL = ROUNDS.length;
  var MSG = CFG.messages;

  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var REDUCED = mq("(prefers-reduced-motion: reduce)");
  var REVEAL_MS = REDUCED ? 0 : 1900;
  var HEAD_TOP = typeof CFG.revealTop === "number" ? CFG.revealTop : 6;

  function $(id) { return document.getElementById(id); }
  var el = {
    stage: $("stage"), tiger: $("tiger"), ghost: $("ghost"), reveal: $("reveal"), poses: $("poses"),
    scan: $("scan"), sparkles: $("sparkles"), bubble: $("bubble"), word: $("word"), wordLabel: $("wordLabel"),
    sr: $("sr"),
    start: $("screenStart"), play: $("screenPlay"), win: $("screenWin"),
    nameInput: $("nameInput"), startBtn: $("startBtn"),
    stepper: $("stepper"), askBox: $("askBox"), clueLabel: $("clueLabel"), sumText: $("sumText"),
    form: $("answerForm"), answer: $("answer"), feedback: $("feedback"), keypad: $("keypad"),
    hintBtn: $("hintBtn"), hint: $("hint"),
    decodeBox: $("decodeBox"), decodeLine: $("decodeLine"), alpha: $("alpha"), decodeNote: $("decodeNote"),
    bigLetter: $("bigLetter"), nextBtn: $("nextBtn"),
    winTitle: $("winTitle"), stars: $("stars"), winText: $("winText"), hearBtn: $("hearBtn"), againBtn: $("againBtn"),
    mute: $("mute"), confetti: $("confetti")
  };

  var state = { idx: 0, solved: 0, name: "", wrong: 0, streakWrong: 0, mistakes: 0, muted: false, busy: false, thanks: "" };

  /* ---------- small helpers ---------- */
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function letterFor(n) { return String.fromCharCode(64 + n); }
  function fill(text) {
    return String(text).replace(/\{name\}/g, state.name || "friend").replace(/\{mascot\}/g, CFG.mascotName);
  }
  function announce(text) { el.sr.textContent = ""; setTimeout(function () { el.sr.textContent = text; }, 30); }

  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }

  ROUNDS.forEach(function (r, i) {
    if (!(r.answer >= 1 && r.answer <= 26)) console.warn("Round " + (i + 1) + ": answer must be between 1 and 26 to become a letter.");
  });

  /* ---------- sound ---------- */
  var audioCtx = null;
  function ctx() {
    if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, start, dur, type, vol, freqEnd) {
    var c = ctx();
    if (!c || state.muted) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function sfxGood() { tone(523, 0, .14, "triangle"); tone(659, .1, .14, "triangle"); tone(784, .2, .22, "triangle"); }
  function sfxBad() { tone(220, 0, .18, "sawtooth", .07); tone(170, .12, .24, "sawtooth", .07); }
  function sfxTick(i) { tone(420 + i * 22, 0, .05, "square", .035); }
  function sfxLock() { tone(880, 0, .1, "triangle", .14); tone(1175, .08, .18, "triangle", .14); }
  function sfxReveal() { tone(260, 0, 1.6, "sine", .07, 880); }
  function sfxWin() { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * .13, .2, "triangle", .16); }); }

  var ICON_ON = "#i-volume", ICON_OFF = "#i-volume-off";
  el.mute.addEventListener("click", function () {
    state.muted = !state.muted;
    el.mute.querySelector("use").setAttribute("href", state.muted ? ICON_OFF : ICON_ON);
    el.mute.setAttribute("aria-label", state.muted ? "Turn sound on" : "Turn sound off");
    if (state.muted && window.speechSynthesis) window.speechSynthesis.cancel();
  });

  function speak(text) {
    if (state.muted || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.35; u.volume = 1;
      var voices = window.speechSynthesis.getVoices() || [];
      var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
      if (en.length) u.voice = en[0];
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is a bonus */ }
  }

  /* ---------- the mascot's poses ---------- */
  var poseEls = {}, curPose = null, poseTimer = null, poseLoop = null;
  Object.keys(CFG.poses).forEach(function (name) {
    var im = new Image();
    im.className = "pose"; im.alt = ""; im.decoding = "async"; im.draggable = false;
    im.src = CFG.poses[name];
    el.poses.appendChild(im);
    poseEls[name] = im;
  });
  el.ghost.src = CFG.poses.calm;

  function setPose(name) {
    var next = poseEls[name] || poseEls.calm;
    if (!next || next === curPose) return;
    if (curPose) curPose.classList.remove("on");
    next.classList.add("on");
    curPose = next;
  }
  function pulsePose(name, ms) {
    setPose(name);
    clearTimeout(poseTimer);
    poseTimer = setTimeout(function () { setPose("calm"); }, ms);
  }
  function restartAnim(node, cls) {
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    node.addEventListener("animationend", function done() { node.classList.remove(cls); node.removeEventListener("animationend", done); });
  }

  /* ---------- speech bubble ---------- */
  var typeTimer = null, stageLine = "";
  function say(text, typed) {
    clearInterval(typeTimer);
    if (!text) { el.bubble.hidden = true; return; }
    el.bubble.hidden = false;
    if (typed && !REDUCED) {
      var i = 0;
      el.bubble.textContent = "";
      typeTimer = setInterval(function () {
        i++; el.bubble.textContent = text.slice(0, i);
        if (i >= text.length) clearInterval(typeTimer);
      }, 28);
    } else {
      el.bubble.textContent = text;
      el.bubble.style.animation = "none"; void el.bubble.offsetWidth; el.bubble.style.animation = "";
    }
  }
  function sayStage(text) { stageLine = text; say(text); announce(text); }
  function sayTemp(text, ms) {
    say(text);
    later(function () { if (stageLine && !state.finished) say(stageLine); }, ms);
  }

  /* ---------- the reveal: bottom to top ---------- */
  function insetFor(p) { return p >= 1 ? 0 : (p <= 0 ? 100 : HEAD_TOP + (100 - HEAD_TOP) * (1 - p)); }
  function setReveal(p, instant) {
    var inset = insetFor(p), d = instant ? "0ms" : REVEAL_MS + "ms", v = "inset(" + inset + "% 0 0 0)";
    el.reveal.style.transitionDuration = d;
    el.scan.style.transitionDuration = d + ", .4s";
    el.reveal.style.clipPath = v; el.reveal.style.webkitClipPath = v;
    el.scan.style.top = inset + "%";
  }
  function revealTo(p) {
    el.scan.style.opacity = 1;
    setReveal(p, false);
    trail(REVEAL_MS);
    later(function () { el.scan.style.opacity = 0; }, REVEAL_MS + 150);
  }

  var SPARK_COLORS = ["#F15D22", "#FAB82B", "#5E91FF", "#31C853", "#FE804E"];
  function spawnSparks(y, n) {
    for (var i = 0; i < n; i++) {
      var s = document.createElement("div");
      s.className = "sp";
      s.style.left = (6 + Math.random() * 88) + "%";
      s.style.top = (y + (Math.random() * 16 - 8)) + "px";
      s.style.setProperty("--s", (8 + Math.random() * 12) + "px");
      s.style.setProperty("--c", pick(SPARK_COLORS));
      s.addEventListener("animationend", function () { if (this.parentNode) this.parentNode.removeChild(this); });
      el.sparkles.appendChild(s);
    }
  }
  function trail(ms) {
    if (REDUCED) return;
    var end = Date.now() + ms;
    var t = setInterval(function () {
      if (Date.now() > end) { clearInterval(t); return; }
      spawnSparks(el.scan.offsetTop, 2);
    }, 110);
    timers.push(t);
  }

  /* ---------- secret word tiles and stepper ---------- */
  function buildWord() {
    el.word.innerHTML = "";
    for (var i = 0; i < TOTAL; i++) {
      var t = document.createElement("div");
      t.className = "tile"; t.textContent = "?";
      el.word.appendChild(t);
    }
    el.word.setAttribute("aria-label", "Secret word, " + TOTAL + " letters");
  }
  function lockTile(i, letter) {
    var t = el.word.children[i];
    t.textContent = letter; t.classList.add("on");
  }
  function renderStepper() {
    el.stepper.innerHTML = "";
    for (var i = 0; i < TOTAL; i++) {
      var li = document.createElement("li");
      var dot = document.createElement("span");
      dot.className = "dot";
      if (i < state.solved) {
        li.className = "done";
        dot.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>';
      } else {
        if (i === state.idx && !state.finished) li.className = "now";
        dot.textContent = i + 1;
      }
      li.appendChild(dot);
      el.stepper.appendChild(li);
    }
  }

  /* ---------- screens ---------- */
  function showScreen(which) {
    el.start.hidden = which !== "start";
    el.play.hidden = which !== "play";
    el.win.hidden = which !== "win";
  }

  /* ---------- keypad mode for touch screens ---------- */
  function setKeypadMode() {
    var on = mq("(pointer: coarse)") || window.innerWidth <= 820;
    document.body.classList.toggle("has-keypad", on);
    el.answer.setAttribute("inputmode", on ? "none" : "numeric");
  }
  window.addEventListener("resize", setKeypadMode);
  setKeypadMode();

  /* ---------- game flow ---------- */
  function resetStage() {
    clearTimers();
    clearInterval(poseLoop); clearTimeout(poseTimer);
    el.stage.classList.remove("alive");
    el.sparkles.innerHTML = "";
    el.scan.style.opacity = 0;
    setReveal(0, true);
    setPose("calm");
    stageLine = MSG.intro;
    say(MSG.intro);
  }

  function startGame() {
    state.name = el.nameInput.value.trim();
    state.idx = 0; state.solved = 0; state.wrong = 0; state.streakWrong = 0; state.mistakes = 0;
    state.busy = false; state.finished = false;
    ctx(); // unlock audio on this tap
    resetStage();
    buildWord();
    showScreen("play");
    showRound();
  }

  function toTop() { if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }); }

  function showRound() {
    toTop(); // keep the mascot in view on small screens
    var r = ROUNDS[state.idx];
    state.wrong = 0; state.busy = false;
    el.clueLabel.textContent = "Clue " + (state.idx + 1) + " of " + TOTAL;
    el.sumText.textContent = r.sum + " = ?";
    el.answer.value = ""; el.answer.className = "";
    el.feedback.textContent = ""; el.feedback.className = "feedback";
    el.hint.hidden = true;
    el.decodeBox.hidden = true;
    el.askBox.hidden = false;
    renderStepper();
    if (!mq("(pointer: coarse)")) el.answer.focus();
    announce("Clue " + (state.idx + 1) + " of " + TOTAL + ": " + r.sum + " equals what?");
  }

  function showHint() {
    var h = ROUNDS[state.idx].hint;
    if (!h) return;
    el.hint.textContent = "Hint: " + h;
    el.hint.hidden = false;
  }
  el.hintBtn.addEventListener("click", function () {
    if (el.hint.hidden) showHint(); else el.hint.hidden = true;
  });

  function onWrong() {
    state.wrong++; state.streakWrong++; state.mistakes++;
    sfxBad();
    el.feedback.textContent = pick(MSG.wrong);
    el.feedback.className = "feedback bad";
    el.answer.className = "bad";
    restartAnim(el.sumText, "shake");
    restartAnim(el.tiger, "shake");
    pulsePose(state.streakWrong >= 3 ? "cry" : "sad", 1600);
    sayTemp(fill(pick(MSG.wrongBubble)), 2600);
    if (state.wrong >= 2) showHint();
    setTimeout(function () { el.answer.value = ""; el.answer.className = ""; if (!mq("(pointer: coarse)")) el.answer.focus(); }, 650);
  }

  function buildAlpha() {
    el.alpha.innerHTML = "";
    for (var i = 1; i <= 26; i++) {
      var s = document.createElement("span");
      s.textContent = letterFor(i);
      s.setAttribute("data-n", i);
      el.alpha.appendChild(s);
    }
  }
  function walkAlpha(n, done) {
    var cells = el.alpha.children, i = 0, step = REDUCED ? 0 : Math.max(32, Math.min(80, 1300 / n));
    if (!step) {
      for (var k = 0; k < n - 1; k++) cells[k].classList.add("lit");
      cells[n - 1].classList.add("hit");
      done(); return;
    }
    var t = setInterval(function () {
      if (i > 0) { cells[i - 1].classList.remove("hit"); cells[i - 1].classList.add("lit"); }
      cells[i].classList.add("hit");
      sfxTick(i);
      i++;
      if (i >= n) { clearInterval(t); later(done, 380); }
    }, step);
    timers.push(t);
  }

  // the letter tile flies up into the secret word
  function fly(fromEl, toEl, text, done) {
    if (REDUCED || !fromEl.animate) { done(); return; }
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    var c = document.createElement("div");
    c.className = "fly"; c.textContent = text;
    c.style.left = a.left + "px"; c.style.top = a.top + "px"; c.style.width = a.width + "px"; c.style.height = a.height + "px";
    document.body.appendChild(c);
    var dx = b.left - a.left, dy = b.top - a.top, s = b.width / a.width;
    var anim = c.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(" + (dx * 0.45) + "px," + (dy * 0.45 - 70) + "px) scale(1.12)", offset: 0.5 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")" }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
    anim.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); done(); };
  }

  function onCorrect() {
    var i = state.idx, r = ROUNDS[i], letter = letterFor(r.answer), last = i === TOTAL - 1;
    state.busy = true; state.streakWrong = 0;
    sfxGood();
    pulsePose("happy", 1500);
    el.answer.className = "good";
    el.feedback.textContent = "Correct!"; el.feedback.className = "feedback good";

    // decode view
    el.askBox.hidden = true;
    el.decodeBox.hidden = false;
    el.decodeLine.textContent = r.sum + " = ";
    var b = document.createElement("b"); b.textContent = r.answer; el.decodeLine.appendChild(b);
    el.decodeNote.textContent = "Letter number " + r.answer + " is";
    el.bigLetter.textContent = letter;
    el.bigLetter.className = "big-letter"; el.bigLetter.style.visibility = "visible";
    el.nextBtn.disabled = true;
    el.nextBtn.textContent = last ? "Wake up " + CFG.mascotName : "Next clue";
    buildAlpha();
    announce(r.sum + " is " + r.answer + ", and letter " + r.answer + " is " + letter + ".");

    walkAlpha(r.answer, function () {
      el.bigLetter.classList.add("pop");
      later(function () {
        fly(el.bigLetter, el.word.children[i], letter, function () {
          el.bigLetter.style.visibility = "hidden";
          el.decodeNote.textContent = "Locked in!";
          lockTile(i, letter);
          sfxLock();
          state.solved = i + 1;
          renderStepper();
          if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });

          // the tiger rises
          revealTo(state.solved / TOTAL);
          sfxReveal();
          restartAnim(el.tiger, "hop");
          sayStage(last ? MSG.ready : (MSG.stages[i] || ""));

          later(function () { el.nextBtn.disabled = false; el.nextBtn.focus({ preventScroll: true }); }, REVEAL_MS + 200);
        });
      }, REDUCED ? 0 : 500);
    });
  }

  function submitAnswer() {
    if (state.busy) return;
    var raw = el.answer.value.trim();
    if (raw === "") {
      el.feedback.textContent = "Type your answer first.";
      el.feedback.className = "feedback bad";
      return;
    }
    if (parseInt(raw, 10) === ROUNDS[state.idx].answer) onCorrect(); else onWrong();
  }
  el.form.addEventListener("submit", function (e) { e.preventDefault(); submitAnswer(); });
  el.answer.addEventListener("input", function () {
    el.answer.value = el.answer.value.replace(/[^0-9]/g, "");
    el.answer.className = "";
  });
  el.keypad.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || state.busy) return;
    var k = btn.getAttribute("data-key");
    if (k === "back") el.answer.value = el.answer.value.slice(0, -1);
    else if (k === "go") submitAnswer();
    else if (el.answer.value.length < 3) el.answer.value += k;
    el.answer.className = "";
  });

  el.nextBtn.addEventListener("click", function () {
    if (el.nextBtn.disabled) return;
    if (state.idx === TOTAL - 1) { wake(); return; }
    state.idx++;
    showRound();
  });

  /* ---------- the big moment ---------- */
  function wake() {
    el.nextBtn.disabled = true;
    state.finished = true;
    state.thanks = fill(MSG.thanks);
    toTop();
    setPose("shocked");
    sayStage(fill(MSG.waking));
    restartAnim(el.tiger, "shake");
    tone(300, 0, .5, "triangle", .12, 900);

    later(function () {
      el.stage.classList.add("alive");
      renderStepper();
      showWin();
      var seq = ["party", "cheer", "happy"], n = 0;
      setPose(seq[0]);
      poseLoop = setInterval(function () { n = (n + 1) % seq.length; setPose(seq[n]); }, 1100);
      burstConfetti(); later(burstConfetti, 900);
      sfxWin();
      say(state.thanks, true);
      announce(state.thanks);
      later(function () { speak(state.thanks); }, 450);
    }, REDUCED ? 200 : 1200);
  }

  function showWin() {
    el.winTitle.textContent = fill(MSG.winTitle);
    var word = ROUNDS.map(function (r) { return letterFor(r.answer); }).join("");
    var slips = state.mistakes;
    el.winText.textContent = "You cracked all " + TOTAL + " clues and the secret word was " + word + ". " +
      (slips === 0 ? "Not a single slip. Amazing!" : slips + (slips === 1 ? " slip" : " slips") + " along the way, and you kept going. That's what maths stars do!");
    var count = slips === 0 ? 3 : (slips <= 2 ? 2 : 1);
    el.stars.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("class", "star" + (i < count ? " on" : ""));
      s.setAttribute("viewBox", "0 0 24 24");
      s.style.setProperty("--d", (0.2 + i * 0.25) + "s");
      s.innerHTML = '<use href="#i-star"/>';
      el.stars.appendChild(s);
    }
    showScreen("win");
  }

  el.hearBtn.addEventListener("click", function () { ctx(); speak(state.thanks); });
  el.againBtn.addEventListener("click", function () {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.finished = false; state.solved = 0;
    clearConfetti();
    resetStage();
    buildWord();
    showScreen("start");
  });
  el.startBtn.addEventListener("click", startGame);
  el.nameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") startGame(); });

  // typing digits works even if the box lost focus
  document.addEventListener("keydown", function (e) {
    if (el.play.hidden || el.askBox.hidden || state.busy) return;
    if (/^[0-9]$/.test(e.key) && document.activeElement !== el.answer && !e.ctrlKey && !e.metaKey) {
      if (el.answer.value.length < 3) el.answer.value += e.key;
      el.answer.focus();
    }
  });

  /* ---------- confetti ---------- */
  var cctx = el.confetti.getContext("2d");
  var pieces = [], raf = 0;
  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    el.confetti.width = window.innerWidth * dpr;
    el.confetti.height = window.innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();

  function burstConfetti() {
    if (REDUCED) return;
    var colors = ["#F15D22", "#FAB82B", "#5E91FF", "#31C853", "#FE804E", "#212638"];
    var w = window.innerWidth;
    for (var i = 0; i < 150; i++) {
      pieces.push({
        x: w / 2 + (Math.random() - .5) * w * .6, y: -20 - Math.random() * 220,
        vx: (Math.random() - .5) * 5, vy: 2 + Math.random() * 4,
        r: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
        c: colors[i % colors.length], round: Math.random() < .3
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.rot += p.vr;
      cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot); cctx.fillStyle = p.c;
      if (p.round) { cctx.beginPath(); cctx.arc(0, 0, p.r / 2.2, 0, 6.3); cctx.fill(); }
      else cctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * .6);
      cctx.restore();
    });
    pieces = pieces.filter(function (p) { return p.y < window.innerHeight + 30; });
    if (pieces.length) raf = requestAnimationFrame(tick);
    else { raf = 0; cctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  function clearConfetti() { pieces = []; }

  /* ---------- first paint ---------- */
  el.wordLabel.textContent = CFG.mascotName.toLowerCase() + "'s secret word";
  resetStage();
  buildWord();
  showScreen("start");
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
})();

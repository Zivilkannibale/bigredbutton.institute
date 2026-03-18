(function () {
  var pressTimestamps = [];
  var intervals = [];
  var particles = [];
  var waveData = [];
  var burstBins = new Array(40).fill(0);
  var entropyParticlesMain = [];
  var entropyParticlesMini = [];
  var timers = Object.create(null);

  var count = 0;
  var sessionStart = Date.now();
  var maxBurst = 0;
  var fieldPressCount = 0;
  var fieldPressWindow = [];
  var entropyVal = 0;
  var telemetryRatePerMinute = 0;
  var telemetryAvgIntervalMs = null;
  var telemetryEntropy = null;
  var burstWindowSec = 30;
  var vizReady = false;
  var currentDockProgress = 0;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scrollAssist = {
    lastY: window.scrollY || window.pageYOffset || 0,
    lastAt: performance.now(),
    velocity: 0,
    settleTimer: null,
    ignoreUntil: 0,
    cooldownUntil: 0,
    lastTargetTop: null
  };

  var btn = document.getElementById("pressBtn");
  var countEl = document.getElementById("pressCount");
  var labPanel = document.getElementById("labPanel");
  var pressCol = document.getElementById("pressColumn");
  var flash = document.getElementById("screenFlash");
  var ripples = [document.getElementById("ripple1"), document.getElementById("ripple2"), document.getElementById("ripple3")].filter(Boolean);
  var rippleIdx = 0;
  var statRate = document.getElementById("statRate");
  var statEntropy = document.getElementById("statEntropy");
  var statAvg = document.getElementById("statAvgInterval");
  var statBurst = document.getElementById("statBurst");
  var mdRate = document.getElementById("mdRate");
  var mdEntropy = document.getElementById("mdEntropy");
  var mdAvg = document.getElementById("mdAvg");
  var mdBurst = document.getElementById("mdBurst");

  var waveC = document.getElementById("waveCanvas");
  var intervalC = document.getElementById("intervalCanvas");
  var entropyC = document.getElementById("entropyCanvas");
  var burstC = document.getElementById("burstCanvas");
  var mWaveC = document.getElementById("mWave");
  var mIntervalC = document.getElementById("mInterval");
  var mEntropyC = document.getElementById("mEntropy");
  var mBurstC = document.getElementById("mBurst");
  var waveCtx = waveC && waveC.getContext("2d");
  var intervalCtx = intervalC && intervalC.getContext("2d");
  var entropyCtx = entropyC && entropyC.getContext("2d");
  var burstCtx = burstC && burstC.getContext("2d");
  var mWaveCtx = mWaveC && mWaveC.getContext("2d");
  var mIntervalCtx = mIntervalC && mIntervalC.getContext("2d");
  var mEntropyCtx = mEntropyC && mEntropyC.getContext("2d");
  var mBurstCtx = mBurstC && mBurstC.getContext("2d");

  var pedestal = document.getElementById("pedestalFloat");
  var pedestalControl = document.getElementById("pedestalButton");
  var pedestalFrame = document.getElementById("pedestalFrame");
  var pedestalShockwave = document.getElementById("pedestalShockwave");
  var pedestalScrollHint = document.getElementById("pedestalScrollHint");
  var sceneWrap = document.getElementById("sceneWrap");
  var sceneSvg = sceneWrap && sceneWrap.querySelector("svg.street-svg");
  var sceneViewBox = sceneSvg && sceneSvg.viewBox && sceneSvg.viewBox.baseVal
    ? {
        minX: sceneSvg.viewBox.baseVal.x,
        minY: sceneSvg.viewBox.baseVal.y,
        width: sceneSvg.viewBox.baseVal.width || 960,
        height: sceneSvg.viewBox.baseVal.height || 420
      }
    : {
        minX: 0,
        minY: 0,
        width: 960,
        height: 420
      };
  var sceneDockHalo = document.getElementById("sceneDockHalo");
  var sceneStatus = document.getElementById("sceneStatus");
  var fieldCaption = document.getElementById("fieldCaption");
  var miniDash = document.getElementById("miniDash");
  var airshipDomLayer = document.getElementById("sceneAirships");
  var landingSpot = document.getElementById("landingSpot");
  var person1 = document.getElementById("person1");
  var person2 = document.getElementById("person2");
  var person3 = document.getElementById("person3");
  var person4 = document.getElementById("person4");
  var person4Bubble = document.getElementById("person4Bubble");
  var person4Quote = document.getElementById("person4Quote");

  var ambientC = document.getElementById("ambientCanvas");
  var ambientCtx = ambientC && ambientC.getContext("2d");
  var floaters = [];
  var capturedFloatPos = null;
  var isDocked = false;
  var isUndocking = false;
  var bobPhase = 0;
  var walkPhase = 0;
  var curiosityTimer = null;
  var fieldStatusTimer = null;
  var curiosityHomeX = 560;
  var curiosityTargetX = 512;
  var dockTargetX = 498;
  var dockTargetY = 356;
  var reggieHomeX = 1035;
  var reggieTargetX = 466;
  var reggieQuotes = [
    "When you feel emotionally ready, gently but decisively interface with the large chromatic circle of destiny in front of you.",
    "Locate the red probability disc, apply finger pressure, and allow the universe to update itself.",
    "Just go ahead and press the big, red existential confirmation button. See what your timeline does."
  ];
  var reggieQuoteIndex = -1;
  var reggieQuoteTimer = null;
  var reggieArrived = false;
  var reggieSceneY = 332;
  var reggieAbducted = false;
  var reggieLiftState = null;
  var redWordSpans = [];
  var crowdPeople = [];
  var crowdSlots = [
    { x: 388, y: 344 },
    { x: 612, y: 344 },
    { x: 430, y: 336 },
    { x: 570, y: 336 },
    { x: 350, y: 352 },
    { x: 650, y: 352 },
    { x: 322, y: 360 },
    { x: 678, y: 360 },
    { x: 406, y: 360 },
    { x: 594, y: 360 },
    { x: 372, y: 332 },
    { x: 628, y: 332 },
    { x: 446, y: 350 },
    { x: 554, y: 350 },
    { x: 420, y: 328 },
    { x: 580, y: 328 }
  ];
  var crowdStyles = [
    { skin: "#d8c0a0", shirt: "#4a6a8a", limbs: "#3a4a5a", hair: "#5a4030", hairRx: "4", hairRy: "2.5", hairCx: "-1", hairCy: "-25", scale: 0.96 },
    { skin: "#d4b090", shirt: "#c04040", limbs: "#4a4a6a", hair: "#3a2a1a", hairRx: "5", hairRy: "3", hairCx: "1", hairCy: "-27", scale: 1, bag: "#2a2a2a" },
    { skin: "#c0a888", shirt: "#5a5a7a", limbs: "#4a4a5a", hair: "#2a2a3a", hairRx: "5", hairRy: "3", hairCx: "0", hairCy: "-26", scale: 0.94 },
    { skin: "#d0b898", shirt: "#6a8a5a", limbs: "#4a4a5a", hair: "#5d4b36", hairRx: "4.5", hairRy: "2.5", hairCx: "0", hairCy: "-25", scale: 0.92 },
    { skin: "#d8c0a0", shirt: "#8a5a6a", limbs: "#5a4a5a", hair: "#6a4632", hairRx: "4", hairRy: "2.3", hairCx: "0", hairCy: "-25", scale: 0.9 },
    { skin: "#c8b090", shirt: "#5a6a8a", limbs: "#3a4a5a", hair: "#4a3424", hairRx: "4.5", hairRy: "2.5", hairCx: "0", hairCy: "-26", scale: 0.93 }
  ];
  var airshipSource = "Images/Airships/airship.glb";
  var airshipPalettePaths = {
    classic: "Images/Airships/palette-classic.png",
    bigred: "Images/Airships/palette-bigred.png",
    sand: "Images/Airships/palette-sand.png",
    plum: "Images/Airships/palette-plum.png",
    slate: "Images/Airships/palette-slate.png"
  };
  var airshipSpritePaths = {
    classic: "Images/Airships/sprites/classic.png",
    bigred: "Images/Airships/sprites/bigred.png",
    sand: "Images/Airships/sprites/sand.png",
    plum: "Images/Airships/sprites/plum.png",
    slate: "Images/Airships/sprites/slate.png"
  };
  var airshipSpriteAspectRatio = 662 / 276;
  var airships = [];
  var airshipClock = Math.random() * 7000;
  var lastAirshipTickAt = 0;
  var crimsonAirshipActive = false;
  var crimsonEventConsumed = false;
  var crimsonPressThreshold = 42;
  var crimsonPressWindowMs = 60000;
  var airshipBlueprints = [
    {
      palette: "classic",
      x: 676,
      baseY: 16,
      width: 91,
      height: 49,
      speed: 1.08,
      phase: 0.2,
      floatY: 1.15,
      tilt: 0.34,
      direction: -1
    },
    {
      palette: "sand",
      x: 284,
      baseY: 40,
      width: 80,
      height: 44,
      speed: 0.84,
      phase: 1.7,
      floatY: 0.92,
      tilt: 0.26,
      direction: 1
    },
    {
      palette: "plum",
      x: 882,
      baseY: 62,
      width: 71,
      height: 39,
      speed: 0.92,
      phase: 3.1,
      floatY: 0.98,
      tilt: 0.28,
      direction: -1
    },
    {
      palette: "slate",
      x: -62,
      baseY: 10,
      width: 66,
      height: 36,
      speed: 0.94,
      phase: 4.2,
      floatY: 0.72,
      tilt: 0.21,
      direction: 1
    },
    {
      palette: "classic",
      x: 1036,
      baseY: 28,
      width: 63,
      height: 35,
      speed: 1.18,
      phase: 5.1,
      floatY: 0.84,
      tilt: 0.24,
      direction: -1
    },
    {
      palette: "sand",
      x: -136,
      baseY: 48,
      width: 59,
      height: 33,
      speed: 1.02,
      phase: 6.2,
      floatY: 0.76,
      tilt: 0.2,
      direction: 1
    },
    {
      palette: "plum",
      x: 1108,
      baseY: 22,
      width: 61,
      height: 34,
      speed: 1.1,
      phase: 7.1,
      floatY: 0.78,
      tilt: 0.22,
      direction: -1
    }
  ];
  var baseAirshipCount = 3;
  var crimsonAirshipBlueprint = {
    palette: "bigred",
    x: 1118,
    baseY: 52,
    width: 340,
    height: 186,
    speed: 1.42,
    direction: -1,
    phase: 9.2,
    floatY: 0.34,
    tilt: 0.08,
    special: true
  };
  var floatState = {
    baseX: 78,
    baseY: 32,
    x: 0,
    y: 0,
    rot: 0,
    driftPhase1: Math.random() * Math.PI * 2,
    driftPhase2: Math.random() * Math.PI * 2,
    driftPhase3: Math.random() * Math.PI * 2,
    driftPhase4: Math.random() * Math.PI * 2,
    shiftTimer: 0,
    shiftTargetX: 0,
    shiftTargetY: 0,
    shiftCurrentX: 0,
    shiftCurrentY: 0,
    nextShift: 4000 + Math.random() * 7000
  };
  var pedestalFrames = [];
  var pedestalAnimRaf = null;
  var pedestalFrameIndex = 0;
  var pedestalPressPeakFrame = 0;
  var pedestalAspectRatio = 140 / 320;
  var pedestalMotionValue = 0;
  var waveInjectionQueue = [];
  var lastWaveSampleAt = 0;
  var lastPedestalLoopAt = 0;
  var sceneAttractionActive = false;
  var pedestalScreenPose = {
    x: 0,
    y: 0,
    rot: 0,
    width: 0,
    height: 0,
    initialized: false
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function clearNamedTimer(name) {
    if (!timers[name]) return;
    clearTimeout(timers[name]);
    timers[name] = null;
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function initPedestalFrames() {
    if (!pedestalFrame) return;
    pedestalFrames = [];
    for (var i = 0; i <= 12; i++) pedestalFrames.push("Images/poly-button-press-" + padNumber(i) + ".png");
    pedestalPressPeakFrame = Math.floor((pedestalFrames.length - 1) / 2);
    for (var j = 0; j < pedestalFrames.length; j++) {
      var preload = new Image();
      preload.decoding = "async";
      preload.src = pedestalFrames[j];
    }
    setPedestalFrame(0);
  }

  function setPedestalFrame(index) {
    if (!pedestalFrame || !pedestalFrames.length) return;
    var nextIndex = clamp(Math.round(index), 0, pedestalFrames.length - 1);
    var lastIndex = pedestalFrames.length - 1;
    var normalizedMotion = 0;
    if (pedestalPressPeakFrame > 0 && lastIndex > 0) {
      if (nextIndex <= pedestalPressPeakFrame) {
        normalizedMotion = nextIndex / pedestalPressPeakFrame;
      } else {
        normalizedMotion = (lastIndex - nextIndex) / Math.max(1, lastIndex - pedestalPressPeakFrame);
      }
    }
    pedestalMotionValue = smoothstep(clamp(normalizedMotion, 0, 1));
    if (pedestalFrameIndex === nextIndex && pedestalFrame.getAttribute("src") === pedestalFrames[nextIndex]) return;
    pedestalFrameIndex = nextIndex;
    pedestalFrame.setAttribute("src", pedestalFrames[nextIndex]);
  }

  function stopPedestalAnimation() {
    if (pedestalAnimRaf !== null) {
      cancelAnimationFrame(pedestalAnimRaf);
      pedestalAnimRaf = null;
    }
  }

  function animatePedestalFrames(targetIndex, duration, done) {
    if (!pedestalFrames.length) {
      if (typeof done === "function") done();
      return;
    }
    stopPedestalAnimation();
    var from = pedestalFrameIndex;
    var to = clamp(targetIndex, 0, pedestalFrames.length - 1);
    if (from === to || duration <= 0) {
      setPedestalFrame(to);
      if (typeof done === "function") done();
      return;
    }
    var startedAt = 0;
    function tick(now) {
      if (!startedAt) startedAt = now;
      var progress = clamp((now - startedAt) / duration, 0, 1);
      var nextIndex = from + (to - from) * progress;
      setPedestalFrame(to > from ? Math.floor(nextIndex) : Math.ceil(nextIndex));
      if (progress >= 1) {
        setPedestalFrame(to);
        pedestalAnimRaf = null;
        if (typeof done === "function") done();
        return;
      }
      pedestalAnimRaf = requestAnimationFrame(tick);
    }
    pedestalAnimRaf = requestAnimationFrame(tick);
  }

  function getPedestalFloatSize() {
    var height;
    if (window.innerWidth <= 650) height = 168;
    else if (window.innerWidth <= 980) height = 288;
    else height = 320;
    return {
      width: Math.round(height * pedestalAspectRatio),
      height: height
    };
  }

  function transient(name, el, className, ms, replay) {
    if (!el) return;
    if (replay) {
      el.classList.remove(className);
      void el.offsetWidth;
    }
    el.classList.add(className);
    clearNamedTimer(name);
    timers[name] = setTimeout(function () {
      el.classList.remove(className);
      timers[name] = null;
    }, ms);
  }

  function shouldWrapRedText(parent) {
    if (!parent || !parent.tagName) return false;
    if (parent.closest && parent.closest(".red-word")) return false;
    return ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "SVG", "CANVAS"].indexOf(parent.tagName) === -1;
  }

  function collectRedWords() {
    if (!document.body || redWordSpans.length || !window.NodeFilter) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node || !node.nodeValue || !/\bred\b/i.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return shouldWrapRedText(node.parentNode) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var text = textNode.nodeValue;
      var parent = textNode.parentNode;
      if (!parent) continue;
      var fragment = document.createDocumentFragment();
      var regex = /\bred\b/gi;
      var lastIndex = 0;
      var match;
      while ((match = regex.exec(text))) {
        if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        var span = document.createElement("span");
        span.className = "red-word";
        span.textContent = match[0];
        fragment.appendChild(span);
        redWordSpans.push(span);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      parent.replaceChild(fragment, textNode);
    }
  }

  function pulseRedWords() {
    if (!redWordSpans.length) return;
    for (var i = 0; i < redWordSpans.length; i++) redWordSpans[i].classList.remove("is-pulsing");
    if (redWordSpans[0]) void redWordSpans[0].offsetWidth;
    for (var j = 0; j < redWordSpans.length; j++) redWordSpans[j].classList.add("is-pulsing");
    clearNamedTimer("redWords");
    timers.redWords = setTimeout(function () {
      for (var k = 0; k < redWordSpans.length; k++) redWordSpans[k].classList.remove("is-pulsing");
      timers.redWords = null;
    }, 1100);
  }

  function trimData() {
    if (pressTimestamps.length > 2048) pressTimestamps.splice(0, pressTimestamps.length - 2048);
    if (intervals.length > 1024) intervals.splice(0, intervals.length - 1024);
    if (waveData.length > 160) waveData.splice(0, waveData.length - 160);
  }

  function resizeAmbient() {
    if (!ambientC) return;
    ambientC.width = window.innerWidth;
    ambientC.height = window.innerHeight;
  }

  function initAmbient() {
    if (!ambientCtx) return;
    resizeAmbient();
    for (var i = 0; i < 35; i++) {
      floaters.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.12 + 0.03
      });
    }
  }

  function drawAmbient() {
    if (!ambientCtx || !ambientC) return;
    ambientCtx.clearRect(0, 0, ambientC.width, ambientC.height);
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < -10) f.x = ambientC.width + 10;
      if (f.x > ambientC.width + 10) f.x = -10;
      if (f.y < -10) f.y = ambientC.height + 10;
      if (f.y > ambientC.height + 10) f.y = -10;
      ambientCtx.beginPath();
      ambientCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ambientCtx.fillStyle = "rgba(223,44,44," + f.alpha + ")";
      ambientCtx.fill();
    }
    for (var j = particles.length - 1; j >= 0; j--) {
      var p = particles[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= 0.015;
      if (p.life <= 0) {
        particles.splice(j, 1);
        continue;
      }
      ambientCtx.beginPath();
      ambientCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ambientCtx.fillStyle = "rgba(" + p.color + "," + (p.life * 0.6) + ")";
      ambientCtx.fill();
    }
    requestAnimationFrame(drawAmbient);
  }

  function spawnParticles(x, y, countValue) {
    for (var i = 0; i < countValue; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = Math.random() * 4 + 1.5;
      var colors = ["223,44,44", "255,100,70", "255,160,80", "200,30,30"];
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: Math.random() * 4 + 1.5,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function setupCanvas(canvas) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas._vw = rect.width;
    canvas._vh = rect.height;
    var ctx = canvas.getContext("2d");
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resizeCanvases() {
    [waveC, intervalC, entropyC, burstC, mWaveC, mIntervalC, mEntropyC, mBurstC].forEach(setupCanvas);
    vizReady = true;
  }

  function getMetrics(canvas) {
    return {
      width: canvas ? (canvas._vw || canvas.clientWidth || 0) : 0,
      height: canvas ? (canvas._vh || canvas.clientHeight || 0) : 0
    };
  }

  function initEntropy(store, width, height) {
    store.length = 0;
    for (var i = 0; i < 50; i++) {
      store.push({ x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0, r: Math.random() * 2 + 0.8 });
    }
  }

  function fillRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }
  }

  function drawWave(ctx, canvas) {
    if (!ctx || !canvas) return;
    var metrics = getMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (var gy = 20; gy < height; gy += 20) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.beginPath();
    var gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(223,44,44,0.15)");
    gradient.addColorStop(1, "rgba(223,44,44,0.9)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    var points = waveData.slice(-96);
    while (points.length < 96) points.unshift(0);
    for (var i = 0; i < points.length; i++) {
      var px = (i / Math.max(1, points.length - 1)) * width;
      var py = height / 2 - points[i] * (height * 0.4);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function drawIntervals(ctx, canvas) {
    if (!ctx || !canvas) return;
    var metrics = getMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (var gy = 20; gy < height; gy += 20) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    if (!intervals.length) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.font = "11px 'IBM Plex Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText("Awaiting data...", width / 2, height / 2);
      return;
    }
    var data = intervals.slice(-25);
    var maxValue = Math.max.apply(null, data) || 1;
    var barWidth = (width - 8) / 25;
    for (var i = 0; i < data.length; i++) {
      var barHeight = (data[i] / maxValue) * (height - 16);
      var x = 4 + i * barWidth;
      var y = height - 8 - barHeight;
      var tone = 1 - (data[i] / maxValue);
      ctx.fillStyle = "rgba(" + (223 + Math.round(tone * 32)) + "," + (44 + Math.round(tone * 56)) + "," + (44 + Math.round(tone * 36)) + ",0.8)";
      fillRoundedRect(ctx, x + 1, y, barWidth - 2, barHeight, 2);
    }
  }

  function drawEntropy(ctx, canvas, store) {
    if (!ctx || !canvas) return;
    var metrics = getMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;
    if (!store.length || canvas._entropyW !== width || canvas._entropyH !== height) {
      canvas._entropyW = width;
      canvas._entropyH = height;
      initEntropy(store, width, height);
    }
    ctx.clearRect(0, 0, width, height);
    var chaos = Math.min(entropyVal / 3, 1);
    for (var i = 0; i < store.length; i++) {
      var p = store[i];
      p.vx += (Math.random() - 0.5) * chaos * 1.5;
      p.vy += (Math.random() - 0.5) * chaos * 1.5;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.vx += (width / 2 - p.x) * 0.001;
      p.vy += (height / 2 - p.y) * 0.001;
      p.x += p.vx;
      p.y += p.vy;
      for (var j = i + 1; j < store.length; j++) {
        var q = store[j];
        var dx = q.x - p.x;
        var dy = q.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 45 + chaos * 25;
        if (dist < maxDist) {
          ctx.strokeStyle = "rgba(223,44,44," + ((1 - dist / maxDist) * 0.2) + ")";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + chaos * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(223,80,60," + (0.3 + chaos * 0.5) + ")";
      ctx.fill();
    }
  }

  function drawBurst(ctx, canvas) {
    if (!ctx || !canvas) return;
    var metrics = getMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    var binWidth = width / burstBins.length;
    var maxValue = Math.max.apply(null, burstBins) || 1;
    for (var i = 0; i < burstBins.length; i++) {
      var tone = burstBins[i] / maxValue;
      ctx.fillStyle = "rgb(" + (30 + Math.round(tone * 200)) + "," + (18 + Math.round(tone * 30)) + "," + (24 + Math.round(tone * 20)) + ")";
      ctx.fillRect(i * binWidth, 0, binWidth, height);
    }
  }

  function drawAllViz() {
    if (vizReady) {
      drawWave(waveCtx, waveC);
      drawIntervals(intervalCtx, intervalC);
      drawEntropy(entropyCtx, entropyC, entropyParticlesMain);
      drawBurst(burstCtx, burstC);
      drawWave(mWaveCtx, mWaveC);
      drawIntervals(mIntervalCtx, mIntervalC);
      drawEntropy(mEntropyCtx, mEntropyC, entropyParticlesMini);
      drawBurst(mBurstCtx, mBurstC);
    }
    requestAnimationFrame(drawAllViz);
  }

  function computeEntropy(values) {
    if (values.length < 3) return 0;
    var bins = {};
    var recent = values.slice(-20);
    for (var i = 0; i < recent.length; i++) {
      var bucket = Math.round(recent[i] / 200) * 200;
      bins[bucket] = (bins[bucket] || 0) + 1;
    }
    var entropy = 0;
    var total = recent.length;
    var keys = Object.keys(bins);
    for (var j = 0; j < keys.length; j++) {
      var p = bins[keys[j]] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  function computeBurst() {
    if (pressTimestamps.length < 2) return 0;
    var burst = 1;
    var best = 1;
    for (var i = 1; i < pressTimestamps.length; i++) {
      if (pressTimestamps[i] - pressTimestamps[i - 1] < 600) {
        burst++;
        if (burst > best) best = burst;
      } else {
        burst = 1;
      }
    }
    return best;
  }

  function getTelemetrySnapshot() {
    return {
      verifiedPresses: count,
      ratePerMinute: telemetryRatePerMinute,
      avgIntervalMs: telemetryAvgIntervalMs,
      maxBurst: maxBurst,
      entropy: telemetryEntropy,
      waveform: waveData.slice(-96)
    };
  }

  function publishTelemetrySnapshot() {
    var snapshot = getTelemetrySnapshot();
    window.BRB = window.BRB || {};
    window.BRB.telemetry = snapshot;
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("brb:telemetry-update", {
        detail: snapshot
      }));
    }
  }

  function updateStats() {
    var now = Date.now();
    var recent = 0;
    for (var i = pressTimestamps.length - 1; i >= 0; i--) {
      if (now - pressTimestamps[i] > 60000) break;
      recent++;
    }
    entropyVal = computeEntropy(intervals);
    var avg = "\u2014";
    if (intervals.length) {
      var sample = intervals.slice(-10);
      var sum = 0;
      for (var j = 0; j < sample.length; j++) sum += sample[j];
      avg = Math.round(sum / sample.length);
    }
    var burst = computeBurst();
    if (burst > maxBurst) maxBurst = burst;
    var rateValue = recent.toFixed(1);
    var entropyValue = entropyVal > 0 ? entropyVal.toFixed(2) : "\u2014";
    telemetryRatePerMinute = Number(rateValue);
    telemetryAvgIntervalMs = avg === "\u2014" ? null : Number(avg);
    telemetryEntropy = entropyValue === "\u2014" ? null : Number(entropyValue);
    if (statRate) statRate.textContent = rateValue;
    if (statEntropy) statEntropy.textContent = entropyValue;
    if (statAvg) statAvg.textContent = avg;
    if (statBurst) statBurst.textContent = maxBurst;
    if (mdRate) mdRate.textContent = rateValue;
    if (mdEntropy) mdEntropy.textContent = entropyValue;
    if (mdAvg) mdAvg.textContent = avg;
    if (mdBurst) mdBurst.textContent = maxBurst;
    publishTelemetrySnapshot();
  }

  function updateFloatAnchor() {
    if (window.innerWidth <= 650) {
      floatState.baseX = 82;
      floatState.baseY = 68;
    } else if (window.innerWidth <= 980) {
      floatState.baseX = 84;
      floatState.baseY = 60;
    } else {
      floatState.baseX = 88;
      floatState.baseY = 32;
    }
  }

  function ensureFloatingHost() {
    if (!pedestal || pedestal.parentElement === document.body) return;
    document.body.appendChild(pedestal);
  }

  function placePedestalFixed(x, y, rot, width, height) {
    if (!pedestal) return;
    var size = getPedestalFloatSize();
    ensureFloatingHost();
    pedestal.classList.remove("docked");
    pedestal.style.position = "fixed";
    pedestal.style.left = "0";
    pedestal.style.top = "0";
    pedestal.style.width = (width || size.width) + "px";
    pedestal.style.height = (height || size.height) + "px";
    pedestal.style.transform = "translate(" + x + "px, " + y + "px) rotate(" + rot + "deg)";
    floatState.x = x;
    floatState.y = y;
    floatState.rot = rot;
  }

  function tickFloatState() {
    updateFloatAnchor();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var size = getPedestalFloatSize();
    var footprintScaleX = window.innerWidth <= 700 ? 1.28 : 1.48;
    var overhangX = size.width * (footprintScaleX - 1) * 0.5;
    var minX = Math.max(8, 8 + overhangX);
    var maxX = Math.max(minX, vw - size.width - overhangX - 8);
    var visibleFloatHeight = window.innerWidth <= 650 ? size.height * 0.72 : size.height;
    var maxY = Math.max(8, vh - visibleFloatHeight - 8);
    if (reducedMotion) {
      floatState.x = clamp((floatState.baseX / 100) * vw, minX, maxX);
      floatState.y = clamp((floatState.baseY / 100) * vh, 8, maxY);
      floatState.rot = 0;
      return;
    }
    floatState.driftPhase1 += 0.008;
    floatState.driftPhase2 += 0.011;
    floatState.driftPhase3 += 0.006;
    floatState.driftPhase4 += 0.0035;
    var driftScale = window.innerWidth <= 650 ? 0.55 : window.innerWidth <= 980 ? 0.78 : 1;
    var driftX = (Math.sin(floatState.driftPhase1) * 18 + Math.sin(floatState.driftPhase2 * 0.7) * 10) * driftScale;
    var driftY = (Math.cos(floatState.driftPhase3) * 14 + Math.sin(floatState.driftPhase4 * 1.3) * 8) * driftScale;
    floatState.rot = (Math.sin(floatState.driftPhase1 * 0.6) * 4 + Math.sin(floatState.driftPhase2 * 0.4) * 2.5) * driftScale;
    floatState.shiftTimer += 16;
    if (floatState.shiftTimer > floatState.nextShift) {
      floatState.shiftTimer = 0;
      floatState.nextShift = 4000 + Math.random() * 7000;
      floatState.shiftTargetX = (Math.random() - 0.5) * 120 * driftScale;
      floatState.shiftTargetY = (Math.random() - 0.5) * 80 * driftScale;
    }
    floatState.shiftCurrentX += (floatState.shiftTargetX - floatState.shiftCurrentX) * 0.008;
    floatState.shiftCurrentY += (floatState.shiftTargetY - floatState.shiftCurrentY) * 0.008;
    var proposedX = (floatState.baseX / 100) * vw + driftX + floatState.shiftCurrentX;
    if (proposedX <= minX) {
      proposedX = minX;
      floatState.shiftTargetX = Math.abs(floatState.shiftTargetX) * 0.85;
      floatState.shiftCurrentX = Math.abs(floatState.shiftCurrentX) * 0.52;
    } else if (proposedX >= maxX) {
      proposedX = maxX;
      floatState.shiftTargetX = -Math.abs(floatState.shiftTargetX) * 0.85;
      floatState.shiftCurrentX = -Math.abs(floatState.shiftCurrentX) * 0.52;
    }
    floatState.x = proposedX;
    floatState.y = clamp((floatState.baseY / 100) * vh + driftY + floatState.shiftCurrentY, 8, maxY);
  }

  function getSceneMapping() {
    if (!sceneWrap) return null;
    var rect = sceneWrap.getBoundingClientRect();
    var sx = rect.width / sceneViewBox.width;
    var sy = rect.height / sceneViewBox.height;
    var scale = Math.max(sx, sy);
    return {
      rect: rect,
      scale: scale,
      minX: sceneViewBox.minX,
      minY: sceneViewBox.minY,
      offX: (rect.width - sceneViewBox.width * scale) / 2,
      offY: (rect.height - sceneViewBox.height * scale) / 2
    };
  }

  function getDockScreenPos() {
    var map = getSceneMapping();
    if (!map) return null;
    var height = 34 * map.scale;
    var width = height * pedestalAspectRatio;
    return {
      x: map.rect.left + map.offX + (dockTargetX - map.minX) * map.scale - width / 2,
      y: map.rect.top + map.offY + (dockTargetY - map.minY) * map.scale - height,
      width: width,
      height: height
    };
  }

  function getDockAbsolutePos() {
    var map = getSceneMapping();
    if (!map) return null;
    var height = 34 * map.scale;
    var width = height * pedestalAspectRatio;
    return {
      left: map.offX + (dockTargetX - map.minX) * map.scale - width / 2,
      top: map.offY + (dockTargetY - map.minY) * map.scale - height,
      width: width,
      height: height
    };
  }

  function syncSceneDockHalo() {
    if (!sceneDockHalo) return;
    var absolute = getDockAbsolutePos();
    if (!absolute) return;
    var diameter = clamp(absolute.height * 0.72, 60, 88);
    var centerX = absolute.left + absolute.width * 0.5;
    var centerY = absolute.top + absolute.height * 0.6;
    sceneDockHalo.style.left = centerX.toFixed(1) + "px";
    sceneDockHalo.style.top = centerY.toFixed(1) + "px";
    sceneDockHalo.style.width = diameter.toFixed(1) + "px";
    sceneDockHalo.style.height = diameter.toFixed(1) + "px";
  }

  function getHomeScreenPose() {
    var size = getPedestalFloatSize();
    return {
      x: floatState.x,
      y: floatState.y,
      rot: floatState.rot,
      width: size.width,
      height: size.height
    };
  }

  function getDockPose() {
    var dock = getDockScreenPos();
    if (!dock) return null;
    return {
      x: dock.x,
      y: dock.y,
      rot: 0,
      width: dock.width,
      height: dock.height
    };
  }

  function getScrollProgress() {
    if (!sceneWrap) return 0;
    var rect = sceneWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    if (reducedMotion) {
      return rect.top < vh * 0.6 && rect.bottom > vh * 0.2 ? 1 : 0;
    }
    return clamp((vh * 0.9 - rect.top) / (vh * 0.9 - vh * 0.3), 0, 1);
  }

  function getSceneVisibilityRatio() {
    if (!sceneWrap) return 0;
    var rect = sceneWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return clamp(visible / Math.max(1, Math.min(rect.height, vh)), 0, 1);
  }

  function shouldAttractToScene() {
    if (!sceneWrap) return false;
    var rect = sceneWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var visibility = getSceneVisibilityRatio();
    var centerY = rect.top + rect.height * 0.5;
    var enterVisible = visibility > 0.42 && centerY > vh * 0.24 && centerY < vh * 0.88;
    var stayVisible = visibility > 0.22 && centerY > vh * 0.1 && centerY < vh * 0.96;
    if (reducedMotion) {
      sceneAttractionActive = enterVisible;
      return sceneAttractionActive;
    }
    if (sceneAttractionActive) sceneAttractionActive = stayVisible;
    else sceneAttractionActive = enterVisible;
    return sceneAttractionActive;
  }

  function getFrameSmoothing(amount, dt) {
    return 1 - Math.pow(1 - amount, Math.max(0.5, dt / 16.6667));
  }

  function ensurePedestalScreenPose(homePose) {
    if (pedestalScreenPose.initialized) return;
    pedestalScreenPose.x = homePose.x;
    pedestalScreenPose.y = homePose.y;
    pedestalScreenPose.rot = homePose.rot;
    pedestalScreenPose.width = homePose.width;
    pedestalScreenPose.height = homePose.height;
    pedestalScreenPose.initialized = true;
  }

  function applyPedestalScreenPose() {
    if (!pedestal || !pedestalScreenPose.initialized) return;
    ensureFloatingHost();
    pedestal.classList.remove("docked");
    pedestal.classList.remove("undocking");
    pedestal.style.position = "fixed";
    pedestal.style.left = "0";
    pedestal.style.top = "0";
    pedestal.style.width = pedestalScreenPose.width + "px";
    pedestal.style.height = pedestalScreenPose.height + "px";
    pedestal.style.transform = "translate(" + pedestalScreenPose.x + "px, " + pedestalScreenPose.y + "px) rotate(" + pedestalScreenPose.rot + "deg)";
    if (!pedestal.classList.contains("pressed-glow")) pedestal.style.filter = "";
  }

  function getPoseDistance(a, b) {
    if (!a || !b) return 0;
    var dx = (a.x || 0) - (b.x || 0);
    var dy = (a.y || 0) - (b.y || 0);
    var dw = (a.width || 0) - (b.width || 0);
    var dh = (a.height || 0) - (b.height || 0);
    var dr = (a.rot || 0) - (b.rot || 0);
    return Math.sqrt(dx * dx + dy * dy + dw * dw * 0.5 + dh * dh * 0.5 + dr * dr * 12);
  }

  function updateFieldDeploymentUI(isAttracting) {
    if (miniDash) miniDash.classList.toggle("visible", isDocked || currentDockProgress > 0.62);
    if (sceneDockHalo) {
      syncSceneDockHalo();
      sceneDockHalo.classList.toggle("active", isDocked);
    }
    if (landingSpot) {
      var alpha = isDocked ? 1 : (isAttracting ? clamp((currentDockProgress - 0.18) / 0.82, 0, 1) : 0);
      landingSpot.setAttribute("stroke", "rgba(223,44,44," + (alpha * 0.6) + ")");
      landingSpot.setAttribute("fill", "rgba(223,44,44," + (alpha * 0.1) + ")");
    }
    if (fieldStatusTimer) return;
    resetSceneStatus();
  }

  function createSceneNode(tagName, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
    }
    return node;
  }

  function createCrowdPersonNode(style) {
    var group = createSceneNode("g", { "pointer-events": "none" });
    group.appendChild(createSceneNode("circle", { cx: "0", cy: "-24", r: "6", fill: style.skin }));
    group.appendChild(createSceneNode("ellipse", {
      cx: style.hairCx,
      cy: style.hairCy,
      rx: style.hairRx,
      ry: style.hairRy,
      fill: style.hair,
      opacity: ".6"
    }));
    group.appendChild(createSceneNode("rect", { x: "-5", y: "-18", width: "10", height: "16", rx: "2.5", fill: style.shirt }));
    group.appendChild(createSceneNode("line", { x1: "-3", y1: "-2", x2: "-5", y2: "10", stroke: style.limbs, "stroke-width": "3", "stroke-linecap": "round" }));
    group.appendChild(createSceneNode("line", { x1: "3", y1: "-2", x2: "5", y2: "10", stroke: style.limbs, "stroke-width": "3", "stroke-linecap": "round" }));
    group.appendChild(createSceneNode("line", { x1: "-5", y1: "-14", x2: "-8", y2: "-4", stroke: style.shirt, "stroke-width": "2.5", "stroke-linecap": "round" }));
    group.appendChild(createSceneNode("line", { x1: "5", y1: "-14", x2: "8", y2: "-4", stroke: style.shirt, "stroke-width": "2.5", "stroke-linecap": "round" }));
    if (style.bag) group.appendChild(createSceneNode("rect", { x: "4", y: "-12", width: "5", height: "8", rx: ".5", fill: style.bag }));
    return group;
  }

  function applyAirshipPalette(airship) {
    if (!airship || !airship.model || !airship.model.model) return;
    var materials = airship.model.model.materials || [];
    if (!materials.length || typeof airship.model.createTexture !== "function") return;
    var baseColorTexture = materials[0].pbrMetallicRoughness && materials[0].pbrMetallicRoughness.baseColorTexture;
    if (!baseColorTexture || !airship.palettePath) return;
    var textureToken = (airship.textureToken || 0) + 1;
    airship.textureToken = textureToken;
    airship.model.createTexture(airship.palettePath)
      .then(function (texture) {
        if (!texture || airship.textureToken !== textureToken) return;
        baseColorTexture.setTexture(texture);
      })
      .catch(function () {});
  }

  function positionAirship(airship, x, y, tilt) {
    if (!airship || !airship.node) return;
    var facing = airship.direction > 0 ? -1 : 1;
    airship.node.style.left = (((x - sceneViewBox.minX) / sceneViewBox.width) * 100).toFixed(3) + "%";
    airship.node.style.top = (((y - sceneViewBox.minY) / sceneViewBox.height) * 100).toFixed(3) + "%";
    airship.node.style.width = ((airship.width / sceneViewBox.width) * 100).toFixed(3) + "%";
    airship.node.style.height = ((airship.height / sceneViewBox.height) * 100).toFixed(3) + "%";
    airship.node.style.transform = "translate(-50%, -50%) scaleX(" + facing + ") rotate(" + (tilt * facing).toFixed(3) + "deg)";
  }

  function getAirshipCabinAnchor(airship) {
    if (!airship) return { x: 0, y: 0 };
    var cabinOffsetX = airship.width * 0.056 * (airship.direction > 0 ? -1 : 1);
    return {
      x: airship.x + cabinOffsetX,
      y: airship.baseY + airship.height * 0.268
    };
  }

  function getCrimsonBeamOffsetX(airship) {
    if (!airship) return 0;
    var beamRatio = airship.direction > 0 ? 0.415 : 0.585;
    return (beamRatio - 0.5) * airship.width;
  }

  function getCrimsonBeamCenterX(airship) {
    return airship ? airship.x + getCrimsonBeamOffsetX(airship) : 0;
  }

  function getCrimsonHoldX(airship, targetX) {
    return (targetX == null ? reggieTargetX : targetX) - getCrimsonBeamOffsetX(airship);
  }

  function getPersonPose(person, fallbackX, fallbackY) {
    if (!person) return { x: fallbackX, y: fallbackY };
    var current = person.getAttribute("transform");
    var match = current && current.match(/translate\(([-\d.]+),([-\d.]+)/);
    return {
      x: match ? parseFloat(match[1]) : fallbackX,
      y: match ? parseFloat(match[2]) : fallbackY
    };
  }

  function setPersonPose(person, x, y, scale) {
    if (!person) return;
    var transform = "translate(" + x.toFixed(3) + "," + y.toFixed(3) + ")";
    if (scale != null && Math.abs(scale - 1) > 0.001) transform += " scale(" + scale.toFixed(3) + ")";
    person.setAttribute("transform", transform);
  }

  function clearCrimsonBeam(airship) {
    if (!airship || !airship.node) return;
    airship.node.classList.remove("is-beaming");
    airship.node.style.removeProperty("--beam-length");
  }

  function setCrimsonBeamTarget(airship, targetSceneY) {
    if (!airship || !airship.beam || !sceneWrap) return;
    var anchor = getAirshipCabinAnchor(airship);
    var sceneHeightPx = sceneWrap.clientHeight || sceneWrap.getBoundingClientRect().height || 0;
    var beamLength = Math.max(0, ((targetSceneY - anchor.y) / sceneViewBox.height) * sceneHeightPx);
    if (beamLength < 8) {
      clearCrimsonBeam(airship);
      return;
    }
    airship.node.style.setProperty("--beam-length", beamLength.toFixed(1) + "px");
    airship.node.classList.add("is-beaming");
  }

  function finishCrimsonPass() {
    crimsonAirshipActive = false;
    reggieLiftState = null;
    if (sceneStatus && isDocked) {
      sceneStatus.textContent = "RED FLAG AIRSHIP DEPARTED - REGGIE REMOVED FROM FIELD";
      sceneStatus.classList.add("show");
      queueSceneStatusReset(2600);
    }
  }

  function startCrimsonAbduction(airship) {
    if (!airship || !airship.special || !person4 || reggieLiftState || reggieAbducted || !isDocked || !reggieArrived) return;
    var reggiePose = getPersonPose(person4, reggieTargetX, reggieSceneY);
    stopReggieQuotes();
    reggieAbducted = true;
    reggieLiftState = {
      airship: airship,
      startAt: performance.now(),
      startX: reggiePose.x,
      startY: reggiePose.y
    };
    if (sceneStatus) {
      sceneStatus.textContent = "TRACTOR BEAM ENGAGED - REGGIE TRANSFER IN PROGRESS";
      sceneStatus.classList.add("show");
    }
  }

  function updateCrimsonAbduction(now) {
    if (!reggieLiftState || !person4) return;
    var airship = reggieLiftState.airship;
    if (!airship || !airship.node) {
      reggieLiftState = null;
      return;
    }
    var anchor = getAirshipCabinAnchor(airship);
    var beamCenterX = getCrimsonBeamCenterX(airship);
    var progress = clamp((now - reggieLiftState.startAt) / 2050, 0, 1);
    var eased = smoothstep(progress);
    var liftTargetY = anchor.y + 6;
    var currentX = reggieLiftState.startX + (beamCenterX - reggieLiftState.startX) * eased;
    var currentY = reggieLiftState.startY + (liftTargetY - reggieLiftState.startY) * eased;
    var scale = 1 - eased * 0.82;
    setPersonPose(person4, currentX, currentY, scale);
    person4.setAttribute("opacity", (1 - eased * 0.96).toFixed(3));
    setCrimsonBeamTarget(airship, currentY - 16);
    if (progress < 1) return;
    person4.setAttribute("opacity", "0");
    clearCrimsonBeam(airship);
    reggieLiftState = null;
    airship.departing = true;
    airship.exitSpeedBoost = 1.82;
    airship.direction = -1;
    if (sceneStatus) {
      sceneStatus.textContent = "REGGIE ACQUIRED - RED FLAG AIRSHIP EXITING";
      sceneStatus.classList.add("show");
      queueSceneStatusReset(2400);
    }
  }

  function createAirshipNode(config) {
    if (!airshipDomLayer) return null;
    var node = document.createElement("div");
    var beam = null;
    var model = document.createElement("img");
    node.className = "scene-airship";
    if (config.special) node.classList.add("scene-airship--crimson");
    if (config.special) {
      beam = document.createElement("div");
      beam.className = "scene-airship__beam";
      beam.setAttribute("aria-hidden", "true");
      node.appendChild(beam);
    }
    model.className = "scene-airship__model";
    model.setAttribute("alt", "");
    model.setAttribute("aria-hidden", "true");
    model.decoding = "async";
    model.loading = "eager";
    model.style.opacity = "1";
    var spritePath = airshipSpritePaths[config.palette] || airshipSpritePaths.classic;
    var spriteWidth = Math.round(config.height * airshipSpriteAspectRatio);
    var airship = {
      node: node,
      model: model,
      x: config.x,
      baseY: config.baseY,
      width: spriteWidth,
      height: config.height,
      speed: config.speed,
      direction: config.direction || -1,
      phase: config.phase,
      floatY: config.floatY,
      tilt: config.tilt,
      special: !!config.special,
      beam: beam,
      departing: false,
      exitSpeedBoost: 1,
      spritePath: spritePath
    };
    node.appendChild(model);
    airshipDomLayer.appendChild(node);
    model.setAttribute("src", spritePath);
    positionAirship(airship, airship.x, airship.baseY, 0);
    return airship;
  }

  function clearAirships() {
    lastAirshipTickAt = 0;
    airshipClock = Math.random() * 7000;
    while (airships.length) {
      var airship = airships.pop();
      if (airship && airship.node && airship.node.parentNode) airship.node.parentNode.removeChild(airship.node);
    }
  }

  function ensureAirships() {
    if (!airshipDomLayer || airships.length) return;
    if (crimsonAirshipActive) {
      var crimsonAirship = createAirshipNode(crimsonAirshipBlueprint);
      if (crimsonAirship) airships.push(crimsonAirship);
      return;
    }
    for (var i = 0; i < baseAirshipCount; i++) {
      var airship = createAirshipNode(airshipBlueprints[i]);
      if (airship) airships.push(airship);
    }
  }

  function spawnAirship() {
    if (!airshipDomLayer) return;
    if (crimsonAirshipActive) return;
    if (!airships.length) ensureAirships();
    if (airships.length >= airshipBlueprints.length) return;
    var airship = createAirshipNode(airshipBlueprints[airships.length]);
    if (airship) airships.push(airship);
  }

  function trimFieldPressWindow(now) {
    while (fieldPressWindow.length && now - fieldPressWindow[0] > crimsonPressWindowMs) fieldPressWindow.shift();
  }

  function hasCrimsonAirship() {
    for (var i = 0; i < airships.length; i++) {
      if (airships[i] && airships[i].special) return true;
    }
    return false;
  }

  function sendAirshipsOffscreen() {
    var centerX = sceneViewBox.minX + sceneViewBox.width / 2;
    for (var i = 0; i < airships.length; i++) {
      var airship = airships[i];
      if (!airship || airship.special) continue;
      airship.departing = true;
      airship.direction = airship.x < centerX ? -1 : 1;
      airship.exitSpeedBoost = 4.1;
    }
  }

  function activateCrimsonAirship() {
    if (crimsonAirshipActive || crimsonEventConsumed) return;
    crimsonAirshipActive = true;
    crimsonEventConsumed = true;
    sendAirshipsOffscreen();
    if (!hasCrimsonAirship()) {
      var crimsonAirship = createAirshipNode(crimsonAirshipBlueprint);
      if (crimsonAirship) airships.push(crimsonAirship);
    }
    if (sceneStatus) {
      sceneStatus.textContent = "PRESS SURGE VERIFIED - RED FLAG AIRSHIP DEPLOYED";
      sceneStatus.classList.add("show");
      queueSceneStatusReset(2200);
    }
  }

  function blinkCrimsonAirship() {
    if (!crimsonAirshipActive) return;
    for (var i = 0; i < airships.length; i++) {
      var airship = airships[i];
      if (!airship || !airship.special || !airship.node) continue;
      transient("crimsonAirshipBlink", airship.node, "is-blinking", 540, true);
    }
  }

  function registerFieldPress(now) {
    fieldPressWindow.push(now);
    trimFieldPressWindow(now);
    if (!crimsonAirshipActive && !crimsonEventConsumed && fieldPressWindow.length >= crimsonPressThreshold) activateCrimsonAirship();
  }

  function resetAirships() {
    crimsonAirshipActive = false;
    crimsonEventConsumed = false;
    reggieAbducted = false;
    reggieLiftState = null;
    fieldPressWindow.length = 0;
    clearAirships();
    ensureAirships();
  }

  function updateAirships() {
    if (!airships.length) return;
    var now = performance.now();
    if (!lastAirshipTickAt) lastAirshipTickAt = now;
    var dt = clamp(now - lastAirshipTickAt, 10, 40);
    var motionScale = reducedMotion ? 0.3 : 1;
    lastAirshipTickAt = now;
    airshipClock += dt;
    for (var i = 0; i < airships.length; i++) {
      var airship = airships[i];
      var speed = airship.speed * (airship.departing ? airship.exitSpeedBoost : 1);
      if (airship.special && !airship.departing) {
        var reggiePose = getPersonPose(person4, reggieTargetX, reggieSceneY);
        var holdX = getCrimsonHoldX(airship, reggiePose.x);
        if (airship.direction < 0) {
          airship.x = Math.max(holdX, airship.x + speed * airship.direction * dt * 0.026 * motionScale);
        } else {
          airship.x = Math.min(holdX, airship.x + speed * airship.direction * dt * 0.026 * motionScale);
        }
        if (Math.abs(airship.x - holdX) < 0.001) {
          if (!reggieLiftState && !reggieAbducted && reggieArrived) startCrimsonAbduction(airship);
          if (reggieLiftState && reggieLiftState.airship === airship) updateCrimsonAbduction(now);
          positionAirship(airship, airship.x, airship.baseY, 0);
          continue;
        }
        clearCrimsonBeam(airship);
      } else {
        airship.x += speed * airship.direction * dt * 0.026 * motionScale;
      }
      if (airship.direction > 0 && airship.x > sceneViewBox.minX + sceneViewBox.width + airship.width * 0.72) {
        if (airship.departing) {
          if (airship.special) finishCrimsonPass();
          if (airship.node && airship.node.parentNode) airship.node.parentNode.removeChild(airship.node);
          airships.splice(i, 1);
          i--;
          continue;
        }
        airship.x = sceneViewBox.minX - airship.width * (0.9 + Math.random() * 0.7);
      } else if (airship.direction < 0 && airship.x < sceneViewBox.minX - airship.width * 0.72) {
        if (airship.departing) {
          if (airship.special) finishCrimsonPass();
          if (airship.node && airship.node.parentNode) airship.node.parentNode.removeChild(airship.node);
          airships.splice(i, 1);
          i--;
          continue;
        }
        airship.x = sceneViewBox.minX + sceneViewBox.width + airship.width * (0.9 + Math.random() * 0.7);
      }
      positionAirship(airship, airship.x, airship.baseY, 0);
    }
  }

  function resetCrowdPeople() {
    while (crowdPeople.length) {
      var crowdPerson = crowdPeople.pop();
      if (crowdPerson.node && crowdPerson.node.parentNode) crowdPerson.node.parentNode.removeChild(crowdPerson.node);
    }
  }

  function spawnCrowdPerson() {
    if (!sceneSvg || !isDocked) return;
    if (crowdPeople.length >= crowdSlots.length) return;
    var slot = crowdSlots[crowdPeople.length];
    var style = crowdStyles[crowdPeople.length % crowdStyles.length];
    var node = createCrowdPersonNode(style);
    var startX = slot.x < 500 ? 28 + Math.random() * 36 : 896 - Math.random() * 36;
    var startY = 338 + (Math.random() - 0.5) * 10;
    var scale = style.scale + ((crowdPeople.length % 3) - 1) * 0.03;
    sceneSvg.insertBefore(node, person1 || landingSpot || null);
    crowdPeople.push({
      node: node,
      x: startX,
      y: startY,
      targetX: slot.x,
      targetY: slot.y,
      speed: 1.05 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      scale: clamp(scale, 0.84, 1.04)
    });
  }

  function updateCrowdPeople() {
    for (var i = 0; i < crowdPeople.length; i++) {
      var crowdPerson = crowdPeople[i];
      var dx = crowdPerson.targetX - crowdPerson.x;
      var dy = crowdPerson.targetY - crowdPerson.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.8) {
        var step = Math.min(crowdPerson.speed, dist);
        crowdPerson.x += dx / dist * step;
        crowdPerson.y += dy / dist * step;
        crowdPerson.phase += 0.25;
      } else {
        crowdPerson.phase += 0.04;
      }
      var bob = dist > 0.8 ? Math.abs(Math.sin(crowdPerson.phase)) * 0.8 : Math.sin(crowdPerson.phase) * 0.35;
      crowdPerson.node.setAttribute(
        "transform",
        "translate(" + crowdPerson.x.toFixed(1) + "," + (crowdPerson.y + bob).toFixed(1) + ") scale(" + crowdPerson.scale.toFixed(2) + ")"
      );
    }
  }

  function resetSceneStatus() {
    if (!sceneStatus) return;
    if (isDocked) {
      sceneStatus.textContent = crimsonAirshipActive
        ? "RED FLAG AIRSHIP OVERHEAD - PRESS WINDOW SATURATED"
        : "FIELD UNIT ACTIVE - AWAITING PRESSES";
      sceneStatus.classList.add("show");
    } else if (sceneAttractionActive && currentDockProgress > 0.08) {
      sceneStatus.textContent = "FIELD UNIT DEPLOYING... " + Math.round(currentDockProgress * 100) + "%";
      sceneStatus.classList.add("show");
    } else if (!sceneAttractionActive && currentDockProgress > 0.08) {
      sceneStatus.textContent = "FIELD UNIT RETRACTING...";
      sceneStatus.classList.add("show");
    } else {
      sceneStatus.classList.remove("show");
    }
  }

  function queueSceneStatusReset(ms) {
    if (fieldStatusTimer) clearTimeout(fieldStatusTimer);
    fieldStatusTimer = setTimeout(function () {
      fieldStatusTimer = null;
      resetSceneStatus();
    }, ms);
  }

  function finalizeDock() {
    if (!pedestal || !sceneWrap || isDocked) return;
    var absolute = getDockAbsolutePos();
    if (!absolute) return;
    isDocked = true;
    isUndocking = false;
    capturedFloatPos = null;
    sceneWrap.appendChild(pedestal);
    pedestal.classList.remove("undocking");
    pedestal.classList.add("docked");
    pedestal.style.position = "absolute";
    pedestal.style.left = absolute.left + "px";
    pedestal.style.top = absolute.top + "px";
    pedestal.style.width = absolute.width + "px";
    pedestal.style.height = absolute.height + "px";
    pedestal.style.transform = "rotate(0deg)";
    pedestal.style.filter = "";
    syncSceneDockHalo();
    if (miniDash) miniDash.classList.add("visible");
    if (fieldCaption) fieldCaption.textContent = "Button deployed. Press it here, then inspect the live telemetry in Switch Lab below.";
    if (fieldStatusTimer) {
      clearTimeout(fieldStatusTimer);
      fieldStatusTimer = null;
    }
    resetSceneStatus();
    animateCuriosity();
  }

  function releaseDockToFloat() {
    if (!pedestal || !isDocked) return;
    var rect = pedestal.getBoundingClientRect();
    ensureFloatingHost();
    pedestal.classList.remove("docked");
    pedestal.classList.remove("undocking");
    pedestal.style.position = "fixed";
    pedestal.style.left = "0";
    pedestal.style.top = "0";
    pedestal.style.transform = "translate(" + rect.left + "px, " + rect.top + "px) rotate(0deg)";
    pedestal.style.width = rect.width + "px";
    pedestal.style.height = rect.height + "px";
    if (!pedestal.classList.contains("pressed-glow")) pedestal.style.filter = "";
    pedestalScreenPose.x = rect.left;
    pedestalScreenPose.y = rect.top;
    pedestalScreenPose.rot = 0;
    pedestalScreenPose.width = rect.width;
    pedestalScreenPose.height = rect.height;
    pedestalScreenPose.initialized = true;
    isDocked = false;
    isUndocking = false;
    capturedFloatPos = null;
    if (fieldStatusTimer) {
      clearTimeout(fieldStatusTimer);
      fieldStatusTimer = null;
    }
    if (sceneDockHalo) sceneDockHalo.classList.remove("active");
    if (fieldCaption) fieldCaption.textContent = "Scroll this section into view to deploy the field unit.";
    resetPeople();
  }

  function updatePedestalFreeMotion(isAttracting, dt) {
    if (!pedestal) return;
    var home = getHomeScreenPose();
    var dock = getDockPose();
    ensurePedestalScreenPose(home);
    var target = isAttracting && dock ? dock : home;
    var moveFactor = getFrameSmoothing(isAttracting ? 0.1 : 0.08, dt);
    var sizeFactor = getFrameSmoothing(isAttracting ? 0.12 : 0.09, dt);
    var rotFactor = getFrameSmoothing(isAttracting ? 0.14 : 0.1, dt);
    pedestalScreenPose.x += (target.x - pedestalScreenPose.x) * moveFactor;
    pedestalScreenPose.y += (target.y - pedestalScreenPose.y) * moveFactor;
    pedestalScreenPose.width += (target.width - pedestalScreenPose.width) * sizeFactor;
    pedestalScreenPose.height += (target.height - pedestalScreenPose.height) * sizeFactor;
    pedestalScreenPose.rot += (target.rot - pedestalScreenPose.rot) * rotFactor;
    if (dock) {
      var totalDistance = Math.max(1, getPoseDistance(home, dock));
      currentDockProgress = clamp(1 - getPoseDistance(pedestalScreenPose, dock) / totalDistance, 0, 1);
    } else {
      currentDockProgress = 0;
    }
    applyPedestalScreenPose();
    updateFieldDeploymentUI(isAttracting);
    if (isAttracting && dock && getPoseDistance(pedestalScreenPose, dock) < 1.8) finalizeDock();
  }

  function animateCuriosity() {
    if (!person2 && !person4) return;
    if (curiosityTimer) clearTimeout(curiosityTimer);
    curiosityTimer = setTimeout(function () {
      if (!isDocked) return;
      startReggieQuotes();
      var startedAt = performance.now();
      function step(now) {
        if (!isDocked) return;
        var curiosityEased = smoothstep(clamp((now - startedAt) / 2200, 0, 1));
        var reggieEased = smoothstep(clamp((now - startedAt - 420) / 2400, 0, 1));
        if (person2) person2.setAttribute("transform", "translate(" + (curiosityHomeX + (curiosityTargetX - curiosityHomeX) * curiosityEased) + ",332)");
        if (person4) person4.setAttribute("transform", "translate(" + (reggieHomeX + (reggieTargetX - reggieHomeX) * reggieEased) + ",332)");
        if (reggieEased >= 1 && !reggieArrived) {
          reggieArrived = true;
          showReggieQuoteNow();
        }
        if (curiosityEased < 1 || reggieEased < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, 600);
  }

  function resetPeople() {
    if (!person2 && !person4) return;
    if (curiosityTimer) {
      clearTimeout(curiosityTimer);
      curiosityTimer = null;
    }
    stopReggieQuotes();
    reggieAbducted = false;
    reggieLiftState = null;
    resetCrowdPeople();
    resetAirships();
    var current2 = person2 && person2.getAttribute("transform");
    var match2 = current2 && current2.match(/translate\(([\d.]+)/);
    var person2StartX = match2 ? parseFloat(match2[1]) : curiosityHomeX;
    var current4 = person4 && person4.getAttribute("transform");
    var match4 = current4 && current4.match(/translate\(([\d.]+)/);
    var person4StartX = match4 ? parseFloat(match4[1]) : reggieHomeX;
    if (person4) person4.setAttribute("opacity", "1");
    var startedAt = performance.now();
    function step(now) {
      var eased = smoothstep(clamp((now - startedAt) / 800, 0, 1));
      if (person2) person2.setAttribute("transform", "translate(" + (person2StartX + (curiosityHomeX - person2StartX) * eased) + "," + reggieSceneY + ")");
      if (person4) setPersonPose(person4, person4StartX + (reggieHomeX - person4StartX) * eased, reggieSceneY, 1);
      if (eased < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function getPersonX(person, fallback) {
    if (!person) return fallback;
    var current = person.getAttribute("transform");
    var match = current && current.match(/translate\(([\d.]+)/);
    return match ? parseFloat(match[1]) : fallback;
  }

  function isReggieNearButton() {
    return getPersonX(person4, reggieHomeX) <= reggieTargetX + 28;
  }

  function setReggieBubbleVisible(visible) {
    if (!person4Bubble) return;
    person4Bubble.setAttribute("display", visible ? "inline" : "none");
    person4Bubble.setAttribute("opacity", visible ? "1" : "0");
  }

  function updateReggieBubbleLayout() {
    if (!person4Bubble) return;
    if (window.innerWidth <= 650) {
      person4Bubble.setAttribute("transform", "translate(-20,-20) scale(1.22)");
    } else {
      person4Bubble.setAttribute("transform", "translate(0,0) scale(1)");
    }
  }

  function renderReggieQuote(text) {
    if (!person4Quote) return;
    while (person4Quote.firstChild) person4Quote.removeChild(person4Quote.firstChild);
    var words = String(text || "").split(/\s+/);
    var lines = [];
    var currentLine = "";
    var lineX = window.innerWidth <= 650 ? "39" : "40";
    var lineStep = window.innerWidth <= 650 ? "12" : "13";
    var maxLineWidth = window.innerWidth <= 650 ? 172 : 206;
    var maxLines = window.innerWidth <= 650 ? 6 : 5;
    var measure = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    measure.setAttribute("x", lineX);
    person4Quote.appendChild(measure);

    function fits(textLine) {
      measure.textContent = textLine;
      return measure.getComputedTextLength() <= maxLineWidth;
    }

    for (var i = 0; i < words.length; i++) {
      var candidate = currentLine ? currentLine + " " + words[i] : words[i];
      if (currentLine && !fits(candidate)) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) lines.push(currentLine);
    while (lines.length > maxLines) {
      lines[lines.length - 2] += " " + lines[lines.length - 1];
      lines.pop();
    }
    person4Quote.removeChild(measure);
    for (var j = 0; j < lines.length; j++) {
      var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspan.setAttribute("x", lineX);
      tspan.setAttribute("dy", j === 0 ? "0" : lineStep);
      tspan.textContent = lines[j];
      person4Quote.appendChild(tspan);
    }
  }

  function setReggieQuote() {
    if (!person4Quote || !reggieQuotes.length) return;
    var nextIndex = Math.floor(Math.random() * reggieQuotes.length);
    if (reggieQuotes.length > 1 && nextIndex === reggieQuoteIndex) nextIndex = (nextIndex + 1) % reggieQuotes.length;
    reggieQuoteIndex = nextIndex;
    renderReggieQuote(reggieQuotes[nextIndex]);
  }

  function startReggieQuotes() {
    if (!person4Quote || !reggieQuotes.length) return;
    stopReggieQuotes();
    reggieArrived = false;
  }

  function stopReggieQuotes() {
    if (reggieQuoteTimer) {
      clearTimeout(reggieQuoteTimer);
      reggieQuoteTimer = null;
    }
    reggieArrived = false;
    setReggieBubbleVisible(false);
  }

  function showReggieQuoteNow() {
    if (!person4Quote || !reggieQuotes.length || !isDocked || !reggieArrived || reggieAbducted) return;
    if (reggieQuoteTimer) {
      clearTimeout(reggieQuoteTimer);
      reggieQuoteTimer = null;
    }
    setReggieQuote();
    setReggieBubbleVisible(true);
  }

  function queueReggieQuote(delay) {
    if (!person4Quote || !reggieQuotes.length || reggieAbducted) return;
    if (reggieQuoteTimer) clearTimeout(reggieQuoteTimer);
    reggieQuoteTimer = setTimeout(function () {
      reggieQuoteTimer = null;
      if (!isDocked || !reggieArrived || reggieAbducted) return;
      showReggieQuoteNow();
    }, delay);
  }

  function interruptReggieQuote() {
    if (!isDocked || !reggieArrived || reggieAbducted) return;
    if (reggieQuoteTimer) {
      clearTimeout(reggieQuoteTimer);
      reggieQuoteTimer = null;
    }
    setReggieBubbleVisible(false);
    queueReggieQuote(60000);
  }

  function walkPeople() {
    walkPhase += 0.3;
    updateAirships();
    if (person1) person1.setAttribute("transform", "translate(" + ((((walkPhase * 0.8) % 1060) - 50)) + ",332)");
    if (person3) person3.setAttribute("transform", "translate(" + (1010 - ((walkPhase * 0.5) % 1060)) + ",332)");
    if (person2 && !isDocked) person2.setAttribute("transform", "translate(" + curiosityHomeX + ",332)");
    if (person4 && !isDocked) {
      person4.setAttribute("opacity", "1");
      setPersonPose(person4, reggieHomeX, reggieSceneY, 1);
    }
    updateCrowdPeople();
    requestAnimationFrame(walkPeople);
  }

  function renderPedestalLoop(now) {
    if (!now) now = performance.now();
    if (!lastPedestalLoopAt) lastPedestalLoopAt = now;
    var dt = clamp(now - lastPedestalLoopAt, 8, 48);
    lastPedestalLoopAt = now;
    if (!lastWaveSampleAt || now - lastWaveSampleAt >= 32) {
      waveData.push(consumeWaveSample());
      trimData();
      lastWaveSampleAt = now;
    }
    tickFloatState();
    var isAttracting = shouldAttractToScene();
    if (reducedMotion) {
      currentDockProgress = isAttracting ? 1 : 0;
      if (isAttracting) {
        if (!isDocked) finalizeDock();
        if (pedestal) {
          var reducedAbsolute = getDockAbsolutePos();
          if (reducedAbsolute) {
            pedestal.style.left = reducedAbsolute.left + "px";
            pedestal.style.top = reducedAbsolute.top + "px";
            pedestal.style.width = reducedAbsolute.width + "px";
            pedestal.style.height = reducedAbsolute.height + "px";
          }
        }
      } else {
        if (isDocked) releaseDockToFloat();
        var homePose = getHomeScreenPose();
        pedestalScreenPose.x = homePose.x;
        pedestalScreenPose.y = homePose.y;
        pedestalScreenPose.rot = homePose.rot;
        pedestalScreenPose.width = homePose.width;
        pedestalScreenPose.height = homePose.height;
        pedestalScreenPose.initialized = true;
        applyPedestalScreenPose();
      }
      updateFieldDeploymentUI(isAttracting);
      requestAnimationFrame(renderPedestalLoop);
      return;
    }
    if (isDocked) {
      if (!isAttracting) {
        releaseDockToFloat();
      } else if (pedestal) {
        currentDockProgress = 1;
        var absolute = getDockAbsolutePos();
        if (absolute) {
          bobPhase += 0.025;
          pedestal.style.left = absolute.left + "px";
          pedestal.style.top = (absolute.top + Math.sin(bobPhase) * 1.2) + "px";
          pedestal.style.width = absolute.width + "px";
          pedestal.style.height = absolute.height + "px";
        }
        updateFieldDeploymentUI(true);
      }
    }
    if (!isDocked) updatePedestalFreeMotion(isAttracting, dt);
    requestAnimationFrame(renderPedestalLoop);
  }

  function getPedestalCenter() {
    if (!pedestal) return { x: window.innerWidth / 2, y: Math.max(70, window.innerHeight * 0.25) };
    var rect = pedestal.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.22 };
  }

  function spawnPedestalSparkles(cx, cy, countValue) {
    for (var i = 0; i < countValue; i++) {
      var sparkle = document.createElement("div");
      sparkle.className = "sparkle";
      var angle = (Math.PI * 2 / countValue) * i + (Math.random() - 0.5) * 0.5;
      var dist = 20 + Math.random() * 50;
      sparkle.style.left = cx + "px";
      sparkle.style.top = cy + "px";
      sparkle.style.setProperty("--sx", Math.cos(angle) * dist + "px");
      sparkle.style.setProperty("--sy", Math.sin(angle) * dist - 14 + "px");
      sparkle.style.width = (2 + Math.random() * 4) + "px";
      sparkle.style.height = sparkle.style.width;
      sparkle.style.background = ["#ff4444", "#ff7744", "#ffaa44", "#df2c2c"][Math.floor(Math.random() * 4)];
      document.body.appendChild(sparkle);
      void sparkle.offsetWidth;
      sparkle.classList.add("go");
      (function (node) { setTimeout(function () { node.remove(); }, 800); })(sparkle);
    }
  }

  function nudgeEntropy(store) {
    for (var i = 0; i < store.length; i++) {
      store[i].vx += (Math.random() - 0.5) * 6;
      store[i].vy += (Math.random() - 0.5) * 6;
    }
  }

  function addBurstSample(now) {
    var elapsed = (now - sessionStart) / 1000;
    var index = clamp(Math.floor(((elapsed % burstWindowSec) / burstWindowSec) * burstBins.length), 0, burstBins.length - 1);
    burstBins[index] += 1;
  }

  function queueWaveSamples(samples) {
    if (!samples || !samples.length) return;
    var limit = 42;
    var usable = Math.min(samples.length, limit);
    while (waveInjectionQueue.length < usable) waveInjectionQueue.push(0);
    for (var i = 0; i < usable; i++) {
      var mixed = (Number(waveInjectionQueue[i]) || 0) + (Number(samples[i]) || 0);
      waveInjectionQueue[i] = clamp(mixed, -2.5, 2.5);
    }
    if (waveInjectionQueue.length > limit) waveInjectionQueue.length = limit;
  }

  function consumeWaveSample() {
    var injected = 0;
    if (waveInjectionQueue.length) injected = Number(waveInjectionQueue.shift()) || 0;
    return clamp(pedestalMotionValue + injected, -2.5, 2.5);
  }

  function injectWaveFromHold(holdMs) {
    var clamped = clamp(holdMs, 40, 1600);
    var norm = (clamped - 40) / 1560;
    var family = activeSwitchProfile && activeSwitchProfile.family ? activeSwitchProfile.family : "linear";
    var familyRinging = family === "clicky" ? 1 : family === "tactile" ? 0.58 : 0.24;
    var wavePeakFactor = clamp(getSwitchProfileNumber("telemetryProfile", "wavePeak", 1), 0.72, 1.7);
    var waveTailFactor = clamp(getSwitchProfileNumber("telemetryProfile", "waveTail", 0.42), 0.22, 0.72);
    var clickiness = clamp(getSwitchProfileNumber("soundProfile", "clickiness", 0.12), 0, 1);
    var travelDepth = clamp(getSwitchProfileNumber("animationProfile", "travelDepth", 0.72), 0.55, 0.94);
    var peak = clamp((0.7 + norm * 0.66 + travelDepth * 0.28 + clickiness * 0.12) * wavePeakFactor, 0.55, 2.35);
    var tailCount = 5 + Math.round(norm * 4 + waveTailFactor * 9 + familyRinging * 6);
    var freq = 0.7 + norm * 0.18 + clickiness * 0.74 + familyRinging * 0.18;
    var decayBase = clamp(0.5 - waveTailFactor * 0.22 - familyRinging * 0.12 + (0.12 - clickiness * 0.06), 0.11, 0.44);
    var initialPeak = peak * (0.84 + familyRinging * 0.18);
    var recoil = -peak * (0.05 + familyRinging * 0.1 + clickiness * 0.05);
    var queuedSamples = [
      initialPeak * 0.46,
      initialPeak * 0.78,
      initialPeak
    ];
    if (Math.abs(recoil) > 0.035) queuedSamples.push(recoil);
    for (var i = 0; i < tailCount; i++) {
      var step = i + 1;
      var ring = Math.sin(step * freq) *
        Math.exp(-step * decayBase) *
        peak *
        (0.18 + familyRinging * 0.48 + clickiness * 0.08);
      var body = Math.exp(-Math.pow((step - (1.7 + waveTailFactor * 4.5)) / (1.8 + (1 - familyRinging) * 2.4), 2)) *
        peak *
        (0.05 + waveTailFactor * 0.18 + travelDepth * 0.08);
      var sample = ring + body;
      if (family === "linear") sample *= 0.88;
      if (family === "clicky" && step < 4) sample += peak * 0.05;
      queuedSamples.push(sample);
    }
    queueWaveSamples(queuedSamples);
  }

  function runPedestalEffects() {
    if (!pedestal) return;
    var center = getPedestalCenter();
    transient("pedGlow", pedestal, "pressed-glow", 420, false);
    if (sceneDockHalo && isDocked) {
      syncSceneDockHalo();
      transient("sceneDockHaloPulse", sceneDockHalo, "pulse", 520, true);
    }
    if (pedestalShockwave) {
      pedestalShockwave.style.left = center.x + "px";
      pedestalShockwave.style.top = center.y + "px";
      pedestalShockwave.classList.remove("go");
      void pedestalShockwave.offsetWidth;
      pedestalShockwave.classList.add("go");
    }
    spawnPedestalSparkles(center.x, center.y, isDocked ? 8 : 14);
    spawnParticles(center.x, center.y, 10);
  }

  function getButtonCenter() {
    if (!btn) return { x: window.innerWidth / 2, y: Math.max(70, window.innerHeight * 0.25) };
    var rect = btn.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function handlePress(holdMs, source) {
    var now = Date.now();
    var effectiveHoldMs = getEffectiveHoldMs(holdMs);
    count++;
    pressTimestamps.push(now);
    if (pressTimestamps.length > 1) intervals.push(now - pressTimestamps[pressTimestamps.length - 2]);
    trimData();
    if (countEl) {
      countEl.textContent = count;
      transient("count", countEl, "bump", 200, true);
    }
    if (ripples.length) {
      var ring = ripples[rippleIdx % ripples.length];
      ring.classList.remove("animate");
      void ring.offsetWidth;
      ring.classList.add("animate");
      rippleIdx++;
    }
    transient("pressGlow", pressCol, "glow", 400, false);
    transient("labPulse", labPanel, "pulse", 500, false);
    transient("flash", flash, "flash", 120, true);
    pulseRedWords();
    var origin = source === "pedestal" ? getPedestalCenter() : getButtonCenter();
    spawnParticles(origin.x, origin.y, source === "pedestal" ? 10 : 14);
    addBurstSample(now);
    injectWaveFromHold(effectiveHoldMs);
    nudgeEntropy(entropyParticlesMain);
    nudgeEntropy(entropyParticlesMini);
    if (isDocked) spawnCrowdPerson();
    if (source === "pedestal" && isDocked) {
      interruptReggieQuote();
      registerFieldPress(now);
      if (crimsonAirshipActive) blinkCrimsonAirship();
    }
    if (source === "pedestal" && isDocked && sceneStatus) {
      fieldPressCount++;
      if (!crimsonAirshipActive) sceneStatus.textContent = "PRESS #" + fieldPressCount + " RECORDED - FIELD DATA LOGGED";
      sceneStatus.classList.add("show");
      queueSceneStatusReset(crimsonAirshipActive ? 2200 : 900);
    }
    if (isDocked && !crimsonAirshipActive) spawnAirship();
    updateStats();
  }

  var buttonActive = false;
  var buttonDownAt = 0;
  var buttonReleaseTimer = null;
  var pedestalActive = false;
  var pedestalDownAt = 0;
  var pedestalReleaseTimer = null;
  var activePointerId = null;
  var pedestalPointerId = null;
  var buttonTouchId = null;
  var lastTouchStart = 0;
  var pedestalLastTouchStart = 0;
  var pedestalTouchId = null;
  var minimumPressDurationMs = 48;
  var activeSwitchProfile = null;
  var SOUND_STORAGE_KEY = "brb.soundProfileId";
  var activeSoundProfile = null;
  var storedSoundProfileId = loadStoredSoundProfileId();
  var audioContext = null;
  var audioBufferPromises = Object.create(null);
  var audioDataPromises = Object.create(null);
  var lastSoundRuntimeError = null;

  function loadStoredSoundProfileId() {
    try {
      return window.localStorage.getItem(SOUND_STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function persistStoredSoundProfileId(id) {
    storedSoundProfileId = id || null;
    try {
      if (storedSoundProfileId) window.localStorage.setItem(SOUND_STORAGE_KEY, storedSoundProfileId);
      else window.localStorage.removeItem(SOUND_STORAGE_KEY);
    } catch (_) {}
  }

  function getAudioContext() {
    var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContext) audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended" && typeof audioContext.resume === "function") {
      try { audioContext.resume(); } catch (_) {}
    }
    return audioContext;
  }

  function decodeAudioDataCompat(context, arrayBuffer) {
    return new Promise(function (resolve, reject) {
      var settled = false;

      function finishResolve(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }

      function finishReject(error) {
        if (settled) return;
        settled = true;
        reject(error);
      }

      var result;
      try {
        result = context.decodeAudioData(arrayBuffer.slice(0), finishResolve, finishReject);
      } catch (error) {
        finishReject(error);
        return;
      }
      if (result && typeof result.then === "function") {
        result.then(finishResolve, finishReject);
      }
    });
  }

  function fetchAudioData(url) {
    if (audioDataPromises[url]) return audioDataPromises[url];
    audioDataPromises[url] = fetch(url, { cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Audio request failed for " + url + " (" + response.status + ")");
        }
        return response.arrayBuffer();
      })
      .catch(function (error) {
        delete audioDataPromises[url];
        throw error;
      });
    return audioDataPromises[url];
  }

  function loadAudioBuffer(url) {
    if (audioBufferPromises[url]) return audioBufferPromises[url];
    audioBufferPromises[url] = fetchAudioData(url).then(function (arrayBuffer) {
      var context = getAudioContext();
      if (!context) throw new Error("Web Audio API unavailable.");
      return decodeAudioDataCompat(context, arrayBuffer);
    }).catch(function (error) {
      delete audioBufferPromises[url];
      throw error;
    });
    return audioBufferPromises[url];
  }

  function startBufferPlayback(buffer, options) {
    var context = getAudioContext();
    if (!context) throw new Error("Web Audio API unavailable.");
    var source = context.createBufferSource();
    var gain = context.createGain();
    var offset = clamp(Number(options && options.offset) || 0, 0, Math.max(0, buffer.duration - 0.01));
    var duration = options && options.duration != null
      ? clamp(Number(options.duration) || 0.01, 0.01, Math.max(0.01, buffer.duration - offset))
      : Math.max(0.01, buffer.duration - offset);
    gain.gain.value = options && options.gain != null ? Number(options.gain) || 1 : 0.96;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0, offset, duration);
    return source;
  }

  function emitSoundRuntimeError(error, detail) {
    lastSoundRuntimeError = {
      message: error && error.message ? error.message : String(error || "Unknown sound error"),
      detail: detail || null
    };
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("brb:sound-runtime-error", {
        detail: lastSoundRuntimeError
      }));
    }
  }

  function chooseVariant(variants) {
    if (!variants) return null;
    if (!Array.isArray(variants)) return variants;
    if (!variants.length) return null;
    return variants[Math.floor(Math.random() * variants.length)];
  }

  function normalizeVariantEntry(entry) {
    if (!entry) return null;
    return typeof entry === "string" ? { path: entry } : entry;
  }

  function resolveSoundPhaseEntry(profile, phase) {
    var adapter = profile && profile.adapter ? profile.adapter : null;
    if (!adapter || !adapter.type) return null;
    if (adapter.type === "mechvibes-v1-slice-pack") {
      return phase === "release" ? adapter.release || adapter.press : adapter.press;
    }
    if (adapter.type === "mechvibes-v2-press-release-pack") {
      return normalizeVariantEntry(chooseVariant(phase === "release" ? adapter.release_variants : adapter.press_variants));
    }
    if (adapter.type === "mechvibes-file-map-pack") {
      return normalizeVariantEntry(chooseVariant(phase === "release" ? adapter.release_variants : adapter.press_variants));
    }
    if (adapter.type === "bucklespring-wav-pair") {
      return normalizeVariantEntry(chooseVariant(phase === "release" ? adapter.release_variants : adapter.press_variants));
    }
    return null;
  }

  function playResolvedSoundEntry(entry, detail) {
    if (!entry) return Promise.resolve(false);
    if (entry.asset_path && entry.offset_ms != null && entry.duration_ms != null) {
      return loadAudioBuffer(entry.asset_path).then(function (buffer) {
        startBufferPlayback(buffer, {
          offset: Number(entry.offset_ms) / 1000,
          duration: Number(entry.duration_ms) / 1000
        });
        return true;
      }).catch(function (error) {
        emitSoundRuntimeError(error, detail);
        return false;
      });
    }
    if (entry.path) {
      return loadAudioBuffer(entry.path).then(function (buffer) {
        startBufferPlayback(buffer);
        return true;
      }).catch(function (error) {
        emitSoundRuntimeError(error, detail);
        return false;
      });
    }
    return Promise.resolve(false);
  }

  function playSoundProfilePhase(profile, phase, options) {
    if (!profile) return Promise.resolve(false);
    var resolved = resolveSoundPhaseEntry(profile, phase);
    return playResolvedSoundEntry(resolved, {
      phase: phase,
      profileId: profile.id || null,
      source: options && options.source ? options.source : null
    });
  }

  function playActiveSoundPhase(phase, options) {
    return playSoundProfilePhase(activeSoundProfile, phase, options);
  }

  function previewSoundProfile(profile, holdMs, options) {
    var ms = clamp(Number(holdMs) || 120, 48, 320);
    var previewProfile = profile || activeSoundProfile;
    if (!previewProfile) return Promise.resolve(false);
    playSoundProfilePhase(previewProfile, "press", options || { source: "preview" });
    return new Promise(function (resolve) {
      setTimeout(function () {
        playSoundProfilePhase(previewProfile, "release", options || { source: "preview" }).then(function (played) {
          resolve(Boolean(played));
        }, function () {
          resolve(false);
        });
      }, ms);
    });
  }

  function dispatchSoundProfileChange() {
    if (window.BRB) {
      window.BRB.activeSoundProfile = activeSoundProfile;
      window.BRB.activeSoundProfileId = storedSoundProfileId;
    }
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("brb:sound-profile-change", {
        detail: {
          profile: activeSoundProfile,
          id: storedSoundProfileId
        }
      }));
    }
  }

  function setActiveSoundProfile(profile, options) {
    options = options || {};
    activeSoundProfile = profile && typeof profile === "object" ? profile : null;
    if (!options.skipPersist) {
      persistStoredSoundProfileId(activeSoundProfile && activeSoundProfile.id ? activeSoundProfile.id : null);
    }
    dispatchSoundProfileChange();
    return activeSoundProfile;
  }

  function getSwitchProfileNumber(sectionName, key, fallback) {
    var section = activeSwitchProfile && activeSwitchProfile[sectionName];
    var value = section ? Number(section[key]) : NaN;
    return isFinite(value) ? value : fallback;
  }

  function getEffectiveHoldMs(holdMs) {
    var ms = clamp(Number(holdMs) || 120, 40, 1600);
    if (!activeSwitchProfile) return ms;
    var profileMs = getSwitchProfileNumber("animationProfile", "pressDurationMs", ms);
    return clamp(profileMs + (ms - 120) * 0.55, 40, 1600);
  }

  function getPedestalPressDuration(defaultMs) {
    return clamp(Math.round(getSwitchProfileNumber("animationProfile", "pressDurationMs", defaultMs)), 48, 240);
  }

  function getPedestalReturnDuration(defaultMs) {
    return clamp(Math.round(getSwitchProfileNumber("animationProfile", "returnDurationMs", defaultMs)), 48, 260);
  }

  function syncSwitchProfileStyles() {
    var root = document.documentElement;
    var body = document.body;
    var props = [
      "--brb-switch-press-ms",
      "--brb-switch-return-ms",
      "--brb-switch-hover-shift",
      "--brb-switch-press-shift",
      "--brb-switch-press-scale",
      "--brb-switch-pedestal-saturate",
      "--brb-switch-pedestal-brightness"
    ];
    var i;
    if (!root) return;
    if (!activeSwitchProfile) {
      for (i = 0; i < props.length; i++) root.style.removeProperty(props[i]);
      if (body) {
        body.classList.remove("switch-profile-active");
        body.removeAttribute("data-switch-family");
      }
      return;
    }
    var animation = activeSwitchProfile.animationProfile || {};
    var sound = activeSwitchProfile.soundProfile || {};
    var travelDepth = clamp(Number(animation.travelDepth) || 0.72, 0.55, 0.94);
    var clickiness = clamp(Number(sound.clickiness) || 0.12, 0, 1);
    var pressDuration = getPedestalPressDuration(120);
    var returnDuration = getPedestalReturnDuration(92);
    root.style.setProperty("--brb-switch-press-ms", pressDuration + "ms");
    root.style.setProperty("--brb-switch-return-ms", returnDuration + "ms");
    root.style.setProperty("--brb-switch-hover-shift", (1.2 + clickiness * 1.6).toFixed(2) + "px");
    root.style.setProperty("--brb-switch-press-shift", (1.6 + travelDepth * 2.6).toFixed(2) + "px");
    root.style.setProperty("--brb-switch-press-scale", clamp(0.992 - travelDepth * 0.04 - clickiness * 0.015, 0.935, 0.986).toFixed(3));
    root.style.setProperty("--brb-switch-pedestal-saturate", (1.01 + clickiness * 0.22).toFixed(3));
    root.style.setProperty("--brb-switch-pedestal-brightness", (0.985 - clickiness * 0.03).toFixed(3));
    if (body) {
      body.classList.add("switch-profile-active");
      body.setAttribute("data-switch-family", activeSwitchProfile.family || "linear");
    }
  }

  function setActiveSwitchProfile(profile) {
    activeSwitchProfile = profile && typeof profile === "object" ? profile : null;
    syncSwitchProfileStyles();
    if (window.BRB) window.BRB.activeSwitchProfile = activeSwitchProfile;
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("brb:switch-profile-change", {
        detail: { profile: activeSwitchProfile }
      }));
    }
    return activeSwitchProfile;
  }

  function finalizeButton(cancelled) {
    if (!buttonActive) return;
    if (buttonReleaseTimer !== null) {
      clearTimeout(buttonReleaseTimer);
      buttonReleaseTimer = null;
    }
    buttonActive = false;
    if (btn) btn.classList.remove("is-pressed");
    if (!cancelled) {
      playActiveSoundPhase("release", { source: "lab" });
      handlePress(clamp(Date.now() - buttonDownAt, 40, 1600), "lab");
    }
  }

  function beginButton() {
    if (!btn) return;
    if (buttonActive && buttonReleaseTimer !== null) finalizeButton(false);
    else if (buttonActive) return;
    if (buttonReleaseTimer !== null) {
      clearTimeout(buttonReleaseTimer);
      buttonReleaseTimer = null;
    }
    buttonActive = true;
    buttonDownAt = Date.now();
    btn.classList.add("is-pressed");
    playActiveSoundPhase("press", { source: "lab" });
  }

  function endButton(cancelled) {
    if (!buttonActive) return;
    if (cancelled) {
      finalizeButton(true);
      return;
    }
    var elapsed = Date.now() - buttonDownAt;
    if (elapsed >= minimumPressDurationMs) {
      finalizeButton(false);
      return;
    }
    if (buttonReleaseTimer !== null) return;
    buttonReleaseTimer = setTimeout(function () {
      buttonReleaseTimer = null;
      finalizeButton(false);
    }, minimumPressDurationMs - elapsed);
  }

  function triggerExternalPress(holdMs, source, options) {
    options = options || {};
    var ms = clamp(Number(holdMs) || 120, 40, 1600);
    if (btn && !buttonActive) {
      btn.classList.add("is-pressed");
      clearNamedTimer("proxyButton");
      timers.proxyButton = setTimeout(function () {
        if (btn && !buttonActive) btn.classList.remove("is-pressed");
        timers.proxyButton = null;
      }, 140);
    }
    if (!options.skipSound) previewSoundProfile(activeSoundProfile, ms, { source: source || "external" });
    handlePress(ms, source || "external");
  }

  function finalizePedestal(cancelled) {
    if (!pedestalActive) return;
    if (pedestalReleaseTimer !== null) {
      clearTimeout(pedestalReleaseTimer);
      pedestalReleaseTimer = null;
    }
    pedestalActive = false;
    if (pedestalControl) pedestalControl.classList.remove("is-pressed");
    animatePedestalFrames(
      pedestalFrames.length ? pedestalFrames.length - 1 : 0,
      cancelled ? getPedestalReturnDuration(96) : getPedestalReturnDuration(124),
      function () {
        setPedestalFrame(0);
      }
    );
    if (!cancelled) {
      playActiveSoundPhase("release", { source: "pedestal" });
      runPedestalEffects();
      triggerExternalPress(clamp(Date.now() - pedestalDownAt, 40, 1600), "pedestal", { skipSound: true });
    }
  }

  function beginPedestal() {
    if (!pedestal || !pedestalControl || isUndocking) return;
    if (pedestalActive && pedestalReleaseTimer !== null) finalizePedestal(false);
    else if (pedestalActive) return;
    if (pedestalReleaseTimer !== null) {
      clearTimeout(pedestalReleaseTimer);
      pedestalReleaseTimer = null;
    }
    pedestalActive = true;
    pedestalDownAt = Date.now();
    pedestalControl.classList.add("is-pressed");
    animatePedestalFrames(pedestalPressPeakFrame, getPedestalPressDuration(92));
    playActiveSoundPhase("press", { source: "pedestal" });
  }

  function endPedestal(cancelled) {
    if (!pedestalActive) return;
    if (cancelled) {
      finalizePedestal(true);
      return;
    }
    var elapsed = Date.now() - pedestalDownAt;
    if (elapsed >= minimumPressDurationMs) {
      finalizePedestal(false);
      return;
    }
    if (pedestalReleaseTimer !== null) return;
    pedestalReleaseTimer = setTimeout(function () {
      pedestalReleaseTimer = null;
      finalizePedestal(false);
    }, minimumPressDurationMs - elapsed);
  }

  function scrollAssistEnabled() {
    return !reducedMotion && window.innerWidth > 980;
  }

  function getScrollAssistPanels() {
    return Array.prototype.slice.call(document.querySelectorAll(".hero, .field-section, .stack > .panel"));
  }

  function getScrollAssistTarget(rect) {
    var margin = 14;
    var availableHeight = window.innerHeight - margin * 2;
    var offset = rect.height >= availableHeight
      ? margin
      : Math.max(margin, Math.round((window.innerHeight - rect.height) / 2));
    var top = (window.scrollY || window.pageYOffset || 0) + rect.top - offset;
    var maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return clamp(Math.round(top), 0, maxTop);
  }

  function findScrollAssistCandidate() {
    if (!scrollAssistEnabled()) return null;
    var panels = getScrollAssistPanels();
    var viewportCenter = window.innerHeight / 2;
    var threshold = Math.min(140, window.innerHeight * 0.18);
    var best = null;
    for (var i = 0; i < panels.length; i++) {
      var rect = panels[i].getBoundingClientRect();
      if (rect.bottom < -40 || rect.top > window.innerHeight + 40) continue;
      var centerDistance = Math.abs((rect.top + rect.height / 2) - viewportCenter);
      if (centerDistance > threshold) continue;
      var targetTop = getScrollAssistTarget(rect);
      var distanceToTarget = Math.abs((window.scrollY || window.pageYOffset || 0) - targetTop);
      if (distanceToTarget < 8) continue;
      var score = centerDistance + distanceToTarget * 0.12;
      if (!best || score < best.score) {
        best = {
          score: score,
          targetTop: targetTop
        };
      }
    }
    return best;
  }

  function settleScrollAssist() {
    scrollAssist.settleTimer = null;
    if (!scrollAssistEnabled()) return;
    var now = performance.now();
    if (now < scrollAssist.ignoreUntil || now < scrollAssist.cooldownUntil) return;
    if (scrollAssist.velocity > 0.9) return;
    var candidate = findScrollAssistCandidate();
    if (!candidate) return;
    if (
      scrollAssist.lastTargetTop !== null &&
      Math.abs(candidate.targetTop - scrollAssist.lastTargetTop) < 6 &&
      now < scrollAssist.cooldownUntil + 280
    ) {
      return;
    }
    scrollAssist.lastTargetTop = candidate.targetTop;
    scrollAssist.ignoreUntil = now + 420;
    scrollAssist.cooldownUntil = now + 900;
    window.scrollTo({
      top: candidate.targetTop,
      behavior: "smooth"
    });
  }

  function queueScrollAssist() {
    if (!scrollAssistEnabled() || performance.now() < scrollAssist.ignoreUntil) return;
    if (scrollAssist.settleTimer !== null) clearTimeout(scrollAssist.settleTimer);
    scrollAssist.settleTimer = setTimeout(settleScrollAssist, 96);
  }

  window.BRB = window.BRB || {};
  window.BRB.triggerPress = triggerExternalPress;
  window.BRB.getSwitchProfile = function () { return activeSwitchProfile; };
  window.BRB.setSwitchProfile = setActiveSwitchProfile;
  window.BRB.clearSwitchProfile = function () { return setActiveSwitchProfile(null); };
  window.BRB.getSoundProfile = function () { return activeSoundProfile; };
  window.BRB.getStoredSoundProfileId = function () { return storedSoundProfileId; };
  window.BRB.setSoundProfile = setActiveSoundProfile;
  window.BRB.clearSoundProfile = function () { return setActiveSoundProfile(null); };
  window.BRB.previewSoundProfile = previewSoundProfile;
  window.BRB.getLastSoundRuntimeError = function () { return lastSoundRuntimeError; };
  window.BRB.getEffectivePressMs = getEffectiveHoldMs;
  window.BRB.getLiveWaveform = function () { return waveData.slice(-96); };
  window.BRB.getTelemetrySnapshot = getTelemetrySnapshot;
  window.BRB.activeSwitchProfile = activeSwitchProfile;
  window.BRB.activeSoundProfile = activeSoundProfile;
  window.BRB.activeSoundProfileId = storedSoundProfileId;
  window.BRB.telemetry = getTelemetrySnapshot();

  initPedestalFrames();
  syncSwitchProfileStyles();
  collectRedWords();
  updateReggieBubbleLayout();
  ensureAirships();
  updateAirships();
  initAmbient();
  resizeAmbient();
  resizeCanvases();
  updateStats();
  drawAmbient();
  drawAllViz();
  walkPeople();
  renderPedestalLoop();

  window.addEventListener("resize", function () {
    updateReggieBubbleLayout();
    resizeAmbient();
    resizeCanvases();
    scrollAssist.lastTargetTop = null;
    if (isDocked && pedestal) {
      var absolute = getDockAbsolutePos();
      if (absolute) {
        pedestal.style.left = absolute.left + "px";
        pedestal.style.top = absolute.top + "px";
        pedestal.style.width = absolute.width + "px";
        pedestal.style.height = absolute.height + "px";
      }
    }
  });

  window.addEventListener("wheel", function (e) {
    if (!scrollAssistEnabled()) return;
    var now = performance.now();
    if (Math.abs(e.deltaY) > 120 || Math.abs(e.deltaX) > 48) {
      scrollAssist.velocity = Math.max(scrollAssist.velocity, 1.1);
      scrollAssist.ignoreUntil = now + 140;
    }
  }, { passive: true });

  window.addEventListener("scroll", function () {
    if (!scrollAssistEnabled()) return;
    var now = performance.now();
    var currentY = window.scrollY || window.pageYOffset || 0;
    var deltaY = Math.abs(currentY - scrollAssist.lastY);
    var deltaT = Math.max(16, now - scrollAssist.lastAt);
    var instantVelocity = deltaY / deltaT;
    scrollAssist.velocity = instantVelocity * 0.74 + scrollAssist.velocity * 0.26;
    scrollAssist.lastY = currentY;
    scrollAssist.lastAt = now;
    queueScrollAssist();
  }, { passive: true });

  if (pedestalControl) {
    if ("PointerEvent" in window) {
      pedestalControl.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        pedestalPointerId = e.pointerId;
        if (pedestalControl.setPointerCapture) {
          try { pedestalControl.setPointerCapture(e.pointerId); } catch (_) {}
        }
        beginPedestal();
      });
      pedestalControl.addEventListener("pointerup", function (e) {
        if (pedestalPointerId !== null && e.pointerId !== pedestalPointerId) return;
        endPedestal(false);
        pedestalPointerId = null;
      });
      pedestalControl.addEventListener("pointercancel", function (e) {
        if (pedestalPointerId !== null && e.pointerId !== pedestalPointerId) return;
        endPedestal(true);
        pedestalPointerId = null;
      });
      pedestalControl.addEventListener("lostpointercapture", function () {
        pedestalPointerId = null;
        endPedestal(true);
      });
    } else {
      pedestalControl.addEventListener("touchstart", function (e) {
        pedestalLastTouchStart = Date.now();
        e.preventDefault();
        if (!e.changedTouches || !e.changedTouches.length) return;
        pedestalTouchId = e.changedTouches[0].identifier;
        beginPedestal();
      }, { passive: false });
      pedestalControl.addEventListener("touchend", function (e) {
        if (pedestalTouchId === null) return;
        e.preventDefault();
        endPedestal(false);
        pedestalTouchId = null;
      }, { passive: false });
      pedestalControl.addEventListener("touchcancel", function () {
        endPedestal(true);
        pedestalTouchId = null;
      });
      pedestalControl.addEventListener("click", function () {
        if (Date.now() - pedestalLastTouchStart < 700) return;
        beginPedestal();
        endPedestal(false);
      });
    }
    pedestalControl.addEventListener("keydown", function (e) {
      if (!e.repeat && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        beginPedestal();
      }
    });
    pedestalControl.addEventListener("keyup", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        endPedestal(false);
      }
    });
    pedestalControl.addEventListener("blur", function () {
      endPedestal(true);
    });
  }

  if (btn) {
    if ("PointerEvent" in window) {
      btn.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        activePointerId = e.pointerId;
        if (btn.setPointerCapture) {
          try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        }
        beginButton();
      });
      btn.addEventListener("pointerup", function (e) {
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        endButton(false);
        activePointerId = null;
      });
      btn.addEventListener("pointercancel", function (e) {
        if (activePointerId !== null && e.pointerId !== activePointerId) return;
        endButton(true);
        activePointerId = null;
      });
      btn.addEventListener("lostpointercapture", function () {
        activePointerId = null;
        endButton(true);
      });
    } else {
      btn.addEventListener("touchstart", function (e) {
        lastTouchStart = Date.now();
        e.preventDefault();
        if (!e.changedTouches || !e.changedTouches.length) return;
        buttonTouchId = e.changedTouches[0].identifier;
        beginButton();
      }, { passive: false });
      btn.addEventListener("touchend", function (e) {
        if (buttonTouchId === null) return;
        e.preventDefault();
        endButton(false);
        buttonTouchId = null;
      }, { passive: false });
      btn.addEventListener("touchcancel", function () {
        endButton(true);
        buttonTouchId = null;
      });
      btn.addEventListener("click", function () {
        if (Date.now() - lastTouchStart < 700) return;
        beginButton();
        endButton(false);
      });
    }
    btn.addEventListener("keydown", function (e) {
      if (!e.repeat && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        beginButton();
      }
    });
    btn.addEventListener("keyup", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        endButton(false);
      }
    });
    btn.addEventListener("blur", function () {
      endButton(true);
    });
  }

  setInterval(updateStats, 1000);
})();

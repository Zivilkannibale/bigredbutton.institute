(function () {
  var ROOT_ID = "switchLabRoot";
  var META_ID = "switchLabMeta";
  var PANEL_ID = "switchLabPanel";
  var STORAGE_KEY = "brb.switchProfileId";
  var CATALOG_URL = "data/switchesdb/catalog.json";
  var PROFILES_URL = "data/switchesdb/profiles.json";
  var MANIFEST_URL = "data/switchesdb/manifest.json";
  var RESULT_LIMIT = 18;

  var panel = document.getElementById(PANEL_ID);
  var heroPanel = document.querySelector(".hero");
  var root = document.getElementById(ROOT_ID);
  var meta = document.getElementById(META_ID);
  if (!root) return;

  var state = {
    catalog: [],
    catalogById: {},
    manifest: null,
    profilesById: null,
    profilesPromise: null,
    search: "",
    source: "all",
    family: "all",
    selectedId: null,
    appliedId: null,
    error: null,
    telemetry: defaultTelemetry(),
    forceTelemetryPreviewUntil: 0
  };

  function defaultTelemetry() {
    return {
      verifiedPresses: 0,
      ratePerMinute: 0,
      avgIntervalMs: null,
      maxBurst: 0,
      entropy: null,
      waveform: []
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed for " + url + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  function formatDate(value) {
    if (!value) return "Unknown date";
    try {
      return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (_) {
      return String(value);
    }
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function formatForce(value) {
    if (value == null) return "--";
    return Math.round(Number(value)) + " gf";
  }

  function formatTravel(value) {
    if (value == null) return "--";
    return Number(value).toFixed(2) + " mm";
  }

  function formatRate(value) {
    return Number(value || 0).toFixed(1);
  }

  function formatAvgInterval(value) {
    return value == null ? "\u2014" : Math.round(Number(value)).toString();
  }

  function titleCase(value) {
    if (!value) return "Unknown";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function getStoredId() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function storeSelectedId(id) {
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function normalizeTelemetry(snapshot) {
    var payload = snapshot && typeof snapshot === "object" ? snapshot : {};
    var waveform = Array.isArray(payload.waveform) ? payload.waveform : [];
    return {
      verifiedPresses: Math.max(0, Number(payload.verifiedPresses) || 0),
      ratePerMinute: Number(payload.ratePerMinute) || 0,
      avgIntervalMs: payload.avgIntervalMs == null ? null : Number(payload.avgIntervalMs) || null,
      maxBurst: Math.max(0, Number(payload.maxBurst) || 0),
      entropy: payload.entropy == null ? null : Number(payload.entropy) || null,
      waveform: waveform.map(function (value) { return Number(value) || 0; }).slice(-96)
    };
  }

  function readTelemetrySnapshot() {
    if (window.BRB) {
      if (typeof window.BRB.getTelemetrySnapshot === "function") {
        return normalizeTelemetry(window.BRB.getTelemetrySnapshot());
      }
      if (window.BRB.telemetry) {
        return normalizeTelemetry(window.BRB.telemetry);
      }
    }
    return defaultTelemetry();
  }

  function currentSelectedItem() {
    return state.selectedId ? state.catalogById[state.selectedId] || null : null;
  }

  function currentSelectedProfile() {
    return state.selectedId && state.profilesById ? state.profilesById[state.selectedId] || null : null;
  }

  function currentAppliedProfile() {
    return window.BRB && typeof window.BRB.getSwitchProfile === "function"
      ? window.BRB.getSwitchProfile()
      : null;
  }

  function ensureProfilesLoaded() {
    if (state.profilesById) return Promise.resolve(state.profilesById);
    if (state.profilesPromise) return state.profilesPromise;
    state.profilesPromise = fetchJson(PROFILES_URL).then(function (payload) {
      var map = Object.create(null);
      var items = payload && payload.items ? payload.items : [];
      var i;
      for (i = 0; i < items.length; i++) map[items[i].id] = items[i];
      state.profilesById = map;
      return map;
    });
    return state.profilesPromise;
  }

  function syncAppliedIdFromRuntime() {
    var activeProfile = currentAppliedProfile();
    state.appliedId = activeProfile && activeProfile.id ? activeProfile.id : null;
  }

  function describeSelection(item, profile) {
    if (!item) return "Choose a measured switch profile from the BRB cache to alter the press feel.";
    var family = titleCase((profile && profile.family) || item.family || "unknown");
    var metrics = profile && profile.metrics ? profile.metrics : item.metrics || {};
    var pieces = [family + " profile"];
    if (metrics.peakForceGf != null) pieces.push(formatForce(metrics.peakForceGf) + " peak");
    if (metrics.totalTravelMm != null) pieces.push(formatTravel(metrics.totalTravelMm) + " travel");
    return pieces.join(" \u00b7 ");
  }

  function sourceOptions() {
    var counts = { all: state.catalog.length };
    var labels = { all: "All sources" };
    var i;
    for (i = 0; i < state.catalog.length; i++) {
      counts[state.catalog[i].sourceKey] = (counts[state.catalog[i].sourceKey] || 0) + 1;
      labels[state.catalog[i].sourceKey] = state.catalog[i].sourceLabel;
    }
    return [
      { key: "all", label: labels.all, count: counts.all },
      { key: "goat", label: labels.goat || "ThereminGoat", count: counts.goat || 0 },
      { key: "haata", label: labels.haata || "HaaTa", count: counts.haata || 0 },
      { key: "pylon", label: labels.pylon || "bluepylons", count: counts.pylon || 0 }
    ];
  }

  function familyOptions() {
    var counts = { all: state.catalog.length, linear: 0, tactile: 0, clicky: 0 };
    var i;
    for (i = 0; i < state.catalog.length; i++) {
      counts[state.catalog[i].family] = (counts[state.catalog[i].family] || 0) + 1;
    }
    return [
      { key: "all", label: "All families", count: counts.all || 0 },
      { key: "linear", label: "Linear", count: counts.linear || 0 },
      { key: "tactile", label: "Tactile", count: counts.tactile || 0 },
      { key: "clicky", label: "Clicky", count: counts.clicky || 0 }
    ];
  }

  function getFilteredItems() {
    var needle = state.search.trim().toLowerCase();
    return state.catalog.filter(function (item) {
      if (state.source !== "all" && item.sourceKey !== state.source) return false;
      if (state.family !== "all" && item.family !== state.family) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().indexOf(needle) !== -1 ||
        item.sourceLabel.toLowerCase().indexOf(needle) !== -1 ||
        item.family.toLowerCase().indexOf(needle) !== -1
      );
    });
  }

  function renderChips(options, activeKey, attribute) {
    return options.map(function (option) {
      var classes = "switch-lab-chip" + (option.key === activeKey ? " is-active" : "");
      return (
        '<button class="' + classes + '" type="button" data-filter="' + escapeHtml(attribute) +
        '" data-value="' + escapeHtml(option.key) + '">' +
        '<span>' + escapeHtml(option.label) + "</span> " +
        '<span>(' + escapeHtml(formatCount(option.count)) + ")</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderResults(items) {
    if (!items.length) {
      return '<p class="switch-lab-empty">No switches match the current filters.</p>';
    }
    return items.slice(0, RESULT_LIMIT).map(function (item) {
      var classes = ["switch-lab-item"];
      if (item.id === state.selectedId) classes.push("is-selected");
      if (item.id === state.appliedId) classes.push("is-applied");
      return (
        '<button class="' + classes.join(" ") + '" type="button" data-switch-id="' + escapeHtml(item.id) + '">' +
          '<span class="switch-lab-item__title">' + escapeHtml(item.name) + "</span>" +
          '<span class="switch-lab-item__meta">' +
            "<span>" + escapeHtml(titleCase(item.family)) + "</span>" +
            "<span>" + escapeHtml(item.sourceLabel) + "</span>" +
            (item.id === state.appliedId ? "<span>Applied</span>" : "") +
          "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderTelemetryCard() {
    var telemetry = state.telemetry;
    return (
      '<section class="switch-lab-telemetry" aria-labelledby="switchLabTelemetryTitle">' +
        '<div class="switch-lab-card__head">' +
          '<p class="switch-lab-card__eyebrow" id="switchLabTelemetryTitle">Field Telemetry</p>' +
          '<p class="switch-lab-card__meta">Live BRB session</p>' +
        "</div>" +
        '<div class="switch-lab-telemetry__summary">' +
          '<div class="switch-lab-telemetry__count">' +
            '<div class="switch-lab-telemetry__count-value" id="switchLabTelemetryCount">' + escapeHtml(formatCount(telemetry.verifiedPresses)) + "</div>" +
            '<div class="switch-lab-telemetry__count-label">Verified presses</div>' +
          "</div>" +
          '<div class="switch-lab-telemetry__stats">' +
            '<div class="switch-lab-telemetry__stat"><span class="switch-lab-telemetry__stat-value" id="switchLabTelemetryRate">' + escapeHtml(formatRate(telemetry.ratePerMinute)) + '</span><span class="switch-lab-telemetry__stat-label">Press/min</span></div>' +
            '<div class="switch-lab-telemetry__stat"><span class="switch-lab-telemetry__stat-value" id="switchLabTelemetryAvg">' + escapeHtml(formatAvgInterval(telemetry.avgIntervalMs)) + '</span><span class="switch-lab-telemetry__stat-label">Avg ms</span></div>' +
            '<div class="switch-lab-telemetry__stat"><span class="switch-lab-telemetry__stat-value" id="switchLabTelemetryBurst">' + escapeHtml(String(telemetry.maxBurst || 0)) + '</span><span class="switch-lab-telemetry__stat-label">Max burst</span></div>' +
          "</div>" +
        "</div>" +
        '<div class="switch-lab-telemetry__wave">' +
          '<div class="switch-lab-card__label">Temporal waveform</div>' +
          '<canvas id="switchLabTelemetryWave" aria-label="BRB temporal waveform"></canvas>' +
        "</div>" +
      "</section>"
    );
  }

  function renderCurveCard(item, profile) {
    var metrics = profile && profile.metrics ? profile.metrics : item && item.metrics ? item.metrics : {};
    return (
      '<section class="switch-lab-curve" aria-labelledby="switchLabCurveTitle">' +
        '<div class="switch-lab-card__head switch-lab-card__head--curve">' +
          '<div>' +
            '<p class="switch-lab-card__eyebrow">SwitchesDB Force Curve</p>' +
            '<h4 id="switchLabCurveTitle">Measured force profile</h4>' +
          "</div>" +
          '<div class="switch-lab-curve__legend">' +
            '<span class="switch-lab-curve__legend-item"><span class="switch-lab-curve__legend-line switch-lab-curve__legend-line--down"></span>Downstroke</span>' +
            '<span class="switch-lab-curve__legend-item"><span class="switch-lab-curve__legend-line switch-lab-curve__legend-line--up"></span>Return</span>' +
          "</div>" +
        "</div>" +
        '<div class="switch-lab-curve__canvas-wrap">' +
          '<canvas id="switchLabCurveCanvas" aria-label="Selected switch force curve"></canvas>' +
          '<div class="switch-lab-curve__empty" id="switchLabCurveEmpty">Curve preview unavailable for this selection.</div>' +
        "</div>" +
        '<div class="switch-lab-curve__footer">' +
          '<span>' + escapeHtml(formatTravel(metrics.totalTravelMm)) + "</span>" +
          '<span>' + escapeHtml(formatForce(metrics.peakForceGf)) + "</span>" +
        "</div>" +
      "</section>"
    );
  }

  function renderDetail() {
    var item = currentSelectedItem();
    if (!item) {
      return '<div class="switch-lab-detail"><p class="switch-lab-empty">Choose a switch to inspect its BRB profile mapping.</p></div>';
    }
    var profile = currentSelectedProfile();
    var metrics = profile && profile.metrics ? profile.metrics : item.metrics || {};
    var applied = item.id === state.appliedId;
    var applyLabel = applied ? "Applied to BRB" : "Apply to BRB";
    var statusClass = "switch-lab-detail__status" + (applied ? " is-applied" : "");
    var statusText = applied
      ? "This switch is currently driving the BRB press profile."
      : "Select apply to map this measured switch to the BRB button.";
    return (
      '<div class="switch-lab-detail">' +
        '<div class="switch-lab-detail__primary">' +
          '<p class="switch-lab-detail__eyebrow">Current Selection</p>' +
          "<div>" +
            "<h3>" + escapeHtml(item.name) + "</h3>" +
            "<p>" + escapeHtml(describeSelection(item, profile)) + "</p>" +
          "</div>" +
          '<p class="' + statusClass + '">' + escapeHtml(statusText) + "</p>" +
          '<dl class="switch-lab-metrics">' +
            '<div class="switch-lab-metric"><dt>Family</dt><dd>' + escapeHtml(titleCase((profile && profile.family) || item.family)) + "</dd></div>" +
            '<div class="switch-lab-metric"><dt>Peak force</dt><dd>' + escapeHtml(formatForce(metrics.peakForceGf)) + "</dd></div>" +
            '<div class="switch-lab-metric"><dt>Travel</dt><dd>' + escapeHtml(formatTravel(metrics.totalTravelMm)) + "</dd></div>" +
            '<div class="switch-lab-metric"><dt>Tactile bump</dt><dd>' + escapeHtml(formatForce(metrics.tactileBumpGf)) + "</dd></div>" +
          "</dl>" +
          '<div class="switch-lab-actions">' +
            '<button class="switch-lab-action switch-lab-action--primary" type="button" id="switchLabApply">' + escapeHtml(applyLabel) + "</button>" +
            '<button class="switch-lab-action" type="button" id="switchLabTest"' + (applied ? "" : " disabled") + ">Test Press</button>" +
            '<button class="switch-lab-action" type="button" id="switchLabClear"' + (state.appliedId ? "" : " disabled") + ">Clear</button>" +
            '<button class="switch-lab-action switch-lab-action--science" type="button" id="switchLabScience">Press for Science</button>' +
          "</div>" +
          '<div class="switch-lab-links">' +
            '<a class="switch-lab-link" href="' + escapeHtml(item.switchesDbAppUrl) + '" target="_blank" rel="noopener noreferrer">View original</a>' +
            '<a class="switch-lab-link" href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Source dataset</a>' +
          "</div>" +
        "</div>" +
        '<div class="switch-lab-detail__lower">' +
          renderCurveCard(item, profile) +
          renderTelemetryCard() +
        "</div>" +
        '<p class="switch-lab-attribution">Data derived from <a href="https://www.switchesdb.com/" target="_blank" rel="noopener noreferrer">SwitchesDB</a> and the original measurement source for this switch.</p>' +
      "</div>"
    );
  }

  function renderApp() {
    var filtered = getFilteredItems();
    if (!state.selectedId && filtered.length) state.selectedId = filtered[0].id;
    if (state.selectedId && !state.catalogById[state.selectedId] && filtered.length) {
      state.selectedId = filtered[0].id;
    }
    var visibleCount = Math.min(filtered.length, RESULT_LIMIT);
    return (
      '<div class="switch-lab-app">' +
        '<div class="switch-lab-controls">' +
          '<label class="switch-lab-field">' +
            '<span class="switch-lab-label">Search switches</span>' +
            '<input class="switch-lab-search" id="switchLabSearch" type="search" value="' + escapeHtml(state.search) + '" placeholder="Search by switch or source">' +
          "</label>" +
          '<div class="switch-lab-filter-group">' +
            '<div class="switch-lab-label">Source</div>' +
            '<div class="switch-lab-filter-row">' + renderChips(sourceOptions(), state.source, "source") + "</div>" +
          "</div>" +
          '<div class="switch-lab-filter-group">' +
            '<div class="switch-lab-label">Family</div>' +
            '<div class="switch-lab-filter-row">' + renderChips(familyOptions(), state.family, "family") + "</div>" +
          "</div>" +
          '<div class="switch-lab-results-meta">Showing ' + escapeHtml(formatCount(visibleCount)) + " of " + escapeHtml(formatCount(filtered.length)) + " matches</div>" +
          '<div class="switch-lab-list">' + renderResults(filtered) + "</div>" +
        "</div>" +
        renderDetail() +
      "</div>"
    );
  }

  function updateMeta() {
    if (!meta) return;
    if (!state.manifest) {
      meta.textContent = "Loading switch catalog...";
      return;
    }
    meta.textContent =
      "Synced " + formatDate(state.manifest.generatedAt) +
      " | " + formatCount(state.catalog.length) +
      " measured switches";
  }

  function setupCanvas(canvas) {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas._vw = rect.width;
    canvas._vh = rect.height;
    var ctx = canvas.getContext("2d");
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function getCanvasMetrics(canvas) {
    return {
      width: canvas ? (canvas._vw || canvas.clientWidth || 0) : 0,
      height: canvas ? (canvas._vh || canvas.clientHeight || 0) : 0
    };
  }

  function drawTelemetryWave() {
    var canvas = document.getElementById("switchLabTelemetryWave");
    if (!canvas) return;
    var ctx = setupCanvas(canvas);
    if (!ctx) return;
    var metrics = getCanvasMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;
    var points = state.telemetry.waveform.slice(-72);
    var peak = 0;
    var i;
    for (i = 0; i < points.length; i++) peak = Math.max(peak, Math.abs(points[i]));
    if (Date.now() < state.forceTelemetryPreviewUntil || points.length < 18 || peak < 0.08) {
      points = buildTelemetryPreview().slice(-72);
    }
    while (points.length < 72) points.unshift(0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    var gx;
    var gy;
    for (gy = 16; gy < height; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    for (gx = 20; gx < width; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.beginPath();
    var gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(255,120,120,0.3)");
    gradient.addColorStop(1, "rgba(255,76,76,0.98)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    for (i = 0; i < points.length; i++) {
      var px = (i / Math.max(1, points.length - 1)) * width;
      var py = height / 2 - points[i] * (height * 0.38);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function buildTelemetryPreview() {
    var profile = currentAppliedProfile() || currentSelectedProfile();
    var telemetry = profile && profile.telemetryProfile ? profile.telemetryProfile : {};
    var animation = profile && profile.animationProfile ? profile.animationProfile : {};
    var wavePeak = clampNumber(Number(telemetry.wavePeak) || 1, 0.75, 1.7);
    var waveTail = clampNumber(Number(telemetry.waveTail) || 0.42, 0.22, 0.72);
    var snapAt = clampNumber(Number(animation.snapAt) || 0.46, 0.16, 0.9);
    var clickiness = clampNumber(
      profile && profile.soundProfile ? Number(profile.soundProfile.clickiness) || 0 : 0,
      0,
      1
    );
    var points = [];
    var sampleCount = 72;
    var i;
    for (i = 0; i < sampleCount; i++) {
      var t = i / Math.max(1, sampleCount - 1);
      var impact = Math.exp(-Math.pow((t - snapAt * 0.5) / 0.085, 2)) * (0.24 + wavePeak * 0.16);
      var rebound = Math.sin((t + clickiness * 0.08) * (5.3 + wavePeak * 1.4)) *
        Math.exp(-t * (3.1 - waveTail * 1.8)) *
        (0.08 + waveTail * 0.24);
      var release = Math.exp(-Math.pow((t - (0.42 + waveTail * 0.18)) / 0.12, 2)) * -0.09;
      points.push(clampNumber(impact + rebound + release, -0.46, 0.94));
    }
    return points;
  }

  function drawCurvePlaceholder(ctx, width, height, message) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(74, 66, 56, 0.72)";
    ctx.font = "12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, width / 2, height / 2);
  }

  function drawPolyline(ctx, points, chart, maxX, maxY, strokeStyle, lineWidth) {
    if (!points || !points.length) return;
    ctx.beginPath();
    var i;
    for (i = 0; i < points.length; i++) {
      var point = points[i];
      var px = chart.left + (point[0] / maxX) * chart.width;
      var py = chart.top + chart.height - (point[1] / maxY) * chart.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawSwitchCurve() {
    var canvas = document.getElementById("switchLabCurveCanvas");
    var empty = document.getElementById("switchLabCurveEmpty");
    if (!canvas) return;
    var ctx = setupCanvas(canvas);
    if (!ctx) return;
    var metrics = getCanvasMetrics(canvas);
    var width = metrics.width;
    var height = metrics.height;
    if (!width || !height) return;

    var profile = currentSelectedProfile();
    var curve = profile && profile.curve ? profile.curve : null;
    var down = curve && Array.isArray(curve.down) ? curve.down : [];
    var up = curve && Array.isArray(curve.up) ? curve.up : [];
    if (!down.length) {
      if (empty) empty.classList.add("is-visible");
      drawCurvePlaceholder(ctx, width, height, "Curve data unavailable");
      return;
    }
    if (empty) empty.classList.remove("is-visible");

    var maxX = Math.max(Number(curve.maxTravelMm) || 0, profile.metrics && Number(profile.metrics.totalTravelMm) || 0, 1);
    var maxY = Math.max(Number(curve.maxForceGf) || 0, profile.metrics && Number(profile.metrics.peakForceGf) || 0, 10);
    maxX = Math.ceil(maxX * 2) / 2;
    maxY = Math.ceil(maxY / 20) * 20;

    var chart = {
      left: 36,
      top: 16,
      width: Math.max(40, width - 54),
      height: Math.max(40, height - 42)
    };

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(34, 30, 24, 0.1)";
    ctx.lineWidth = 1;
    var gx;
    var gy;
    for (gx = 0; gx <= 4; gx++) {
      var gridX = chart.left + (gx / 4) * chart.width;
      ctx.beginPath();
      ctx.moveTo(gridX, chart.top);
      ctx.lineTo(gridX, chart.top + chart.height);
      ctx.stroke();
    }
    for (gy = 0; gy <= 4; gy++) {
      var gridY = chart.top + (gy / 4) * chart.height;
      ctx.beginPath();
      ctx.moveTo(chart.left, gridY);
      ctx.lineTo(chart.left + chart.width, gridY);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(26, 30, 40, 0.65)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(chart.left, chart.top);
    ctx.lineTo(chart.left, chart.top + chart.height);
    ctx.lineTo(chart.left + chart.width, chart.top + chart.height);
    ctx.stroke();

    drawPolyline(ctx, up, chart, maxX, maxY, "rgba(111, 137, 164, 0.9)", 1.8);
    drawPolyline(ctx, down, chart, maxX, maxY, "rgba(214, 29, 35, 0.95)", 2.4);

    if (profile.metrics && profile.metrics.featureTravelMm != null && profile.metrics.featureForceGf != null) {
      var featureX = chart.left + (Number(profile.metrics.featureTravelMm) / maxX) * chart.width;
      var featureY = chart.top + chart.height - (Number(profile.metrics.featureForceGf) / maxY) * chart.height;
      ctx.fillStyle = "#df2c2c";
      ctx.beginPath();
      ctx.arc(featureX, featureY, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(74, 66, 56, 0.88)";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("0 gf", 0, chart.top + chart.height + 1);
    ctx.fillText(String(maxY) + " gf", 0, chart.top + 5);
    ctx.textAlign = "right";
    ctx.fillText("0 mm", chart.left + 2, height - 2);
    ctx.fillText(maxX.toFixed(1) + " mm", chart.left + chart.width, height - 2);
  }

  function syncTelemetryPanel() {
    state.telemetry = readTelemetrySnapshot();
    var countEl = document.getElementById("switchLabTelemetryCount");
    var rateEl = document.getElementById("switchLabTelemetryRate");
    var avgEl = document.getElementById("switchLabTelemetryAvg");
    var burstEl = document.getElementById("switchLabTelemetryBurst");
    if (countEl) countEl.textContent = formatCount(state.telemetry.verifiedPresses);
    if (rateEl) rateEl.textContent = formatRate(state.telemetry.ratePerMinute);
    if (avgEl) avgEl.textContent = formatAvgInterval(state.telemetry.avgIntervalMs);
    if (burstEl) burstEl.textContent = String(state.telemetry.maxBurst || 0);
    drawTelemetryWave();
  }

  function syncCurvePanel() {
    drawSwitchCurve();
  }

  function syncPanelHeight() {
    if (!panel) return;
    if (window.innerWidth <= 1100 || !heroPanel) {
      panel.style.removeProperty("--switch-lab-reference-height");
      return;
    }
    var heroRect = heroPanel.getBoundingClientRect();
    var viewportTarget = Math.max(540, window.innerHeight - 28);
    var targetHeight = Math.min(Math.round(heroRect.height), viewportTarget);
    if (targetHeight > 0) {
      panel.style.setProperty("--switch-lab-reference-height", targetHeight + "px");
    }
  }

  function syncSupplementalPanels() {
    syncTelemetryPanel();
    syncCurvePanel();
    syncPanelHeight();
  }

  function bindEvents() {
    var searchInput = document.getElementById("switchLabSearch");
    var applyButton = document.getElementById("switchLabApply");
    var testButton = document.getElementById("switchLabTest");
    var clearButton = document.getElementById("switchLabClear");
    var scienceButton = document.getElementById("switchLabScience");
    var itemButtons = root.querySelectorAll("[data-switch-id]");
    var filterButtons = root.querySelectorAll("[data-filter]");
    var i;

    if (searchInput) {
      searchInput.addEventListener("input", function (event) {
        state.search = event.target.value || "";
        render();
      });
    }

    for (i = 0; i < filterButtons.length; i++) {
      filterButtons[i].addEventListener("click", function () {
        var filter = this.getAttribute("data-filter");
        var value = this.getAttribute("data-value") || "all";
        state[filter] = value;
        render();
      });
    }

    for (i = 0; i < itemButtons.length; i++) {
      itemButtons[i].addEventListener("click", function () {
        state.selectedId = this.getAttribute("data-switch-id");
        render();
      });
    }

    if (applyButton) {
      applyButton.addEventListener("click", function () {
        applySelected();
      });
    }

    if (testButton) {
      testButton.addEventListener("click", function () {
        testSelected();
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", function () {
        clearApplied();
      });
    }

    if (scienceButton) {
      scienceButton.addEventListener("click", function () {
        testSelected();
      });
    }
  }

  function render() {
    if (state.error) {
      root.setAttribute("data-state", "error");
      root.innerHTML = '<p class="switch-lab-error">' + escapeHtml(state.error) + "</p>";
      updateMeta();
      return;
    }
    if (!state.catalog.length || !state.profilesById) {
      root.setAttribute("data-state", "loading");
      root.innerHTML = '<p class="switch-lab-loading">Loading switch profiles from the local BRB sync cache.</p>';
      updateMeta();
      return;
    }
    syncAppliedIdFromRuntime();
    state.telemetry = readTelemetrySnapshot();
    root.setAttribute("data-state", "ready");
    root.innerHTML = renderApp();
    updateMeta();
    bindEvents();
    window.requestAnimationFrame(syncSupplementalPanels);
  }

  function applyProfileById(id, options) {
    options = options || {};
    return ensureProfilesLoaded().then(function (profilesById) {
      var profile = profilesById[id];
      if (!profile) throw new Error("Missing local profile for " + id);
      if (!window.BRB || typeof window.BRB.setSwitchProfile !== "function") {
        throw new Error("BRB runtime is not ready for switch profiles.");
      }
      window.BRB.setSwitchProfile(profile);
      state.appliedId = id;
      state.selectedId = id;
      storeSelectedId(id);
      if (!options.silent) render();
      return profile;
    }).catch(function (error) {
      state.error = error.message || "Unable to apply the selected switch profile.";
      render();
      throw error;
    });
  }

  function applySelected() {
    if (!state.selectedId) return;
    state.error = null;
    applyProfileById(state.selectedId);
  }

  function clearApplied() {
    state.error = null;
    if (window.BRB && typeof window.BRB.clearSwitchProfile === "function") {
      window.BRB.clearSwitchProfile();
    }
    state.appliedId = null;
    storeSelectedId(null);
    render();
  }

  function testSelected() {
    var selectedId = state.selectedId;
    if (!selectedId) return;
    state.error = null;
    applyProfileById(selectedId, { silent: true }).then(function (profile) {
      if (window.BRB && typeof window.BRB.triggerPress === "function") {
        var holdMs = profile.animationProfile && profile.animationProfile.pressDurationMs
          ? profile.animationProfile.pressDurationMs
          : 120;
        window.BRB.triggerPress(holdMs, "switch-lab");
      }
      render();
    }).catch(function () {});
  }

  function buildCatalogIndex(items) {
    var map = Object.create(null);
    var i;
    for (i = 0; i < items.length; i++) map[items[i].id] = items[i];
    return map;
  }

  function buildProfileIndex(items) {
    var map = Object.create(null);
    var i;
    for (i = 0; i < items.length; i++) map[items[i].id] = items[i];
    return map;
  }

  function restoreStoredSelection() {
    var storedId = getStoredId();
    if (storedId && state.catalogById[storedId] && state.profilesById && state.profilesById[storedId]) {
      state.selectedId = storedId;
      applyProfileById(storedId, { silent: true }).catch(function () {
        storeSelectedId(null);
      });
      return;
    }
    if (state.catalog.length) state.selectedId = state.catalog[0].id;
  }

  function loadInitialState() {
    Promise.all([fetchJson(CATALOG_URL), fetchJson(MANIFEST_URL), fetchJson(PROFILES_URL)])
      .then(function (payloads) {
        var catalogPayload = payloads[0] || {};
        var profilePayload = payloads[2] || {};
        state.catalog = catalogPayload.items || [];
        state.catalogById = buildCatalogIndex(state.catalog);
        state.manifest = payloads[1] || null;
        state.profilesById = buildProfileIndex(profilePayload.items || []);
        restoreStoredSelection();
        render();
      })
      .catch(function (error) {
        state.error = error.message || "Failed to load local switch profile assets.";
        render();
      });
  }

  window.addEventListener("brb:switch-profile-change", function () {
    syncAppliedIdFromRuntime();
    state.forceTelemetryPreviewUntil = Date.now() + 1200;
    render();
  });

  window.addEventListener("brb:telemetry-update", function (event) {
    state.telemetry = normalizeTelemetry(event && event.detail);
    syncTelemetryPanel();
  });

  window.addEventListener("resize", function () {
    syncSupplementalPanels();
  });

  window.addEventListener("load", function () {
    syncPanelHeight();
    syncSupplementalPanels();
  });

  state.telemetry = readTelemetrySnapshot();
  render();
  loadInitialState();
})();

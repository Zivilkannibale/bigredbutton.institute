(function () {
  var ROOT_ID = "buttonChoiceRoot";
  var META_ID = "buttonChoiceMeta";
  var LAB_DECK_ID = "labDeck";
  var CATALOG_URL = "data/audio/catalog.json";
  var root = document.getElementById(ROOT_ID);
  var meta = document.getElementById(META_ID);
  var labDeck = document.getElementById(LAB_DECK_ID);
  if (!root || !meta) return;

  var state = {
    catalog: [],
    catalogById: Object.create(null),
    soundProfile: null,
    soundProfileId: null,
    switchProfile: null,
    switchSelection: null,
    telemetry: normalizeTelemetry(null),
    deckOpen: shouldStartOpen(),
    error: null
  };

  function shouldStartOpen() {
    var hash = String(window.location.hash || "");
    return hash === "#switchLabPanel" || hash === "#soundLabPanel" || hash === "#labDeck";
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
      if (!response.ok) throw new Error("Request failed for " + url + " (" + response.status + ")");
      return response.json();
    });
  }

  function normalizeTelemetry(snapshot) {
    var payload = snapshot && typeof snapshot === "object" ? snapshot : {};
    var waveform = Array.isArray(payload.waveform) ? payload.waveform : [];
    return {
      verifiedPresses: Math.max(0, Number(payload.verifiedPresses) || 0),
      ratePerMinute: Number(payload.ratePerMinute) || 0,
      avgIntervalMs: payload.avgIntervalMs == null ? null : Number(payload.avgIntervalMs) || null,
      entropy: payload.entropy == null ? null : Number(payload.entropy) || null,
      waveform: waveform.map(function (value) { return Number(value) || 0; }).slice(-96)
    };
  }

  function formatSourceBundle(bundle) {
    if (bundle === "mechvibes-mit") return "Mechvibes MIT";
    if (bundle === "bucklespring-gpl") return "bucklespring GPL";
    return bundle || "Local bundle";
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function formatRate(value) {
    return Number(value || 0).toFixed(1);
  }

  function formatAvgInterval(value) {
    if (value == null) return "--";
    return Math.round(Number(value) || 0).toLocaleString("en-US");
  }

  function formatEntropy(value) {
    if (value == null) return "--";
    return Number(value).toFixed(2);
  }

  function sourceSortRank(bundle) {
    if (bundle === "mechvibes-mit") return 0;
    if (bundle === "bucklespring-gpl") return 1;
    return 2;
  }

  function buildCatalogIndex(items) {
    var map = Object.create(null);
    var i;
    for (i = 0; i < items.length; i++) map[items[i].id] = items[i];
    return map;
  }

  function sortCatalog(items) {
    return items.slice().sort(function (left, right) {
      var rankDelta = sourceSortRank(left.source_bundle) - sourceSortRank(right.source_bundle);
      if (rankDelta !== 0) return rankDelta;
      if ((left.source_bundle || "") !== (right.source_bundle || "")) {
        return String(left.source_bundle || "").localeCompare(String(right.source_bundle || ""));
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }

  function readSwitchProfile() {
    if (window.BRB && typeof window.BRB.getSwitchProfile === "function") {
      return window.BRB.getSwitchProfile() || null;
    }
    return window.BRB && window.BRB.activeSwitchProfile ? window.BRB.activeSwitchProfile : null;
  }

  function readSwitchSelection() {
    if (window.BRB && typeof window.BRB.getSwitchLabSelection === "function") {
      return window.BRB.getSwitchLabSelection() || null;
    }
    return window.BRB && window.BRB.switchLabSelection ? window.BRB.switchLabSelection : null;
  }

  function readSoundProfile() {
    if (window.BRB && typeof window.BRB.getSoundProfile === "function") {
      return window.BRB.getSoundProfile() || null;
    }
    return window.BRB && window.BRB.activeSoundProfile ? window.BRB.activeSoundProfile : null;
  }

  function readSoundProfileId() {
    if (window.BRB && typeof window.BRB.getStoredSoundProfileId === "function") {
      return window.BRB.getStoredSoundProfileId() || null;
    }
    var profile = readSoundProfile();
    return profile && profile.id ? profile.id : null;
  }

  function readTelemetrySnapshot() {
    if (window.BRB && typeof window.BRB.getTelemetrySnapshot === "function") {
      return normalizeTelemetry(window.BRB.getTelemetrySnapshot());
    }
    return normalizeTelemetry(window.BRB && window.BRB.telemetry);
  }

  function refreshRuntimeState() {
    state.switchProfile = readSwitchProfile();
    state.switchSelection = readSwitchSelection();
    state.soundProfile = readSoundProfile();
    state.soundProfileId = readSoundProfileId();
    state.telemetry = readTelemetrySnapshot();
  }

  function currentSoundItem() {
    if (state.soundProfileId && state.catalogById[state.soundProfileId]) return state.catalogById[state.soundProfileId];
    if (state.soundProfile && state.soundProfile.id && state.catalogById[state.soundProfile.id]) {
      return state.catalogById[state.soundProfile.id];
    }
    return state.soundProfile || null;
  }

  function currentSwitchLabel() {
    var profile = state.switchProfile;
    var selection = state.switchSelection;
    var item = selection && selection.item ? selection.item : null;
    var active = profile || item;
    if (!active) {
      return {
        title: "Default BRB profile",
        detail: "No Switch Lab profile is currently applied."
      };
    }

    var title = active.name || item && item.name || active.id || "Custom BRB profile";
    var parts = [];
    if (active.family) parts.push(active.family);
    if (active.isSilent) parts.push("silent");
    if (active.soundProfile && active.soundProfile.attack) parts.push(active.soundProfile.attack + " attack");
    return {
      title: title,
      detail: parts.length ? parts.join(" • ") : "Applied to live BRB motion and telemetry shaping."
    };
  }

  function currentSoundLabel() {
    var item = currentSoundItem();
    if (!item) {
      return {
        title: "No sound applied",
        detail: "Live BRB presses run silent until you choose a sound."
      };
    }

    var detail = [];
    if (item.source_bundle) detail.push(formatSourceBundle(item.source_bundle));
    if (item.license_spdx) detail.push(item.license_spdx);
    return {
      title: item.name || item.id || "Active sound profile",
      detail: detail.length ? detail.join(" • ") : "Applied to live BRB presses."
    };
  }

  function renderSoundOptions() {
    if (state.error) {
      return '<option value="">Catalog unavailable</option>';
    }

    if (!state.catalog.length) {
      return '<option value="">Loading local sounds...</option>';
    }

    var grouped = Object.create(null);
    var order = [];
    var i;
    for (i = 0; i < state.catalog.length; i++) {
      var item = state.catalog[i];
      var bundle = item.source_bundle || "local";
      if (!grouped[bundle]) {
        grouped[bundle] = [];
        order.push(bundle);
      }
      grouped[bundle].push(item);
    }

    order.sort(function (left, right) {
      var rankDelta = sourceSortRank(left) - sourceSortRank(right);
      if (rankDelta !== 0) return rankDelta;
      return formatSourceBundle(left).localeCompare(formatSourceBundle(right));
    });

    var html = ['<option value="">No sound</option>'];
    for (i = 0; i < order.length; i++) {
      var bundleKey = order[i];
      var options = grouped[bundleKey];
      html.push('<optgroup label="' + escapeHtml(formatSourceBundle(bundleKey)) + '">');
      var j;
      for (j = 0; j < options.length; j++) {
        var option = options[j];
        var selected = option.id === state.soundProfileId ? ' selected' : "";
        html.push(
          '<option value="' + escapeHtml(option.id) + '"' + selected + ">" +
            escapeHtml(option.name) +
          "</option>"
        );
      }
      html.push("</optgroup>");
    }
    return html.join("");
  }

  function renderApp() {
    var switchLabel = currentSwitchLabel();
    var soundLabel = currentSoundLabel();
    var toggleLabel = state.deckOpen ? "Hide Full Switch + Sound Lab" : "Open Full Switch + Sound Lab";
    var selectDisabled = state.error || !state.catalog.length ? " disabled" : "";
    var selectNote = state.error
      ? state.error
      : !state.catalog.length
        ? "Loading local sounds and source data."
        : "Sound changes apply immediately to live BRB presses and persist separately from the switch profile.";

    return (
      '<div class="button-choice-app">' +
        '<section class="button-choice-card button-choice-controls" aria-labelledby="buttonChoiceControlsTitle">' +
          '<div>' +
            '<h3 class="button-choice-card__title" id="buttonChoiceControlsTitle">Live BRB profile</h3>' +
            '<p class="button-choice-card__lede">Change the live press sound here. Open the full labs for switch selection, previews, favorites, and source matching.</p>' +
          "</div>" +
          '<div class="button-choice-summary">' +
            '<div class="button-choice-summary__grid">' +
              '<div class="button-choice-summary__item">' +
                '<div class="button-choice-label">Button profile</div>' +
                '<div class="button-choice-value" id="buttonChoiceSwitchValue">' + escapeHtml(switchLabel.title) + "</div>" +
                '<div class="button-choice-subvalue" id="buttonChoiceSwitchDetail">' + escapeHtml(switchLabel.detail) + "</div>" +
              "</div>" +
              '<div class="button-choice-summary__item">' +
                '<div class="button-choice-label">Current sound</div>' +
                '<div class="button-choice-value" id="buttonChoiceSoundValue">' + escapeHtml(soundLabel.title) + "</div>" +
                '<div class="button-choice-subvalue" id="buttonChoiceSoundDetail">' + escapeHtml(soundLabel.detail) + "</div>" +
              "</div>" +
            "</div>" +
            '<label class="button-choice-field" for="buttonChoiceSoundSelect">' +
              '<span class="button-choice-label">Change press sound</span>' +
              '<select class="button-choice-select" id="buttonChoiceSoundSelect"' + selectDisabled + ">" +
                renderSoundOptions() +
              "</select>" +
            "</label>" +
            '<p class="button-choice-card__note">' + escapeHtml(selectNote) + "</p>" +
          "</div>" +
          '<div class="button-choice-actions">' +
            '<button class="button-choice-toggle" type="button" id="buttonChoiceLabToggle">' + escapeHtml(toggleLabel) + "</button>" +
            '<p class="button-choice-card__note">Open the full labs for switch selection, sound previews, favorites, and source attributions.</p>' +
          "</div>" +
        "</section>" +
        '<section class="button-choice-card button-choice-telemetry" aria-labelledby="buttonChoiceTelemetryTitle">' +
          '<div>' +
            '<h3 class="button-choice-card__title" id="buttonChoiceTelemetryTitle">Front-page telemetry</h3>' +
            '<p class="button-choice-card__lede">The BRB session stays visible here without opening Switch Lab.</p>' +
          "</div>" +
          '<div class="button-choice-stats">' +
            '<div class="button-choice-stat"><div class="button-choice-stat__value" id="buttonChoiceTelemetryCount">0</div><div class="button-choice-stat__label">Verified presses</div></div>' +
            '<div class="button-choice-stat"><div class="button-choice-stat__value" id="buttonChoiceTelemetryRate">0.0</div><div class="button-choice-stat__label">Press/min</div></div>' +
            '<div class="button-choice-stat"><div class="button-choice-stat__value" id="buttonChoiceTelemetryAvg">--</div><div class="button-choice-stat__label">Avg ms</div></div>' +
            '<div class="button-choice-stat"><div class="button-choice-stat__value" id="buttonChoiceTelemetryEntropy">--</div><div class="button-choice-stat__label">Entropy</div></div>' +
          "</div>" +
          '<div class="button-choice-wave">' +
            '<div class="button-choice-label">Temporal waveform</div>' +
            '<canvas id="buttonChoiceWave" aria-label="Live BRB telemetry waveform"></canvas>' +
          "</div>" +
        "</section>" +
      "</div>"
    );
  }

  function updateMeta() {
    var deckState = state.deckOpen ? "full lab open" : "full lab closed";
    if (state.error) {
      meta.textContent = "catalog unavailable | " + deckState;
      return;
    }
    if (!state.catalog.length) {
      meta.textContent = "Loading front-page controls...";
      return;
    }
    meta.textContent = formatCount(state.catalog.length) + " local sounds | " + deckState;
  }

  function syncDeckVisibility() {
    if (!labDeck) return;
    labDeck.hidden = !state.deckOpen;
  }

  function syncSummaryDom() {
    var switchLabel = currentSwitchLabel();
    var soundLabel = currentSoundLabel();
    var switchValue = document.getElementById("buttonChoiceSwitchValue");
    var switchDetail = document.getElementById("buttonChoiceSwitchDetail");
    var soundValue = document.getElementById("buttonChoiceSoundValue");
    var soundDetail = document.getElementById("buttonChoiceSoundDetail");
    var select = document.getElementById("buttonChoiceSoundSelect");
    var toggle = document.getElementById("buttonChoiceLabToggle");
    if (switchValue) switchValue.textContent = switchLabel.title;
    if (switchDetail) switchDetail.textContent = switchLabel.detail;
    if (soundValue) soundValue.textContent = soundLabel.title;
    if (soundDetail) soundDetail.textContent = soundLabel.detail;
    if (select) select.value = state.soundProfileId || "";
    if (toggle) toggle.textContent = state.deckOpen ? "Hide Full Switch + Sound Lab" : "Open Full Switch + Sound Lab";
  }

  function syncTelemetryDom() {
    var countEl = document.getElementById("buttonChoiceTelemetryCount");
    var rateEl = document.getElementById("buttonChoiceTelemetryRate");
    var avgEl = document.getElementById("buttonChoiceTelemetryAvg");
    var entropyEl = document.getElementById("buttonChoiceTelemetryEntropy");
    if (countEl) countEl.textContent = formatCount(state.telemetry.verifiedPresses);
    if (rateEl) rateEl.textContent = formatRate(state.telemetry.ratePerMinute);
    if (avgEl) avgEl.textContent = formatAvgInterval(state.telemetry.avgIntervalMs);
    if (entropyEl) entropyEl.textContent = formatEntropy(state.telemetry.entropy);
  }

  function setupCanvas(canvas) {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 0));
    var height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 0));
    if (!width || !height) return null;
    var ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return {
      ctx: ctx,
      width: width,
      height: height
    };
  }

  function readWaveform() {
    if (window.BRB && typeof window.BRB.getLiveWaveform === "function") {
      return window.BRB.getLiveWaveform().map(function (value) { return Number(value) || 0; }).slice(-96);
    }
    return state.telemetry.waveform.slice(-96);
  }

  function drawWaveform() {
    var canvas = document.getElementById("buttonChoiceWave");
    var setup = setupCanvas(canvas);
    if (!setup) return;
    var ctx = setup.ctx;
    var width = setup.width;
    var height = setup.height;
    var waveform = readWaveform();
    var paddingX = 10;
    var paddingY = 12;
    var chartWidth = width - paddingX * 2;
    var chartHeight = height - paddingY * 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f6f1e7";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(26, 30, 40, 0.1)";
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i < 4; i++) {
      var y = paddingY + (chartHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();
    }

    if (!waveform.length) {
      ctx.fillStyle = "rgba(26, 30, 40, 0.55)";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Telemetry will draw here after the first verified press.", width / 2, height / 2);
      return;
    }

    var maxAbs = 0.4;
    for (i = 0; i < waveform.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(Number(waveform[i]) || 0));
    }

    ctx.beginPath();
    for (i = 0; i < waveform.length; i++) {
      var value = Number(waveform[i]) || 0;
      var x = paddingX + (i / Math.max(1, waveform.length - 1)) * chartWidth;
      var yNorm = 0.5 - value / (maxAbs * 2);
      var yPos = paddingY + yNorm * chartHeight;
      if (i === 0) ctx.moveTo(x, yPos);
      else ctx.lineTo(x, yPos);
    }
    ctx.strokeStyle = "#df2c2c";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function afterDeckReveal(scrollIntoView) {
    window.requestAnimationFrame(function () {
      window.dispatchEvent(new Event("resize"));
      if (scrollIntoView && labDeck) {
        labDeck.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function openDeck(scrollIntoView) {
    if (!state.deckOpen) {
      state.deckOpen = true;
      syncDeckVisibility();
      syncSummaryDom();
      updateMeta();
      afterDeckReveal(scrollIntoView);
      return;
    }
    if (scrollIntoView) afterDeckReveal(true);
  }

  function closeDeck() {
    if (!state.deckOpen) return;
    state.deckOpen = false;
    syncDeckVisibility();
    syncSummaryDom();
    updateMeta();
  }

  function bindEvents() {
    var select = document.getElementById("buttonChoiceSoundSelect");
    var toggle = document.getElementById("buttonChoiceLabToggle");

    if (select) {
      select.addEventListener("change", function () {
        var nextId = this.value || "";
        if (!window.BRB) return;
        if (!nextId) {
          if (typeof window.BRB.clearSoundProfile === "function") window.BRB.clearSoundProfile();
          return;
        }
        if (typeof window.BRB.setSoundProfile !== "function") return;
        var item = state.catalogById[nextId];
        if (item) window.BRB.setSoundProfile(item);
      });
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        if (state.deckOpen) closeDeck();
        else openDeck(true);
      });
    }
  }

  function render() {
    syncDeckVisibility();
    if (state.error) {
      root.setAttribute("data-state", "error");
    } else if (!state.catalog.length) {
      root.setAttribute("data-state", "loading");
    } else {
      root.setAttribute("data-state", "ready");
    }
    root.innerHTML = renderApp();
    bindEvents();
    syncSummaryDom();
    syncTelemetryDom();
    drawWaveform();
    updateMeta();
  }

  function loadCatalog() {
    fetchJson(CATALOG_URL)
      .then(function (payload) {
        var items = payload && Array.isArray(payload.items) ? payload.items : [];
        state.catalog = sortCatalog(items);
        state.catalogById = buildCatalogIndex(state.catalog);
        state.error = null;
        refreshRuntimeState();
        render();
        if (state.deckOpen) afterDeckReveal(false);
      })
      .catch(function (error) {
        state.error = error.message || "Unable to load the local sound catalog.";
        refreshRuntimeState();
        render();
      });
  }

  window.addEventListener("brb:telemetry-update", function (event) {
    state.telemetry = normalizeTelemetry(event && event.detail);
    syncTelemetryDom();
    drawWaveform();
  });

  window.addEventListener("brb:sound-profile-change", function () {
    refreshRuntimeState();
    render();
  });

  window.addEventListener("brb:switch-profile-change", function () {
    refreshRuntimeState();
    render();
  });

  window.addEventListener("brb:switch-lab-selection-change", function () {
    refreshRuntimeState();
    render();
  });

  window.addEventListener("hashchange", function () {
    if (shouldStartOpen()) openDeck(false);
  });

  window.addEventListener("resize", function () {
    drawWaveform();
  });

  refreshRuntimeState();
  render();
  loadCatalog();
})();

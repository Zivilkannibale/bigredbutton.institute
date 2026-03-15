(function () {
  var ROOT_ID = "soundLabRoot";
  var META_ID = "soundLabMeta";
  var CATALOG_URL = "data/audio/catalog.json";
  var MATCHING_URL = "data/audio/matching.json";
  var root = document.getElementById(ROOT_ID);
  var meta = document.getElementById(META_ID);
  if (!root) return;

  var state = {
    catalog: [],
    catalogById: {},
    catalogGeneratedAt: null,
    matching: null,
    search: "",
    source: "all",
    selectedId: null,
    appliedId: null,
    switchSelection: null,
    recommendation: null,
    error: null,
    soundError: null
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
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

  function formatDecimal(value) {
    if (value == null || !isFinite(value)) return "--";
    return Number(value).toFixed(2);
  }

  function formatSourceBundle(bundle) {
    if (bundle === "mechvibes-mit") return "Mechvibes MIT";
    if (bundle === "bucklespring-gpl") return "bucklespring GPL";
    return bundle || "Local bundle";
  }

  function formatSourceType(type) {
    if (type === "mechvibes-v1-slice-pack") return "Mechvibes v1 slice pack";
    if (type === "mechvibes-v2-press-release-pack") return "Mechvibes v2 press/release pack";
    if (type === "mechvibes-file-map-pack") return "Mechvibes representative file pack";
    if (type === "bucklespring-wav-pair") return "bucklespring WAV pair";
    return "Local adapter";
  }

  function stateLabel(id) {
    if (!state.matching || !Array.isArray(state.matching.states)) return id;
    var i;
    for (i = 0; i < state.matching.states.length; i++) {
      if (state.matching.states[i].id === id) return state.matching.states[i].label;
    }
    return id;
  }

  function getHeuristics() {
    return state.matching && state.matching.heuristics ? state.matching.heuristics : {
      recommended_threshold: 0.79,
      compatible_threshold: 0.55,
      source_threshold: 0.3,
      weights: {
        family: 0.4,
        clickiness: 0.28,
        thock: 0.2,
        attack: 0.12
      },
      silent_penalty: 0.24,
      disclaimer: "Analogue-only heuristic."
    };
  }

  function buildCatalogIndex(items) {
    var map = Object.create(null);
    var i;
    for (i = 0; i < items.length; i++) map[items[i].id] = items[i];
    return map;
  }

  function readSwitchSelection() {
    if (window.BRB && typeof window.BRB.getSwitchLabSelection === "function") {
      return window.BRB.getSwitchLabSelection();
    }
    return window.BRB && window.BRB.switchLabSelection ? window.BRB.switchLabSelection : null;
  }

  function currentSelectedItem() {
    return state.selectedId ? state.catalogById[state.selectedId] || null : null;
  }

  function currentAppliedSoundProfile() {
    return window.BRB && typeof window.BRB.getSoundProfile === "function"
      ? window.BRB.getSoundProfile()
      : null;
  }

  function syncAppliedIdFromRuntime() {
    var applied = currentAppliedSoundProfile();
    state.appliedId = applied && applied.id ? applied.id : null;
  }

  function getMatchingProfile(item) {
    if (!state.matching || !state.matching.profiles) return null;
    return state.matching.profiles[item.id] || null;
  }

  function scoreRange(value, range) {
    if (!range || range.length < 2 || !isFinite(value)) return 0.5;
    var min = Number(range[0]);
    var max = Number(range[1]);
    if (!isFinite(min) || !isFinite(max)) return 0.5;
    if (value >= min && value <= max) return 1;
    var center = (min + max) / 2;
    var span = Math.max(0.08, (max - min) / 2);
    var distance = Math.abs(value - center);
    return clampNumber(1 - distance / (span * 2.2), 0, 1);
  }

  function scoreAttack(value, allowedValues) {
    if (!allowedValues || !allowedValues.length) return 0.5;
    if (allowedValues.indexOf(value) !== -1) return 1;
    if (value === "muted" && allowedValues.indexOf("firm") !== -1) return 0.45;
    if (value === "firm" && allowedValues.indexOf("sharp") !== -1) return 0.66;
    if (value === "firm" && allowedValues.indexOf("muted") !== -1) return 0.72;
    if (value === "sharp" && allowedValues.indexOf("firm") !== -1) return 0.66;
    return 0.18;
  }

  function deriveEntryMatch(item) {
    var selection = state.switchSelection;
    var heuristics = getHeuristics();
    var matchingProfile = getMatchingProfile(item);
    if (!selection || !selection.profile || !matchingProfile) {
      return {
        state: "none",
        label: stateLabel("none"),
        score: 0,
        reason: "Current Switch Lab selection unavailable."
      };
    }

    var switchProfile = selection.profile;
    var soundProfile = switchProfile.soundProfile || {};
    var family = switchProfile.family || selection.item && selection.item.family || "linear";
    var attack = soundProfile.attack || "firm";
    var clickiness = Number(soundProfile.clickiness);
    var thock = Number(soundProfile.thock);
    var isSilent = !!switchProfile.isSilent;
    var weights = heuristics.weights || {};
    var familyTargets = matchingProfile.family_targets || {};
    var familyScore = Number(familyTargets[family]);
    if (!isFinite(familyScore)) familyScore = 0;
    var clickinessScore = scoreRange(clickiness, matchingProfile.clickiness_range);
    var thockScore = scoreRange(thock, matchingProfile.thock_range);
    var attackScore = scoreAttack(attack, matchingProfile.attack_values);
    var score =
      familyScore * (Number(weights.family) || 0.4) +
      clickinessScore * (Number(weights.clickiness) || 0.28) +
      thockScore * (Number(weights.thock) || 0.2) +
      attackScore * (Number(weights.attack) || 0.12);

    if (isSilent && !item.is_silent_compatible) {
      score -= Number(heuristics.silent_penalty) || 0.24;
    }

    score = clampNumber(score, 0, 1);

    var matchState = "none";
    if (
      score >= Number(heuristics.recommended_threshold || 0.79) &&
      familyScore >= 0.82 &&
      (!isSilent || item.is_silent_compatible)
    ) {
      matchState = "recommended";
    } else if (score >= Number(heuristics.compatible_threshold || 0.55)) {
      matchState = "compatible";
    } else if (score >= Number(heuristics.source_threshold || 0.3)) {
      matchState = "distant";
    }

    return {
      state: matchState,
      label: stateLabel(matchState),
      score: score,
      familyScore: familyScore,
      matchingSummary: matchingProfile.summary || ""
    };
  }

  function computeRecommendation() {
    var selection = state.switchSelection;
    if (!selection || !selection.profile) {
      return {
        state: "none",
        label: stateLabel("none"),
        item: null,
        match: null,
        message: "Switch Lab selection not ready yet."
      };
    }

    var best = null;
    var i;
    for (i = 0; i < state.catalog.length; i++) {
      var item = state.catalog[i];
      var match = deriveEntryMatch(item);
      if (!best || match.score > best.match.score) {
        best = {
          item: item,
          match: match
        };
      }
    }

    if (!best) {
      return {
        state: "none",
        label: stateLabel("none"),
        item: null,
        match: null,
        message: "No local sound entries are available."
      };
    }

    return {
      state: best.match.state,
      label: best.match.label,
      item: best.item,
      match: best.match,
      message: best.match.state === "none"
        ? "No honest local analogue is close enough for the current switch."
        : best.match.matchingSummary
    };
  }

  function sourceOptions() {
    var counts = {
      all: state.catalog.length,
      "mechvibes-mit": 0,
      "bucklespring-gpl": 0
    };
    var i;
    for (i = 0; i < state.catalog.length; i++) {
      counts[state.catalog[i].source_bundle] = (counts[state.catalog[i].source_bundle] || 0) + 1;
    }
    return [
      { key: "all", label: "All", count: counts.all },
      { key: "mechvibes-mit", label: "Mechvibes MIT", count: counts["mechvibes-mit"] || 0 },
      { key: "bucklespring-gpl", label: "bucklespring GPL", count: counts["bucklespring-gpl"] || 0 }
    ];
  }

  function searchTextFor(item) {
    return [
      item.name,
      item.source_name,
      item.source_bundle,
      item.license_spdx,
      (item.tags || []).join(" ")
    ].join(" ").toLowerCase();
  }

  function sortItems(items) {
    var recommendationId = state.recommendation && state.recommendation.item ? state.recommendation.item.id : null;
    return items.slice().sort(function (left, right) {
      var leftApplied = left.id === state.appliedId ? 1 : 0;
      var rightApplied = right.id === state.appliedId ? 1 : 0;
      if (leftApplied !== rightApplied) return rightApplied - leftApplied;

      var leftRecommended = left.id === recommendationId ? 1 : 0;
      var rightRecommended = right.id === recommendationId ? 1 : 0;
      if (leftRecommended !== rightRecommended) return rightRecommended - leftRecommended;

      var leftScore = deriveEntryMatch(left).score;
      var rightScore = deriveEntryMatch(right).score;
      if (leftScore !== rightScore) return rightScore - leftScore;

      return left.name.localeCompare(right.name);
    });
  }

  function getFilteredItems() {
    var needle = state.search.trim().toLowerCase();
    var filtered = state.catalog.filter(function (item) {
      if (state.source !== "all" && item.source_bundle !== state.source) return false;
      if (!needle) return true;
      return searchTextFor(item).indexOf(needle) !== -1;
    });
    return sortItems(filtered);
  }

  function ensureSelectedItem(filtered) {
    var recommendationId = state.recommendation && state.recommendation.item ? state.recommendation.item.id : null;
    if (state.selectedId && state.catalogById[state.selectedId]) {
      var visible = filtered.some(function (item) { return item.id === state.selectedId; });
      if (visible) return;
    }
    if (state.appliedId && state.catalogById[state.appliedId]) {
      state.selectedId = state.appliedId;
      return;
    }
    if (recommendationId && state.catalogById[recommendationId]) {
      state.selectedId = recommendationId;
      return;
    }
    state.selectedId = filtered.length ? filtered[0].id : null;
  }

  function renderChips(options, activeKey, attribute) {
    return options.map(function (option) {
      var classes = "sound-lab-chip" + (option.key === activeKey ? " is-active" : "");
      return (
        '<button class="' + classes + '" type="button" data-filter="' + escapeHtml(attribute) +
        '" data-value="' + escapeHtml(option.key) + '">' +
        "<span>" + escapeHtml(option.label) + "</span>" +
        "<span>(" + escapeHtml(formatCount(option.count)) + ")</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderResults(items) {
    if (!items.length) {
      return '<p class="sound-lab-empty">No local sounds fit the current search and source filter.</p>';
    }
    return items.map(function (item) {
      var match = deriveEntryMatch(item);
      var classes = ["sound-lab-item"];
      if (item.id === state.selectedId) classes.push("is-selected");
      if (item.id === state.appliedId) classes.push("is-applied");
      if (state.recommendation && state.recommendation.item && item.id === state.recommendation.item.id) {
        classes.push("is-recommended");
      }
      return (
        '<button class="' + classes.join(" ") + '" type="button" data-sound-id="' + escapeHtml(item.id) + '">' +
          '<span class="sound-lab-item__title">' + escapeHtml(item.name) + "</span>" +
          '<span class="sound-lab-item__meta">' +
            "<span>" + escapeHtml(formatSourceBundle(item.source_bundle)) + "</span>" +
            "<span>" + escapeHtml(item.license_spdx) + "</span>" +
            "<span>" + escapeHtml((item.tags || []).slice(0, 2).join(" \u00b7 ")) + "</span>" +
          "</span>" +
          '<span class="sound-lab-item__status sound-lab-item__status--' + escapeHtml(match.state) + '">' +
            escapeHtml(match.label) +
            (item.id === state.appliedId ? " \u00b7 Applied" : "") +
          "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderSwitchSelectionCard() {
    var selection = state.switchSelection;
    if (!selection || !selection.profile || !selection.item) {
      return (
        '<section class="sound-lab-block sound-lab-block--selection">' +
          '<p class="sound-lab-block__eyebrow">Current Switch Selection</p>' +
          '<p class="sound-lab-empty">Switch Lab has not published a current selection yet.</p>' +
        "</section>"
      );
    }

    var soundProfile = selection.profile.soundProfile || {};
    var detailLine = [
      selection.profile.family || selection.item.family || "unknown",
      selection.profile.isSilent ? "silent" : "non-silent",
      "attack " + (soundProfile.attack || "firm"),
      "clickiness " + formatDecimal(soundProfile.clickiness),
      "thock " + formatDecimal(soundProfile.thock)
    ].join(" \u00b7 ");

    return (
      '<section class="sound-lab-block sound-lab-block--selection">' +
        '<p class="sound-lab-block__eyebrow">Current Switch Selection</p>' +
        "<h3>" + escapeHtml(selection.item.name) + "</h3>" +
        '<p class="sound-lab-block__lede">' + escapeHtml(detailLine) + "</p>" +
        '<p class="sound-lab-block__note">This follows the active Switch Lab selection, not only the applied BRB switch profile.</p>' +
      "</section>"
    );
  }

  function renderRecommendationCard() {
    var recommendation = state.recommendation || computeRecommendation();
    var heuristics = getHeuristics();
    if (!recommendation || !recommendation.item) {
      return (
        '<section class="sound-lab-block sound-lab-block--recommendation">' +
          '<p class="sound-lab-block__eyebrow">Recommendation</p>' +
          '<p class="sound-lab-detail__status sound-lab-detail__status--none">' + escapeHtml(stateLabel("none")) + "</p>" +
          '<p class="sound-lab-block__lede">' + escapeHtml(recommendation && recommendation.message ? recommendation.message : "No recommendation available.") + "</p>" +
          '<p class="sound-lab-block__note">' + escapeHtml(heuristics.disclaimer) + "</p>" +
        "</section>"
      );
    }

    return (
      '<section class="sound-lab-block sound-lab-block--recommendation">' +
        '<p class="sound-lab-block__eyebrow">Recommendation</p>' +
        '<p class="sound-lab-detail__status sound-lab-detail__status--' + escapeHtml(recommendation.state) + '">' +
          escapeHtml(recommendation.label) +
        "</p>" +
        '<p class="sound-lab-block__lede"><strong>' + escapeHtml(recommendation.item.name) + "</strong> - " + escapeHtml(recommendation.message || "") + "</p>" +
        '<p class="sound-lab-block__note">' + escapeHtml(heuristics.disclaimer) + "</p>" +
      "</section>"
    );
  }

  function renderSelectedSoundCard(item) {
    var match = deriveEntryMatch(item);
    var isApplied = item.id === state.appliedId;
    return (
      '<section class="sound-lab-block">' +
        '<p class="sound-lab-block__eyebrow">Selected Sound</p>' +
        "<h3>" + escapeHtml(item.name) + "</h3>" +
        '<p class="sound-lab-block__lede">' + escapeHtml(item.summary || "") + "</p>" +
        '<p class="sound-lab-detail__status sound-lab-detail__status--' + escapeHtml(match.state) + '">' +
          escapeHtml(match.label) +
          (isApplied ? " \u00b7 currently applied to BRB" : " \u00b7 manual selection only") +
        "</p>" +
        '<dl class="sound-lab-metrics">' +
          '<div class="sound-lab-metric"><dt>Bundle</dt><dd>' + escapeHtml(formatSourceBundle(item.source_bundle)) + "</dd></div>" +
          '<div class="sound-lab-metric"><dt>Source pack</dt><dd>' + escapeHtml(item.source_name) + "</dd></div>" +
          '<div class="sound-lab-metric"><dt>License</dt><dd>' + escapeHtml(item.license_spdx) + "</dd></div>" +
          '<div class="sound-lab-metric"><dt>Adapter</dt><dd>' + escapeHtml(formatSourceType(item.source_type)) + "</dd></div>" +
        "</dl>" +
        '<p class="sound-lab-tags">' + escapeHtml((item.tags || []).join(" \u00b7 ")) + "</p>" +
      "</section>"
    );
  }

  function renderActionCard(item) {
    var canPreview = window.BRB && typeof window.BRB.previewSoundProfile === "function";
    var canApply = window.BRB && typeof window.BRB.setSoundProfile === "function";
    var canClear = window.BRB && typeof window.BRB.clearSoundProfile === "function";
    var isApplied = item.id === state.appliedId;
    return (
      '<section class="sound-lab-block sound-lab-block--actions">' +
        '<p class="sound-lab-block__eyebrow">Actions</p>' +
        '<div class="sound-lab-actions">' +
          '<button class="sound-lab-action" type="button" id="soundLabPreview"' + (canPreview ? "" : " disabled") + ">Preview</button>" +
          '<button class="sound-lab-action sound-lab-action--primary" type="button" id="soundLabApply"' + (canApply ? "" : " disabled") + ">" + escapeHtml(isApplied ? "Applied to BRB" : "Apply to BRB") + "</button>" +
          '<button class="sound-lab-action" type="button" id="soundLabClear"' + (canClear && state.appliedId ? "" : " disabled") + ">Clear</button>" +
        "</div>" +
        '<p class="sound-lab-block__note">Preview uses the selected sound only. Real BRB button presses use the currently applied sound profile.</p>' +
      "</section>"
    );
  }

  function renderAttributionCard(item) {
    return (
      '<section class="sound-lab-block sound-lab-block--attribution">' +
        '<p class="sound-lab-block__eyebrow">Source + Attribution</p>' +
        '<div class="sound-lab-files">' +
          '<div class="sound-lab-file">' +
            '<a class="sound-lab-link" href="' + escapeHtml(item.notice_path) + '" target="_blank" rel="noopener noreferrer">Notice file</a>' +
            '<code>' + escapeHtml(item.notice_path) + "</code>" +
          "</div>" +
          '<div class="sound-lab-file">' +
            '<a class="sound-lab-link" href="' + escapeHtml(item.origin_path) + '" target="_blank" rel="noopener noreferrer">Origin file</a>' +
            '<code>' + escapeHtml(item.origin_path) + "</code>" +
          "</div>" +
          '<div class="sound-lab-file">' +
            '<a class="sound-lab-link" href="' + escapeHtml(item.license_path) + '" target="_blank" rel="noopener noreferrer">License text</a>' +
            '<code>' + escapeHtml(item.license_path) + "</code>" +
          "</div>" +
          '<div class="sound-lab-file">' +
            '<a class="sound-lab-link" href="' + escapeHtml(item.source_manifest_path) + '" target="_blank" rel="noopener noreferrer">Bundle manifest</a>' +
            '<code>' + escapeHtml(item.source_manifest_path) + "</code>" +
          "</div>" +
        "</div>" +
        '<p class="sound-lab-block__note">MIT and GPL assets remain in separate vendored bundle paths and are not merged into a single undifferentiated source tree.</p>' +
      "</section>"
    );
  }

  function renderSoundError() {
    if (!state.soundError || !state.soundError.message) return "";
    return (
      '<section class="sound-lab-block sound-lab-block--error">' +
        '<p class="sound-lab-block__eyebrow">Sound Runtime</p>' +
        '<p class="sound-lab-error-inline">' + escapeHtml(state.soundError.message) + "</p>" +
      "</section>"
    );
  }

  function renderDetail() {
    var item = currentSelectedItem();
    if (!item) {
      return '<div class="sound-lab-detail"><p class="sound-lab-empty">Choose a local sound profile to inspect its source, recommendation state, and attribution.</p></div>';
    }
    return (
      '<div class="sound-lab-detail">' +
        renderSwitchSelectionCard() +
        renderRecommendationCard() +
        renderSelectedSoundCard(item) +
        renderActionCard(item) +
        renderAttributionCard(item) +
        renderSoundError() +
      "</div>"
    );
  }

  function renderApp() {
    var filtered = getFilteredItems();
    ensureSelectedItem(filtered);
    return (
      '<div class="sound-lab-app">' +
        '<div class="sound-lab-controls">' +
          '<label class="sound-lab-field">' +
            '<span class="sound-lab-label">Search sounds</span>' +
            '<input class="sound-lab-search" id="soundLabSearch" type="search" value="' + escapeHtml(state.search) + '" placeholder="Search by sound, source, or tag">' +
          "</label>" +
          '<div class="sound-lab-filter-group">' +
            '<div class="sound-lab-label">Source</div>' +
            '<div class="sound-lab-filter-row">' + renderChips(sourceOptions(), state.source, "source") + "</div>" +
          "</div>" +
          '<div class="sound-lab-results-meta">Showing ' + escapeHtml(formatCount(filtered.length)) + " of " + escapeHtml(formatCount(state.catalog.length)) + " local sounds</div>" +
          '<div class="sound-lab-list">' + renderResults(filtered) + "</div>" +
        "</div>" +
        renderDetail() +
      "</div>"
    );
  }

  function updateMeta() {
    if (!meta) return;
    if (!state.catalog.length) {
      meta.textContent = "Loading sound catalog...";
      return;
    }
    var generatedAt = formatDate(state.catalogGeneratedAt || state.matching && state.matching.generatedAt);
    meta.textContent =
      "Catalog " + generatedAt +
      " | " + formatCount(state.catalog.length) +
      " local sound profiles | MIT and GPL kept in separate bundles";
  }

  function bindEvents() {
    var searchInput = document.getElementById("soundLabSearch");
    var previewButton = document.getElementById("soundLabPreview");
    var applyButton = document.getElementById("soundLabApply");
    var clearButton = document.getElementById("soundLabClear");
    var itemButtons = root.querySelectorAll("[data-sound-id]");
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
        state[this.getAttribute("data-filter")] = this.getAttribute("data-value") || "all";
        render();
      });
    }

    for (i = 0; i < itemButtons.length; i++) {
      itemButtons[i].addEventListener("click", function () {
        state.selectedId = this.getAttribute("data-sound-id");
        render();
      });
    }

    if (previewButton) {
      previewButton.addEventListener("click", function () {
        var item = currentSelectedItem();
        if (!item || !window.BRB || typeof window.BRB.previewSoundProfile !== "function") return;
        state.soundError = null;
        window.BRB.previewSoundProfile(item, 120, { source: "sound-lab-preview" });
      });
    }

    if (applyButton) {
      applyButton.addEventListener("click", function () {
        var item = currentSelectedItem();
        if (!item || !window.BRB || typeof window.BRB.setSoundProfile !== "function") return;
        state.soundError = null;
        window.BRB.setSoundProfile(item);
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", function () {
        if (!window.BRB || typeof window.BRB.clearSoundProfile !== "function") return;
        state.soundError = null;
        window.BRB.clearSoundProfile();
      });
    }
  }

  function restoreAppliedSoundProfile() {
    syncAppliedIdFromRuntime();
    if (state.appliedId && state.catalogById[state.appliedId]) return;
    var storedId = window.BRB && typeof window.BRB.getStoredSoundProfileId === "function"
      ? window.BRB.getStoredSoundProfileId()
      : null;
    if (storedId && state.catalogById[storedId] && window.BRB && typeof window.BRB.setSoundProfile === "function") {
      window.BRB.setSoundProfile(state.catalogById[storedId], { skipPersist: true });
      state.appliedId = storedId;
      return;
    }
    if (storedId && !state.catalogById[storedId] && window.BRB && typeof window.BRB.clearSoundProfile === "function") {
      window.BRB.clearSoundProfile();
    }
  }

  function render() {
    if (state.error) {
      root.setAttribute("data-state", "error");
      root.innerHTML = '<p class="sound-lab-error">' + escapeHtml(state.error) + "</p>";
      updateMeta();
      return;
    }
    if (!state.catalog.length || !state.matching) {
      root.setAttribute("data-state", "loading");
      root.innerHTML = '<p class="sound-lab-loading">Loading local sound sources and attribution data.</p>';
      updateMeta();
      return;
    }
    state.switchSelection = readSwitchSelection();
    syncAppliedIdFromRuntime();
    state.recommendation = computeRecommendation();
    root.setAttribute("data-state", "ready");
    root.innerHTML = renderApp();
    updateMeta();
    bindEvents();
  }

  function loadInitialState() {
    Promise.all([fetchJson(CATALOG_URL), fetchJson(MATCHING_URL)])
      .then(function (payloads) {
        var catalogPayload = payloads[0] || {};
        state.catalog = catalogPayload.items || [];
        state.catalogById = buildCatalogIndex(state.catalog);
        state.catalogGeneratedAt = catalogPayload.generatedAt || null;
        state.matching = payloads[1] || null;
        restoreAppliedSoundProfile();
        state.switchSelection = readSwitchSelection();
        state.recommendation = computeRecommendation();
        render();
      })
      .catch(function (error) {
        state.error = error.message || "Failed to load local sound catalog assets.";
        render();
      });
  }

  window.addEventListener("brb:switch-lab-selection-change", function (event) {
    state.switchSelection = event && event.detail ? event.detail : readSwitchSelection();
    state.recommendation = computeRecommendation();
    render();
  });

  window.addEventListener("brb:sound-profile-change", function () {
    syncAppliedIdFromRuntime();
    render();
  });

  window.addEventListener("brb:sound-runtime-error", function (event) {
    state.soundError = event && event.detail ? event.detail : null;
    render();
  });

  state.switchSelection = readSwitchSelection();
  state.recommendation = computeRecommendation();
  render();
  loadInitialState();
})();

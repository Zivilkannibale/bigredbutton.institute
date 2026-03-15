(function () {
  var ROOT_ID = "switchLabRoot";
  var META_ID = "switchLabMeta";
  var STORAGE_KEY = "brb.switchProfileId";
  var CATALOG_URL = "data/switchesdb/catalog.json";
  var PROFILES_URL = "data/switchesdb/profiles.json";
  var MANIFEST_URL = "data/switchesdb/manifest.json";
  var RESULT_LIMIT = 18;

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
    error: null
  };

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

  function titleCase(value) {
    if (!value) return "Unknown";
    return value.charAt(0).toUpperCase() + value.slice(1);
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

  function currentSelectedItem() {
    return state.selectedId ? state.catalogById[state.selectedId] || null : null;
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
      for (i = 0; i < items.length; i++) {
        map[items[i].id] = items[i];
      }
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
    var peakForce = profile && profile.metrics ? profile.metrics.peakForceGf : item.metrics && item.metrics.peakForceGf;
    var travel = profile && profile.metrics ? profile.metrics.totalTravelMm : item.metrics && item.metrics.totalTravelMm;
    var pieces = [family + " profile"];
    if (peakForce != null) pieces.push(formatForce(peakForce) + " peak");
    if (travel != null) pieces.push(formatTravel(travel) + " travel");
    return pieces.join(" · ");
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

  function renderDetail() {
    var item = currentSelectedItem();
    if (!item) {
      return '<div class="switch-lab-detail"><p class="switch-lab-empty">Choose a switch to inspect its BRB profile mapping.</p></div>';
    }
    var profile = state.profilesById ? state.profilesById[item.id] : null;
    var metrics = profile && profile.metrics ? profile.metrics : item.metrics || {};
    var applied = item.id === state.appliedId;
    var applyLabel = applied ? "Applied to BRB" : "Apply to BRB";
    var statusClass = "switch-lab-detail__status" + (applied ? " is-applied" : "");
    var statusText = applied
      ? "This switch is currently driving the BRB press profile."
      : "Select apply to map this measured switch to the BRB button.";
    return (
      '<div class="switch-lab-detail">' +
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
        "</div>" +
        '<div class="switch-lab-links">' +
          '<a class="switch-lab-link" href="' + escapeHtml(item.switchesDbAppUrl) + '" target="_blank" rel="noopener noreferrer">View original</a>' +
          '<a class="switch-lab-link" href="' + escapeHtml(item.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Source dataset</a>' +
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

  function bindEvents() {
    var searchInput = document.getElementById("switchLabSearch");
    var applyButton = document.getElementById("switchLabApply");
    var testButton = document.getElementById("switchLabTest");
    var clearButton = document.getElementById("switchLabClear");
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
  }

  function render() {
    if (state.error) {
      root.setAttribute("data-state", "error");
      root.innerHTML = '<p class="switch-lab-error">' + escapeHtml(state.error) + "</p>";
      updateMeta();
      return;
    }
    if (!state.catalog.length) {
      root.setAttribute("data-state", "loading");
      root.innerHTML = '<p class="switch-lab-loading">Loading switch profiles from the local BRB sync cache.</p>';
      updateMeta();
      return;
    }
    syncAppliedIdFromRuntime();
    root.setAttribute("data-state", "ready");
    root.innerHTML = renderApp();
    updateMeta();
    bindEvents();
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

  function restoreStoredSelection() {
    var storedId = getStoredId();
    if (storedId && state.catalogById[storedId]) {
      state.selectedId = storedId;
      applyProfileById(storedId, { silent: true }).catch(function () {
        storeSelectedId(null);
      });
      return;
    }
    if (state.catalog.length) state.selectedId = state.catalog[0].id;
  }

  function loadInitialState() {
    Promise.all([fetchJson(CATALOG_URL), fetchJson(MANIFEST_URL)])
      .then(function (payloads) {
        var catalogPayload = payloads[0] || {};
        state.catalog = catalogPayload.items || [];
        state.catalogById = buildCatalogIndex(state.catalog);
        state.manifest = payloads[1] || null;
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
    render();
  });

  render();
  loadInitialState();
})();

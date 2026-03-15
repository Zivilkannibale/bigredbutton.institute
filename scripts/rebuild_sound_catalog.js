const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "data", "audio", "catalog.json");
const matchingPath = path.join(rootDir, "data", "audio", "matching.json");
const bucklespringManifestPath = path.join(rootDir, "data", "audio", "bucklespring-gpl", "manifest.json");

const BUNDLE_PATHS = {
  notice_path: "data/audio/bucklespring-gpl/THIRD_PARTY_NOTICES.md",
  origin_path: "data/audio/bucklespring-gpl/ORIGINS/bucklespring-README.md",
  license_path: "data/audio/bucklespring-gpl/LICENSES/bucklespring-GPL-2.0.txt",
  source_manifest_path: "data/audio/bucklespring-gpl/manifest.json"
};

const PROFILE_TEMPLATES = {
  canonical: {
    family_targets: { clicky: 1, tactile: 0.45, linear: 0.02 },
    clickiness_range: [0.9, 1],
    thock_range: [0.1, 0.35],
    attack_values: ["sharp"],
    summary: "Buckling-spring archetype with extreme click emphasis."
  },
  sharp: {
    family_targets: { clicky: 0.96, tactile: 0.42, linear: 0.03 },
    clickiness_range: [0.86, 1],
    thock_range: [0.12, 0.36],
    attack_values: ["sharp"],
    summary: "Buckling-spring analogue that stays close to the bright, sharp canonical profile."
  },
  wide: {
    family_targets: { clicky: 0.9, tactile: 0.48, linear: 0.02 },
    clickiness_range: [0.78, 0.96],
    thock_range: [0.18, 0.46],
    attack_values: ["sharp", "firm"],
    summary: "Buckling-spring analogue with slightly more body than the canonical fallback pair."
  },
  cluster: {
    family_targets: { clicky: 0.92, tactile: 0.44, linear: 0.02 },
    clickiness_range: [0.82, 1],
    thock_range: [0.1, 0.4],
    attack_values: ["sharp"],
    summary: "Buckling-spring analogue exposed by upstream keycode rather than a guessed semantic label."
  },
  generic: {
    family_targets: { clicky: 0.94, tactile: 0.43, linear: 0.02 },
    clickiness_range: [0.84, 1],
    thock_range: [0.12, 0.38],
    attack_values: ["sharp"],
    summary: "Buckling-spring analogue exposed as a single-button pair by upstream keycode."
  }
};

const SPECIAL_PAIR_SPECS = {
  "01": {
    id: "bucklespring-gpl-esc-01",
    name: "Bucklespring Esc Pair",
    source_name: "bucklespring sample 0x01 (Esc)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "esc"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x01 (Esc), kept separate inside the GPL bundle.",
    profile: "sharp"
  },
  "0e": {
    id: "bucklespring-gpl-backspace-0e",
    name: "Bucklespring Backspace Pair",
    source_name: "bucklespring sample 0x0e (Backspace)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "backspace"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x0E (Backspace), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "0f": {
    id: "bucklespring-gpl-tab-0f",
    name: "Bucklespring Tab Pair",
    source_name: "bucklespring sample 0x0f (Tab)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "tab"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x0F (Tab), kept separate inside the GPL bundle.",
    profile: "sharp"
  },
  "1c": {
    id: "bucklespring-gpl-enter-1c",
    name: "Bucklespring Enter Pair",
    source_name: "bucklespring sample 0x1c (Enter)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "enter"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x1C (Enter), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "29": {
    id: "bucklespring-gpl-grave-29",
    name: "Bucklespring Grave Pair",
    source_name: "bucklespring sample 0x29 (Grave)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "grave"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x29 (Grave), kept separate inside the GPL bundle.",
    profile: "sharp"
  },
  "2a": {
    id: "bucklespring-gpl-left-shift-2a",
    name: "Bucklespring Left Shift Pair",
    source_name: "bucklespring sample 0x2a (Left Shift)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "left-shift"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x2A (Left Shift), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "31": {
    id: "bucklespring-gpl-canonical-31",
    name: "Bucklespring Canonical Pair",
    source_name: "bucklespring fallback sample 0x31",
    tags: ["buckling-spring", "clicky", "bright", "sharp"],
    summary: "Canonical single-button bucklespring mapping using the upstream 0x31 fallback press and release pair.",
    profile: "canonical"
  },
  "36": {
    id: "bucklespring-gpl-right-shift-36",
    name: "Bucklespring Right Shift Pair",
    source_name: "bucklespring sample 0x36 (Right Shift)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "right-shift"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x36 (Right Shift), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "39": {
    id: "bucklespring-gpl-space-39",
    name: "Bucklespring Space Pair",
    source_name: "bucklespring sample 0x39 (Space)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "space"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x39 (Space), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "3a": {
    id: "bucklespring-gpl-caps-3a",
    name: "Bucklespring Caps Lock Pair",
    source_name: "bucklespring sample 0x3a (Caps Lock)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "caps-lock"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x3A (Caps Lock), kept separate inside the GPL bundle.",
    profile: "sharp"
  },
  "47": {
    id: "bucklespring-gpl-cluster-47",
    name: "Bucklespring Pair 0x47",
    source_name: "bucklespring sample 0x47",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "keycode-47"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x47, surfaced by keycode rather than guessed semantics.",
    profile: "cluster"
  },
  "4c": {
    id: "bucklespring-gpl-cluster-4c",
    name: "Bucklespring Pair 0x4C",
    source_name: "bucklespring sample 0x4c",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "keycode-4c"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x4C, surfaced by keycode rather than guessed semantics.",
    profile: "cluster"
  },
  "56": {
    id: "bucklespring-gpl-iso-56",
    name: "Bucklespring ISO Extra Pair",
    source_name: "bucklespring sample 0x56 (ISO extra)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "iso-extra"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x56 (ISO extra), kept separate inside the GPL bundle.",
    profile: "wide"
  },
  "60": {
    id: "bucklespring-gpl-kp-enter-60",
    name: "Bucklespring Keypad Enter Pair",
    source_name: "bucklespring sample 0x60 (Keypad Enter)",
    tags: ["buckling-spring", "clicky", "bright", "sharp", "keypad-enter"],
    summary: "Single-button bucklespring mapping for upstream keycode 0x60 (Keypad Enter), kept separate inside the GPL bundle.",
    profile: "wide"
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function preferredBundleOrder(bundle) {
  if (bundle === "mechvibes-mit") return 0;
  if (bundle === "bucklespring-gpl") return 1;
  return 2;
}

function sortItems(left, right) {
  const bundleDelta = preferredBundleOrder(left.source_bundle) - preferredBundleOrder(right.source_bundle);
  if (bundleDelta !== 0) return bundleDelta;
  if (left.source_bundle !== right.source_bundle) {
    return String(left.source_bundle).localeCompare(String(right.source_bundle));
  }
  return String(left.name).localeCompare(String(right.name));
}

function buildBucklespringPairs(manifest) {
  const files = (((manifest || {}).sample_collection || {}).files) || [];
  const byKeycode = new Map();
  for (const file of files) {
    if (!file || !file.keycode_hex) continue;
    const keycode = String(file.keycode_hex).toLowerCase();
    if (!byKeycode.has(keycode)) byKeycode.set(keycode, {});
    byKeycode.get(keycode)[String(file.event_value)] = file;
  }
  return Array.from(byKeycode.entries())
    .filter(([, phases]) => phases["0"] && phases["1"])
    .sort((left, right) => parseInt(left[0], 16) - parseInt(right[0], 16));
}

function buildBucklespringItem(keycode) {
  const lowerKeycode = String(keycode).toLowerCase();
  const upperKeycode = lowerKeycode.toUpperCase();
  const special = SPECIAL_PAIR_SPECS[lowerKeycode] || null;
  const pressPath = `data/audio/bucklespring-gpl/wav/${lowerKeycode}-1.wav`;
  const releasePath = `data/audio/bucklespring-gpl/wav/${lowerKeycode}-0.wav`;
  const name = special ? special.name : `Bucklespring Pair 0x${upperKeycode}`;
  const sourceName = special ? special.source_name : `bucklespring sample 0x${lowerKeycode}`;
  const summary = special
    ? special.summary
    : `Single-button bucklespring mapping for upstream keycode 0x${upperKeycode}, kept separate inside the GPL bundle.`;
  const tags = special
    ? special.tags.slice()
    : ["buckling-spring", "clicky", "bright", "sharp", `keycode-${lowerKeycode}`];

  return {
    item: {
      id: special ? special.id : `bucklespring-gpl-pair-${lowerKeycode}`,
      name: name,
      source_bundle: "bucklespring-gpl",
      source_name: sourceName,
      source_type: "bucklespring-wav-pair",
      license_spdx: "GPL-2.0",
      previewPress: pressPath,
      previewRelease: releasePath,
      switch_families: ["clicky"],
      is_silent_compatible: false,
      tags: tags,
      notice_path: BUNDLE_PATHS.notice_path,
      origin_path: BUNDLE_PATHS.origin_path,
      license_path: BUNDLE_PATHS.license_path,
      source_manifest_path: BUNDLE_PATHS.source_manifest_path,
      summary: summary,
      adapter: {
        type: "bucklespring-wav-pair",
        source_keycodes: [lowerKeycode],
        press_variants: [pressPath],
        release_variants: [releasePath]
      }
    },
    profile: PROFILE_TEMPLATES[special ? special.profile : "generic"]
  };
}

function main() {
  const existingCatalog = readJson(catalogPath);
  const existingMatching = readJson(matchingPath);
  const manifest = readJson(bucklespringManifestPath);

  const preservedItems = (existingCatalog.items || []).filter((item) => item.source_bundle !== "bucklespring-gpl");
  const preservedIds = new Set(preservedItems.map((item) => item.id));
  const preservedProfiles = {};
  for (const [id, profile] of Object.entries(existingMatching.profiles || {})) {
    if (preservedIds.has(id)) preservedProfiles[id] = profile;
  }

  const bucklespringPairs = buildBucklespringPairs(manifest);
  const bucklespringItems = [];
  const bucklespringProfiles = {};

  for (const [keycode] of bucklespringPairs) {
    const generated = buildBucklespringItem(keycode);
    bucklespringItems.push(generated.item);
    bucklespringProfiles[generated.item.id] = generated.profile;
  }

  const nextCatalog = {
    generatedAt: new Date().toISOString(),
    items: preservedItems.concat(bucklespringItems).sort(sortItems)
  };

  const nextMatching = {
    generatedAt: new Date().toISOString(),
    states: existingMatching.states || [],
    heuristics: existingMatching.heuristics || {},
    profiles: Object.assign({}, preservedProfiles, bucklespringProfiles)
  };

  writeJson(catalogPath, nextCatalog);
  writeJson(matchingPath, nextMatching);

  const counts = nextCatalog.items.reduce((acc, item) => {
    acc[item.source_bundle] = (acc[item.source_bundle] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    catalogCount: nextCatalog.items.length,
    counts,
    bucklespringPairs: bucklespringItems.length,
    matchingProfiles: Object.keys(nextMatching.profiles).length
  }, null, 2));
}

main();

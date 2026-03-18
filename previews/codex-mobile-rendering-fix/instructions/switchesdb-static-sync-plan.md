# SwitchesDB Static Sync Integration Plan

## Goal

Keep users on the Big Red Button site while letting them choose a keyboard switch profile derived from SwitchesDB data, then use that profile to drive the BRB button animation and related press behavior.

This plan assumes:

- the BRB site remains a static site
- upstream data is pulled by a scheduled GitHub Actions workflow
- BRB hosts its own normalized copy of the selector data
- BRB visibly credits SwitchesDB and links back to the original project

## Current repo fit

The existing site is already a good fit for this approach:

- `index.html` contains the site markup and the floating pedestal shell
- `index.runtime.js` owns the press logic, timing, animation triggers, and `window.BRB.triggerPress(...)`
- `visual-workover.css` owns the presentation layer
- `.github/workflows/pages-sync.yml` already publishes the static site to `gh-pages`

That means the missing piece is not hosting. The missing piece is a scheduled data import and a small client-side selector UI.

## Hard constraints

## 1. No direct browser fetch to SwitchesDB

`switchesdb.com` does not expose permissive browser CORS headers, so BRB cannot safely depend on live client-side fetches from the user's browser.

## 2. Static site only

There is no app server in this repo. Any integration must end in static assets committed to the repo or published by GitHub Pages.

## 3. Data licensing needs a narrow first version

SwitchesDB code is open source, but the measurements are aggregated from third-party sources. The first BRB implementation should sync metadata and derived animation parameters, not mirror the entire original application UI.

## Recommended architecture

Use a three-layer model:

1. Scheduled sync job pulls upstream metadata and selected source files.
2. A normalization script converts upstream data into BRB-owned static JSON.
3. The BRB front end reads those local JSON files and renders a native selector UI.

This keeps the live site static while still feeling current.

## Proposed repo additions

### New data directory

Add:

- `data/switchesdb/catalog.json`
- `data/switchesdb/profiles.json`
- `data/switchesdb/manifest.json`

Purpose:

- `catalog.json`: user-facing switch list and filters
- `profiles.json`: derived animation presets keyed by switch id
- `manifest.json`: sync timestamp, upstream revision markers, and attribution info

### New sync script

Add:

- `scripts/sync_switchesdb.py`

Reasoning:

- Python is the simplest fit for a GitHub Actions scheduled job
- the workflow can install `edn_format` during the run
- no Node toolchain needs to be introduced into this static repo

### New workflow

Add:

- `.github/workflows/switchesdb-sync.yml`

Responsibilities:

- run on `schedule`
- run on `workflow_dispatch`
- fetch upstream metadata
- optionally fetch a defined subset of raw curve files needed for BRB derivation
- regenerate local JSON
- commit only if generated files changed

## Upstream data source strategy

### Phase 1: metadata-first sync

Pull:

- `https://www.switchesdb.com/data/metadata.edn`

Extract:

- display name
- source key
- source label
- source author
- source URL
- raw file name
- canonical BRB id

This is enough to build search, filter, selection, attribution, and deep links.

### Phase 2: derived animation sync

For the selected set of switches or all switches, fetch the corresponding raw data files and derive:

- approximate switch family: `linear`, `tactile`, `clicky`, `unknown`
- total travel distance
- peak force
- bottom-out force
- tactile bump magnitude
- actuation-like midpoint estimate
- rebound sharpness heuristic

Do not expose the full raw graphing UI yet. Use the raw curves only to derive BRB animation parameters.

## Normalized data contract

### `data/switchesdb/catalog.json`

Suggested shape:

```json
{
  "generatedAt": "2026-03-15T12:00:00Z",
  "sourceSite": "https://www.switchesdb.com/",
  "switchCount": 2228,
  "items": [
    {
      "id": "gateron-silent-ink-v2-tg",
      "name": "Gateron Silent Ink V2",
      "sourceKey": "goat",
      "sourceLabel": "ThereminGoat",
      "sourceUrl": "https://github.com/ThereminGoat/force-curves",
      "upstreamFile": "Gateron Silent Ink V2~TG.csv",
      "switchesDbDataUrl": "https://www.switchesdb.com/data/Gateron%20Silent%20Ink%20V2~TG.csv",
      "switchesDbAppUrl": "https://www.switchesdb.com/#Gateron%20Silent%20Ink%20V2~TG.csv"
    }
  ]
}
```

### `data/switchesdb/profiles.json`

Suggested shape:

```json
{
  "generatedAt": "2026-03-15T12:00:00Z",
  "items": [
    {
      "id": "gateron-silent-ink-v2-tg",
      "family": "linear",
      "animationProfile": {
        "travelDepth": 0.78,
        "pressDurationMs": 110,
        "returnDurationMs": 88,
        "snapAt": 0.72,
        "overshoot": 0.06,
        "wobble": 0.02
      },
      "soundProfile": {
        "attack": "soft",
        "clickiness": 0.08,
        "thock": 0.62
      },
      "telemetryProfile": {
        "wavePeak": 0.92,
        "waveTail": 0.44
      },
      "metrics": {
        "peakForceGf": 63.5,
        "bottomOutForceGf": 67.8,
        "totalTravelMm": 3.7,
        "tactileBump": 0.04
      }
    }
  ]
}
```

### `data/switchesdb/manifest.json`

Suggested shape:

```json
{
  "generatedAt": "2026-03-15T12:00:00Z",
  "upstream": {
    "site": "https://www.switchesdb.com/",
    "metadataUrl": "https://www.switchesdb.com/data/metadata.edn"
  },
  "credits": [
    {
      "name": "SwitchesDB",
      "url": "https://www.switchesdb.com/"
    },
    {
      "name": "ThereminGoat",
      "url": "https://github.com/ThereminGoat/force-curves"
    },
    {
      "name": "HaaTa",
      "url": "https://plot.ly/~haata"
    },
    {
      "name": "bluepylons",
      "url": "https://github.com/bluepylons/Open-Switch-Curve-Meter"
    }
  ]
}
```

## Front-end integration plan

## 1. Add a BRB-native selector panel

Do not embed the SwitchesDB UI shell. Build a BRB-native control surface instead.

Recommended placement:

- add a new section below the field deployment area, or
- add a restrained drawer linked from the field deployment panel

Recommended controls:

- search input
- source filter
- family filter
- result list
- selected switch summary
- "Use this switch" button
- attribution block with "Data from SwitchesDB" and "View original" link

Avoid:

- iframe as the primary solution
- trying to recreate the full comparison graph tool in the first version
- decorative dashboard chrome

## 2. Add local fetches in `index.runtime.js`

Add startup fetches for:

- `/data/switchesdb/catalog.json`
- `/data/switchesdb/profiles.json`

Keep them optional:

- if the files fail to load, BRB should fall back to the existing default button behavior

## 3. Introduce a selected switch state

Add runtime state:

```js
var selectedSwitchId = null;
var selectedSwitchProfile = null;
```

Selection behavior:

- default to the current BRB animation if nothing is chosen
- persist the chosen switch in `localStorage`
- restore it on page load

## 4. Map switch profiles to BRB animation

Current integration points:

- `initPedestalFrames()`
- `animatePedestalFrames(...)`
- `injectWaveFromHold(...)`
- `handlePress(...)`

Recommended changes:

- keep the existing sprite frames for v1
- vary timing, depth impression, recoil, and telemetry shaping using the selected profile
- only add new sprite sets later if there is a real visual need

Practical v1 mapping:

- higher force -> slightly longer effective press duration
- larger travel -> slower compression / return
- tactile bump -> stronger midpoint snap
- clicky family -> sharper rebound and brighter sound profile
- silent family -> softer rebound and lower sound intensity

## 5. Add a profile application layer

Create small helper functions inside `index.runtime.js`:

- `loadSwitchCatalog()`
- `loadSwitchProfiles()`
- `applySwitchProfile(profile)`
- `getEffectivePressMotion(holdMs, profile)`
- `renderSwitchSelector()`

Do not rewrite the page into a framework. Keep it in plain JS to match the repo.

## Scheduled workflow plan

Create `.github/workflows/switchesdb-sync.yml` with:

- `on.schedule`
- `on.workflow_dispatch`
- `permissions.contents: write`

Recommended schedule:

- every 6 hours if you want near-live updates
- daily if you want lower churn

Suggested job flow:

1. checkout `main`
2. set up Python
3. install `edn_format`
4. run `python scripts/sync_switchesdb.py`
5. commit generated files only if changed
6. push to `main`

Effect:

- the commit to `main` triggers the existing `pages-sync.yml`
- the site republishes automatically to `gh-pages`

## Sync script responsibilities

`scripts/sync_switchesdb.py` should:

1. download `metadata.edn`
2. parse source metadata and switch list
3. normalize ids and display names
4. build attribution-rich catalog JSON
5. optionally fetch raw curve files needed for derived metrics
6. compute BRB animation heuristics
7. write deterministic JSON files
8. exit cleanly when upstream data is unchanged

Determinism matters. Generated JSON should be stable in key order and sort order to avoid noisy commits.

## ID normalization rule

Use a deterministic slug:

- lowercase
- spaces to `-`
- remove punctuation except internal hyphen separators
- suffix with source key

Examples:

- `Gateron Silent Ink V2~TG.csv` -> `gateron-silent-ink-v2-tg`
- `Kaihua Gold~HT.csv` -> `kaihua-gold-ht`

## UI implementation steps

### Step 1

Create static data pipeline only.

Deliverables:

- workflow
- sync script
- generated catalog JSON
- no visible UI yet

### Step 2

Add selector UI shell.

Deliverables:

- search
- list
- selection persistence
- attribution block

### Step 3

Connect selector to animation timing.

Deliverables:

- chosen switch affects press feel
- existing BRB animation still works with no selection

### Step 4

Add derived family badges and summary copy.

Deliverables:

- switch family
- force and travel summary
- original-source link

### Step 5

Optionally add a mini force-curve preview.

Deliverables:

- tiny local SVG/canvas sparkline
- no attempt to reproduce the entire SwitchesDB graphing experience

## Attribution requirements

The UI should include:

- "Switch data derived from SwitchesDB"
- link to `https://www.switchesdb.com/`
- per-switch source credit where appropriate
- footer credit to source datasets

Recommended copy:

> Switch data derived from SwitchesDB and original measurement datasets by ThereminGoat, HaaTa, and bluepylons. Open the original entry for full curve context.

Note:

- verify the exact preferred naming during implementation
- verify whether mirroring raw measurements is acceptable before storing more than the metadata and derived BRB parameters

## Risks and mitigations

### Upstream schema drift

Risk:

- `metadata.edn` changes shape

Mitigation:

- make the sync script fail loudly with a clear error
- keep the last successful generated JSON in repo
- do not delete old data on failed sync

### Branch protection

Risk:

- scheduled workflow cannot push to `main`

Mitigation:

- allow Actions to write to the branch, or
- have the workflow write to a dedicated data branch and merge via PR

### Data volume churn

Risk:

- syncing every source file creates large noisy commits

Mitigation:

- start with metadata-only sync
- store only derived BRB profile JSON in repo
- avoid checking in raw source files unless necessary

### UX overload

Risk:

- selector becomes a second app embedded inside BRB

Mitigation:

- keep the first version as a compact search-and-apply control
- one selected switch at a time
- one clear attribution path back to the source

## Recommended first implementation slice

Build this first:

- `scripts/sync_switchesdb.py`
- `.github/workflows/switchesdb-sync.yml`
- `data/switchesdb/catalog.json`
- `data/switchesdb/manifest.json`
- simple selector panel in BRB
- selected switch persisted in `localStorage`
- selected switch influences press timing only

Do not build this first:

- full SwitchesDB clone
- full graph comparison UI
- per-source advanced analysis controls
- heavy front-end rewrite

## Files that will likely change during implementation

- `index.html`
- `index.runtime.js`
- `visual-workover.css`
- `.github/workflows/switchesdb-sync.yml`
- `scripts/sync_switchesdb.py`
- `data/switchesdb/catalog.json`
- `data/switchesdb/profiles.json`
- `data/switchesdb/manifest.json`

## Acceptance criteria for v1

- BRB stays fully static
- switch data updates automatically on a schedule
- users can search and choose a switch without leaving BRB
- current button behavior still works with no selection
- selected switch changes the feel of the BRB press logic
- UI visibly credits SwitchesDB and original sources
- the site republishes automatically through the existing Pages flow

# Mechvibes MIT Asset Bundle

This directory is a vendor-ready export of the built-in audio packs from the upstream Mechvibes source repository.
It preserves the upstream licensing materials as published and does not add any rights beyond those upstream notices.

## What is included

- packs/: the 18 built-in audio packs copied from the upstream Mechvibes source tree.
- manifest.json: machine-readable provenance, source URLs, and notice-file references for each pack.
- THIRD_PARTY_NOTICES.md: the human-readable notice file to keep in your public site repo.
- ATTRIBUTION_SNIPPET.html: a small HTML block you can adapt for a credits or licenses page.
- LICENSES/: preserved upstream MIT notices.
- ORIGINS/: preserved upstream origin docs that were present in the source tree.

## Recommended carry-over into a public website repo

1. Copy this whole directory into your site repo unchanged, or preserve the same files if you reorganize it.
2. Keep LICENSES/Mechvibes-MIT.txt and THIRD_PARTY_NOTICES.md in version control.
3. Surface attribution from ATTRIBUTION_SNIPPET.html or equivalent on a public licenses or credits page.
4. If you ship holy-pandas, also keep LICENSES/holy-pandas-MIT.txt and ORIGINS/holy-pandas-README.md.
5. If you modify filenames or transcode assets, note that on your notices page.

## Provenance

- Upstream repo: https://github.com/hainguyents13/mechvibes
- Upstream commit: b7cb6332fa741f82bdf2281bf6d2b9990e84ddbb
- Upstream describe/tag: v2.3.6-11-gb7cb633
- Package version field: v2.3.5

## Current Sound Lab coverage

The BRB Sound Lab currently exposes all 18 vendored Mechvibes packs from this bundle.
Further Mechvibes expansion therefore means vendoring additional upstream packs or a different upstream source, not unlocking hidden packs already present in this directory.

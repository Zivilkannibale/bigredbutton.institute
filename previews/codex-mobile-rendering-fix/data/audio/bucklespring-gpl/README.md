# bucklespring GPL Audio Bundle

This directory is a vendor-ready export of the sampled keyboard sound assets from the upstream bucklespring repository.
It preserves the upstream GPL notice and origin documentation and keeps the sample files isolated from the MIT-licensed Mechvibes bundle.

## What is included

- `wav/`: the 209 upstream WAV samples copied from the bucklespring source tree.
- `manifest.json`: machine-readable provenance, source URLs, naming notes, and per-file metadata.
- `CURATED_SET.md`: the app-facing record for the paired keydown/keyup set currently surfaced by the BRB Sound Lab.
- `THIRD_PARTY_NOTICES.md`: the human-readable notice file to keep in your public site repo.
- `ATTRIBUTION_SNIPPET.html`: a small HTML block you can adapt for a credits or licenses page.
- `LICENSES/`: preserved upstream GPL notice.
- `ORIGINS/`: preserved upstream README describing the project and sample origin.

## Recommended carry-over into a public website repo

1. Copy this whole directory into your site repo unchanged, or preserve the same files if you reorganize it.
2. Keep `LICENSES/bucklespring-GPL-2.0.txt`, `ORIGINS/bucklespring-README.md`, and `THIRD_PARTY_NOTICES.md` in version control.
3. Surface attribution from `ATTRIBUTION_SNIPPET.html` or equivalent on a public licenses or credits page.
4. If you rename or transcode the WAV files for web playback, note that on your notices page and keep the source reference.
5. Keep this GPL bundle separate from the MIT bundle so site maintainers can make an explicit inclusion decision.
6. If you expose paired sample entries in the app UI, keep `CURATED_SET.md` in sync with the actual entry rules and naming.

## Provenance

- Upstream repo: https://github.com/zevv/bucklespring
- Upstream commit: 43274ed8bca545fde585d73d89086bf9ae5ed1d0
- Upstream describe/tag: v1.5.1-17-g43274ed
- Sample files copied: 209

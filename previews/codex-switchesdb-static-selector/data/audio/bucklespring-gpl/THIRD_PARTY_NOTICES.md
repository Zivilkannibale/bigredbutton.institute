# Third-Party Notices

This bundle copies the sampled IBM Model M sound files from the upstream bucklespring repository and preserves the upstream GPL notice and origin documentation.
It preserves the upstream licensing materials as published and does not add any rights beyond those upstream notices.

## Upstream project

- Project: bucklespring
- Repository: https://github.com/zevv/bucklespring
- Commit: 43274ed8bca545fde585d73d89086bf9ae5ed1d0
- Describe/tag: v1.5.1-17-g43274ed
- License: GPL-2.0
- Preserved notice: [LICENSES/bucklespring-GPL-2.0.txt](LICENSES/bucklespring-GPL-2.0.txt)
- Preserved origin README: [ORIGINS/bucklespring-README.md](ORIGINS/bucklespring-README.md)

## Sample set summary

- Directory copied from upstream: `wav/`
- WAV files copied: 209
- Event value `0` files: 105
- Event value `1` files: 104
- Filename pattern: `<hex-keycode>-<event-value>.wav`
- Phase mapping note: `keyup`/`keydown` is inferred from the upstream Linux input event values used in `rec.c` and `main.c`.

## Suggested public-site attribution

Add a visible link from your site to a licenses or credits page that includes:

- "Keyboard sound assets derived from bucklespring by Ico Doornekamp, redistributed under GPL-2.0."
- A link to the upstream repository and the preserved GPL text.
- A note if you renamed, trimmed, normalized, or transcoded any of the bundled WAV files.

## Redistribution notes

- Keep this bundle, the GPL notice, and the origin README in version control if you ship these files from a public site repo.
- Keep the source repository URL and commit reference available in your notices page or equivalent.
- If you convert these WAVs for web delivery, document that modification on your notices page and keep the resulting files under GPL-compatible redistribution terms.

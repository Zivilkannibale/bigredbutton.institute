# Sound Lab Paired Set

The Sound Lab now exposes every complete bucklespring keydown/keyup pair as its own single-button GPL source entry.
It still does not expose raw unpaired files as separate user-facing choices, and it does not try to run the full upstream keyboard emulator in-browser.

## Exposure rule

- include every upstream keycode that has both `<hex>-1.wav` and `<hex>-0.wav`
- map `-1` to the Sound Lab press phase and `-0` to the release phase
- keep each entry inside the preserved GPL bundle
- keep the user-facing entry tied to an exact upstream keycode
- reserve friendly labels for a small confidence-checked subset such as `Esc`, `Tab`, `Enter`, `Space`, and the canonical fallback pair

## Current paired coverage

- Total upstream WAV files in bundle: `209`
- Keydown files (`-1`): `104`
- Keyup files (`-0`): `105`
- Complete press/release pairs currently exposed by Sound Lab: `104`
- Unpaired upstream remainder: `1` keyup-only sample

## Naming rule

- The fallback pair remains `bucklespring-gpl-canonical-31`.
- Confidence-checked special keys keep descriptive names such as `bucklespring-gpl-esc-01`.
- All remaining pairs use a neutral `bucklespring-gpl-pair-<hex>` style so the app does not invent keyboard semantics it cannot justify from the preserved source files alone.

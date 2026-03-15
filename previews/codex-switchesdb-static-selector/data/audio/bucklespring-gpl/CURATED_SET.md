# Curated Sound Lab Set

The Sound Lab does not expose all 209 upstream bucklespring WAV files as separate user-facing choices.
It keeps bucklespring as a single-button GPL source and surfaces a documented curated subset of explicit press/release pairs instead.

This stays closer to the original upstream licensing and attribution model because:

- all exposed entries still point to files inside the preserved GPL bundle
- no bucklespring assets are merged into the MIT Mechvibes tree
- the public app can show which exact upstream keycode pair each entry uses
- the app still behaves like a button sound picker, not a full keyboard emulator

## Current curated entries

| Catalog id | Upstream keycode | Label | Rationale |
| --- | --- | --- | --- |
| `bucklespring-gpl-canonical-31` | `0x31` | Canonical fallback | Matches the upstream fallback sample path used by `main.c`; kept as the default BRB analogue. |
| `bucklespring-gpl-esc-01` | `0x01` | Esc pair | Explicit special-key pair exposed as its own single-button option. |
| `bucklespring-gpl-backspace-0e` | `0x0e` | Backspace pair | Wide-key special pair with its own up/down files. |
| `bucklespring-gpl-tab-0f` | `0x0f` | Tab pair | Modifier-row pair surfaced separately from the canonical fallback. |
| `bucklespring-gpl-enter-1c` | `0x1c` | Enter pair | Explicit return-key pair exposed as a single-button option. |
| `bucklespring-gpl-grave-29` | `0x29` | Grave pair | Top-left alphanumeric-row pair retained as a discrete variant. |
| `bucklespring-gpl-left-shift-2a` | `0x2a` | Left Shift pair | Left modifier pair surfaced for broader bucklespring coverage. |
| `bucklespring-gpl-right-shift-36` | `0x36` | Right Shift pair | Right modifier counterpart to the left-shift sample. |
| `bucklespring-gpl-space-39` | `0x39` | Space pair | Large-key pair retained as a manual single-button option. |
| `bucklespring-gpl-caps-3a` | `0x3a` | Caps Lock pair | Lock-key pair exposed as its own curated variant. |
| `bucklespring-gpl-cluster-47` | `0x47` | Pair 0x47 | Extra curated non-fallback pair kept by upstream keycode rather than guessed semantics. |
| `bucklespring-gpl-cluster-4c` | `0x4c` | Pair 0x4c | Extra curated non-fallback pair kept by upstream keycode rather than guessed semantics. |
| `bucklespring-gpl-iso-56` | `0x56` | ISO extra pair | ISO-style extra-key sample retained as a distinct explicit choice. |
| `bucklespring-gpl-kp-enter-60` | `0x60` | Keypad Enter pair | Separate keypad-enter style pair kept as a curated single-button entry. |

If this list grows further, keep it explicit and documented here rather than exposing the full raw WAV tree as an undifferentiated picker.

# Page display controls extraction

Base: 496fd5acd28edbac573882ab881160b18b85ab05 (PR #120).

Move header offset helpers, smooth scrolling and food-photo lightbox bindings into customer-page-controls.js. Original function and binding bodies are copied unchanged. Bootstrap wrappers retain local helper names, and header/lightbox binding runs at the same two original positions. Registration/creation does not access the DOM. No ticker configuration, menu or checkout logic is changed.

PAGE-CONTROLS-EXTRACTION-2026-11-25.json records exact bodies and hashes. Inverse reconstruction proves the entire original bootstrap, then chains through prior extractions.

Validation: 203 tests pass, zero failures/skips. Actual module is compared with released code for header height/hidden/fallback/missing cases and passive event bindings; scroll clamping across 32 motion/device/position combinations; and lightbox image source, image/backdrop/other targets and missing nodes. Syntax, script order and CRLF-aware whitespace checks pass. Hosted preview checks pending.

No design or order behaviour changes. Production publication awaits explicit approval.

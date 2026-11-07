# Cloudflare Access Pages plugin

Vendored from the official npm package `@cloudflare/pages-plugin-cloudflare-access`
version **1.0.5**, licensed MIT. This project’s Pages pipeline compiles Functions
without installing npm dependencies. The local copy preserves Access validation
without a build-setting change or an unresolved runtime import.

Source: https://github.com/cloudflare/pages-plugins/tree/main/packages/cloudflare-access

Copied `dist/functions/index.js` and `dist/src/api/index.js`. Changes are limited
to replacing the package self-import with `./api.mjs` and removing references to
unshipped source maps. Update both files together from the pinned official package.
The package lock retains the original distribution integrity hash.

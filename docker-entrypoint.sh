#!/bin/sh
# The image is built with NITRO_APP_BASE_URL=/__BASE_PATH__/ so every URL
# baked into the bundles carries a token. At container start we rewrite the
# token to the runtime BASE_PATH (empty for root). In-place substitution is
# safe across restarts: container env is immutable, so a changed BASE_PATH
# forces a recreate, which restores the pristine files from the image.
set -eu

TOKEN='__BASE_PATH__'
BASE_PATH="${BASE_PATH:-}"

# Normalise: ensure leading slash, strip trailing slash ("" and "/" become root)
BASE_PATH="/${BASE_PATH#/}"
BASE_PATH="${BASE_PATH%/}"

if [ -n "$BASE_PATH" ] && ! printf '%s' "$BASE_PATH" | grep -Eq '^(/[A-Za-z0-9._~-]+)+$'; then
  echo "ERROR: BASE_PATH '$BASE_PATH' is invalid." >&2
  echo "Expected a path like /downloader or /apps/downloader (segments of A-Za-z0-9._~-)." >&2
  exit 1
fi

echo "Configuring application base path: '${BASE_PATH:-/}'"

# TanStack Start stores the router basepath without a leading slash, so
# replace the slash-prefixed token first, then any bare tokens.
find .output -type f \
  \( -name '*.mjs' -o -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \) \
  -exec sed -i \
  -e "s|/${TOKEN}|${BASE_PATH}|g" \
  -e "s|${TOKEN}|${BASE_PATH#/}|g" \
  {} +

exec "$@"

#!/bin/bash
# Checks that a version can be released and prints its notes (from CHANGELOG.md):
#   scripts/release-notes.sh <tag>        e.g. v0.1.0
# Fails if the tag is not vX.Y.Z, does not match package.json, or has no
# "## X.Y.Z — Title" entry in CHANGELOG.md. Line 1 of the output is the title.
set -euo pipefail

cd "$(dirname "$0")/.."

TAG="${1:-}"
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
    echo "Error: '$TAG' is not a vX.Y.Z tag." >&2
    exit 1
}
VERSION="${TAG#v}"

PACKAGE_VERSION=$(node -p "require('./package.json').version")
[ "$PACKAGE_VERSION" = "$VERSION" ] || {
    echo "Error: the tag is $TAG but package.json says $PACKAGE_VERSION." >&2
    exit 1
}

TITLE_LINE=$(grep -m1 "^## $VERSION " CHANGELOG.md) || {
    echo "Error: '## $VERSION' was not found in CHANGELOG.md." >&2
    exit 1
}

NOTES=$(awk -v ver="$VERSION" '
    $0 ~ ("^## " ver " ") { state=1; next }
    state == 1 && /^## /  { exit }
    state == 1            { print }
' CHANGELOG.md)
[ -n "$(echo "$NOTES" | tr -d '[:space:]')" ] || {
    echo "Error: the CHANGELOG entry of $VERSION is empty." >&2
    exit 1
}

echo "Relic ${TITLE_LINE#\#\# }"
echo "$NOTES"

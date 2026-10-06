#!/bin/bash
set -e

echo "=== Relic Review Script ==="
echo

# 1. Clean caches and build artifacts
echo "[1/8] Cleaning caches and build artifacts..."
rm -rf ./build ./node_modules ./.eslintcache
if [ -d ./dist ]; then
  find ./dist -mindepth 1 ! -name '*.md' -exec rm -rf {} +
fi
echo "       Done."
echo

# 2. Install dependencies
echo "[2/8] Installing dependencies..."
pnpm install
echo "       Done."
echo

# 3. Refresh helper binaries (public/bin is gitignored, so it can be stale)
echo "[3/8] Refreshing helper binaries..."
pnpm download-helper-binaries
echo "       OK."
echo

# 4. Code check (TypeScript)
echo "[4/8] Running codecheck (tsc --noEmit)..."
pnpm codecheck
echo "       OK."
echo

# 5. Lint
echo "[5/8] Running lint..."
pnpm lint
echo "       OK."
echo

# 6. Prettier
echo "[6/8] Running prettier..."
pnpm prettier
echo "       OK."
echo

# 7. i18n check
echo "[7/8] Running i18n check..."
pnpm i18n --ci
echo "       OK."
echo

# 8. Build AppImage
echo "[8/8] Building AppImage..."
pnpm run dist:linux
echo "       Done."
echo

echo "=== Review complete ==="

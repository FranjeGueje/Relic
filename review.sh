#!/bin/bash
set -e

echo "=== Relic Review Script ==="
echo

# 1. Clean caches and build artifacts
echo "[1/7] Cleaning caches and build artifacts..."
rm -rf ./build ./node_modules ./.eslintcache
if [ -d ./dist ]; then
  find ./dist -mindepth 1 ! -name '*.md' -exec rm -rf {} +
fi
echo "       Done."
echo

# 2. Install dependencies
echo "[2/7] Installing dependencies..."
pnpm install
echo "       Done."
echo

# 3. Code check (TypeScript)
echo "[3/7] Running codecheck (tsc --noEmit)..."
pnpm codecheck
echo "       OK."
echo

# 4. Lint
echo "[4/7] Running lint..."
pnpm lint
echo "       OK."
echo

# 5. Prettier
echo "[5/7] Running prettier..."
pnpm prettier
echo "       OK."
echo

# 6. i18n check
echo "[6/7] Running i18n check..."
pnpm i18n --ci
echo "       OK."
echo

# 7. Build AppImage
echo "[7/7] Building AppImage..."
pnpm run dist:linux
echo "       Done."
echo

echo "=== Review complete ==="

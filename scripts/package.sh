#!/bin/bash
# Builds dist/relic-<version>-<arch>.AppImage (+ .sha256): a single file to run, or to point a Steam
# shortcut at. It is mounted by FUSE and extracts nothing to disk. Without FUSE:
#   ./relic-<version>-<arch>.AppImage --appimage-extract-and-run
#
# The app needs no node_modules: React is inside the built bundle. Electron is the one this
# checkout already has (or ELECTRON_DIST), so the package is for the architecture of this machine.
#
# Usage: scripts/package.sh
set -euo pipefail

cd "$(dirname "$0")/.."

APPIMAGETOOL_VERSION=1.9.1
RUNTIME_VERSION=20251108
case "$(uname -m)" in
    x86_64)
        ARCH=x64
        TOOL_ARCH=x86_64
        TOOL_SHA256=ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0
        RUNTIME_SHA256=2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d
        ;;
    aarch64 | arm64)
        ARCH=arm64
        TOOL_ARCH=aarch64
        TOOL_SHA256=f0837e7448a0c1e4e650a93bb3e85802546e60654ef287576f46c71c126a9158
        RUNTIME_SHA256=00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444
        ;;
    *)
        echo "Error: unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
esac
VERSION=$(node -p "require('./package.json').version")
OUT_DIR="dist"
APPDIR="$OUT_DIR/relic.AppDir"
APP="$APPDIR/usr/lib/relic"
IMAGE="$OUT_DIR/relic-${VERSION}-${ARCH}.AppImage"
ELECTRON="${ELECTRON_DIST:-node_modules/electron/dist}"
TOOL="$OUT_DIR/.tools/appimagetool-${APPIMAGETOOL_VERSION}-${TOOL_ARCH}.AppImage"
RUNTIME="$OUT_DIR/.tools/runtime-${RUNTIME_VERSION}-${TOOL_ARCH}"

[ -x "$ELECTRON/electron" ] || {
    echo "Error: Electron is not installed ($ELECTRON/electron). Run: pnpm install" >&2
    exit 1
}

echo "[1/5] Getting appimagetool ${APPIMAGETOOL_VERSION} and its runtime ${RUNTIME_VERSION}..."
# Both are pinned and checked, and kept in dist/.tools: nothing is fetched at build time without a checksum
fetch() { # <file> <sha256> <url>
    [ -f "$1" ] && echo "$2  $1" | sha256sum -c - >/dev/null 2>&1 && return 0
    mkdir -p "$(dirname "$1")"
    curl -fsSL -o "$1" "$3"
    echo "$2  $1" | sha256sum -c - >/dev/null || {
        rm -f "$1"
        echo "Error: $(basename "$1") does not match its checksum" >&2
        exit 1
    }
}
fetch "$TOOL" "$TOOL_SHA256" \
    "https://github.com/AppImage/appimagetool/releases/download/${APPIMAGETOOL_VERSION}/appimagetool-${TOOL_ARCH}.AppImage"
fetch "$RUNTIME" "$RUNTIME_SHA256" \
    "https://github.com/AppImage/type2-runtime/releases/download/${RUNTIME_VERSION}/runtime-${TOOL_ARCH}"
chmod +x "$TOOL"

echo "[2/5] Building the app..."
pnpm build

echo "[3/5] Staging $APPDIR..."
rm -rf "$APPDIR"
mkdir -p "$APP"
cp -r "$ELECTRON"/. "$APP"/
mv "$APP/electron" "$APP/relic-bin"
rm -f "$APP/resources/default_app.asar"
# What the console does not use. chrome-sandbox cannot be setuid inside an AppImage: Chromium
# then uses user namespaces, and the renderer sandbox stays on (no --no-sandbox).
rm -f "$APP/chrome-sandbox" "$APP/libqt6_shim.so"
# The interface is English only, and Chromium falls back to en-US
find "$APP/locales" -name '*.pak' ! -name 'en-US.pak' -delete

mkdir -p "$APP/resources/app"
cp -r out "$APP/resources/app/out"
node -e "
const { name, version, license } = require('./package.json')
const pkg = { name, version, license, main: './out/main/index.js' }
require('fs').writeFileSync(process.argv[1], JSON.stringify(pkg, null, 2) + '\n')
" "$APP/resources/app/package.json"
cp LICENSE "$APP/LICENSE-relic"

cp assets/relic.png "$APPDIR/relic.png"
cp "$APPDIR/relic.png" "$APPDIR/.DirIcon"
cat >"$APPDIR/relic.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Relic
Comment=Console-mode client for rakun
Exec=relic
Icon=relic
Categories=Game;
DESKTOP

# Steam's runtime environment can break Electron, so it starts clean. The GPU driver writes its
# caches (~/.cache/mesa_shader_cache, radv_builtin_shaders) before the app's own code runs, so
# the cache folder is moved here, to the same folder src/main/paths.ts uses and the app removes
# on exit. The app gives rakunctl the original value back (RELIC_USER_XDG_CACHE_HOME).
cat >"$APPDIR/AppRun" <<'APPRUN'
#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
unset LD_PRELOAD LD_LIBRARY_PATH
SCRATCH="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/relic"
export RELIC_USER_XDG_CACHE_HOME="${XDG_CACHE_HOME:-}"
export XDG_CACHE_HOME="$SCRATCH/xdgCache"
export MESA_SHADER_CACHE_DIR="$SCRATCH/mesa"
mkdir -p "$XDG_CACHE_HOME" "$MESA_SHADER_CACHE_DIR"
# Not exec: Chromium still writes to its folders while it shuts down, so the folder is removed
# here, once it is gone. Not while another instance uses it (its lock is still there).
"$HERE/usr/lib/relic/relic-bin" "$@" &
PID=$!
trap 'kill -TERM "$PID" 2>/dev/null' TERM INT HUP
wait "$PID"
STATUS=$?
while kill -0 "$PID" 2>/dev/null; do
    wait "$PID"
    STATUS=$?
done
[ -L "$SCRATCH/userData/SingletonLock" ] || rm -rf "$SCRATCH"
exit "$STATUS"
APPRUN
chmod +x "$APPDIR/AppRun"

echo "[4/5] Creating $IMAGE..."
rm -f "$IMAGE" "$IMAGE.sha256"
# The tool is itself an AppImage: extract-and-run so building does not need FUSE
ARCH="$TOOL_ARCH" APPIMAGE_EXTRACT_AND_RUN=1 "$TOOL" --comp zstd --mksquashfs-opt -Xcompression-level --mksquashfs-opt 22 \
    --mksquashfs-opt -b --mksquashfs-opt 1M --runtime-file "$RUNTIME" "$APPDIR" "$IMAGE" >/dev/null

echo "[5/5] Checksum..."
(cd "$OUT_DIR" && sha256sum "$(basename "$IMAGE")" >"$(basename "$IMAGE").sha256")

echo "Done: $IMAGE ($(du -h "$IMAGE" | cut -f1))"

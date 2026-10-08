#!/bin/bash
# Instalador de Relic para Linux // Relic installer for Linux
# Uso // Usage: curl -sL https://raw.githubusercontent.com/FranjeGueje/Relic/master/scripts/install.sh | bash
#
# Descarga el AppImage de la última release a ~/.local/bin/Relic, comprueba su sha256 y, si se quiere,
# lo añade a Steam con sus grids. Solo escribe en ~/.local/bin y en las carpetas de Steam.
set -euo pipefail

REPO="FranjeGueje/Relic"
BIN_DIR="$HOME/.local/bin"
TARGET="$BIN_DIR/Relic"
OLD_APPIMAGE="$BIN_DIR/relic.AppImage"
STEAM_USERDATA="$HOME/.local/share/Steam/userdata"
GRIDS_BASE="https://raw.githubusercontent.com/$REPO/master/grids"

# ── Dependencias ──
MISSING=()
for cmd in curl sha256sum xdg-open xxd; do
    command -v "$cmd" &>/dev/null || MISSING+=("$cmd")
done
if [ ${#MISSING[@]} -gt 0 ]; then
    echo "Error: faltan dependencias // missing dependencies: ${MISSING[*]}" >&2
    exit 1
fi

case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64 | arm64) ARCH=arm64 ;;
    *)
        echo "Error: arquitectura no soportada // unsupported architecture: $(uname -m)" >&2
        exit 1
        ;;
esac

# Pregunta por el terminal aunque el script llegue por una tubería. Intro = sí; sin terminal, usa $2 (S|N)
ask() { # ask "texto" sin_terminal → 0 si sí
    local reply="$2"
    if { : </dev/tty; } 2>/dev/null; then
        reply=""
        read -r -p "$1" reply </dev/tty || true
    fi
    case "${reply:-S}" in
        [nN]*) return 1 ;;
        *) return 0 ;;
    esac
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── 1. Descargar y verificar ──
echo "Obteniendo última release... // Getting the latest release..."
TAG=$(curl -fs "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | cut -d '"' -f 4 || true)
if [ -z "$TAG" ]; then
    echo "Error: no se pudo obtener la última release // could not get the latest release." >&2
    exit 1
fi

NAME="relic-${TAG#v}-${ARCH}.AppImage"
RELEASE_URL="https://github.com/$REPO/releases/download/$TAG"

echo "Descargando $NAME... // Downloading $NAME..."
curl -fL -# -o "$TMP/$NAME" "$RELEASE_URL/$NAME"
curl -fsL -o "$TMP/$NAME.sha256" "$RELEASE_URL/$NAME.sha256" || {
    echo "Error: la release no publica $NAME.sha256 // the release has no $NAME.sha256." >&2
    exit 1
}
(cd "$TMP" && sha256sum -c "$NAME.sha256" >/dev/null 2>&1) || {
    echo "Error: la suma sha256 no coincide; descarga corrupta o manipulada. Instalación abortada." >&2
    echo "The sha256 does not match; corrupt or tampered download. Install aborted." >&2
    exit 1
}
echo "Verificación sha256 OK. // sha256 OK."

# ── 2. Instalar en ~/.local/bin/Relic ──
mkdir -p "$BIN_DIR"
if [ -e "$OLD_APPIMAGE" ]; then
    rm -f "$OLD_APPIMAGE"
    echo "Borrado el AppImage de la instalación anterior: $OLD_APPIMAGE"
fi
chmod +x "$TMP/$NAME"
# mv sobre el destino (mismo sistema de ficheros) para no pisar un Relic en ejecución
cp "$TMP/$NAME" "$TARGET.new"
mv -f "$TARGET.new" "$TARGET"
echo "Relic instalado en $TARGET // Relic installed at $TARGET"

if ! ask "¿Añadir Relic a Steam ahora? [S/n] // Add Relic to Steam now? [Y/n] " N; then
    echo ""
    echo "Relic instalado correctamente. // Relic installed correctly."
    echo "Puedes añadirlo a Steam más tarde añadiendo // You can add it to Steam later by adding: $TARGET"
    exit 0
fi

# ── 3. Añadir a Steam ──
urlencode() {
    local string="$1" encoded="" c i
    for ((i = 0; i < ${#string}; i++)); do
        c="${string:i:1}"
        case "$c" in
            [a-zA-Z0-9.~_-]) encoded+="$c" ;;
            *) encoded+=$(printf '%%%02X' "'$c") ;;
        esac
    done
    echo "$encoded"
}

# Carpetas de usuario de Steam (numéricas, sin la 0) con config/
user_dirs() {
    local d
    for d in "$STEAM_USERDATA"/*/; do
        d="${d%/}"
        case "${d##*/}" in 0 | *[!0-9]*) continue ;; esac
        [ -d "$d/config" ] && echo "$d"
    done
}

# AppID del último acceso directo de Relic en un shortcuts.vdf (4 bytes little-endian tras «appid»)
relic_appid() {
    [ -f "$1" ] && grep -aq '\.local/bin/Relic' "$1" || return 0
    xxd -p "$1" | tr -d '\n' | grep -oP '02617070696400\K[0-9a-f]{8}' | tail -1 | while read -r hex; do
        echo $((16#${hex:6:2}${hex:4:2}${hex:2:2}${hex:0:2}))
    done
}

echo "Añadiendo Relic a Steam... // Adding Relic to Steam..."
rm -f /tmp/addnonsteamgamefile
touch /tmp/addnonsteamgamefile
xdg-open "steam://addnonsteamgame/$(urlencode "$TARGET")" || true

# ── 4. Grids: esperar a que Steam escriba el acceso directo y copiarlos ──
INSTALLED_GRIDS=0
if [ -d "$STEAM_USERDATA" ]; then
    echo "Descargando grids... // Downloading grids..."
    for name in relic relicp relic_logo relic_icon relic_hero; do
        curl -fsL -o "$TMP/$name.png" "$GRIDS_BASE/$name.png" || rm -f "$TMP/$name.png"
    done

    if [ -f "$TMP/relic.png" ]; then
        for _ in $(seq 1 20); do
            while IFS= read -r dir; do
                APPID=$(relic_appid "$dir/config/shortcuts.vdf")
                [ -n "$APPID" ] || continue
                mkdir -p "$dir/config/grid"
                for pair in relic: relicp:p relic_logo:_logo relic_icon:_icon relic_hero:_hero; do
                    [ -f "$TMP/${pair%%:*}.png" ] && cp "$TMP/${pair%%:*}.png" "$dir/config/grid/${APPID}${pair##*:}.png"
                done
                echo "Grids instalados para AppID $APPID // Grids installed for AppID $APPID (${dir##*/})"
                INSTALLED_GRIDS=1
            done < <(user_dirs)
            [ "$INSTALLED_GRIDS" = 1 ] && break
            sleep 1
        done
    fi
    [ "$INSTALLED_GRIDS" = 1 ] || echo "Aviso: no se pudieron instalar los grids // could not install the grids" >&2
fi

echo ""
echo "Relic instalado correctamente. // Relic installed correctly."
if ask "¿Cerrar Steam para aplicar los grids? [S/n] // Close Steam to apply grids? [Y/n] " N; then
    pkill -x steam || true
    echo "Steam cerrado. Ábrelo y busca 'Relic'. // Steam closed. Open it and search 'Relic'."
else
    echo "Abre Steam y busca 'Relic'. // Open Steam and search 'Relic'."
fi

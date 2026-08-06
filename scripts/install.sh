#!/bin/bash
# Instalador de Relic para Linux
# Uso: curl -sL https://raw.githubusercontent.com/FranjeGueje/Relic/master/scripts/install.sh | bash
set -euo pipefail

# ── Dependencias ──
MISSING=()
for cmd in curl xxd xdg-open sha512sum base64; do
    if ! command -v "$cmd" &>/dev/null; then
        MISSING+=("$cmd")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "Error: faltan dependencias: ${MISSING[*]}" >&2
    echo "Instálalas y vuelve a ejecutar." >&2
    exit 1
fi

# ── Variables ──
GITHUB_REPO="https://github.com/FranjeGueje/Relic"
BIN_DIR="$HOME/.local/bin"
STEAM_USERDATA="$HOME/.local/share/Steam/userdata"

# ── 1. Descargar AppImage ──
echo "Obteniendo última release..."
TAG=$(curl -fs https://api.github.com/repos/FranjeGueje/Relic/releases/latest | grep '"tag_name"' | cut -d '"' -f 4)

if [ -z "$TAG" ]; then
    echo "Error: no se pudo obtener la última release." >&2
    exit 1
fi

VERSION="${TAG#v}"
APPIMAGE_URL="https://github.com/FranjeGueje/Relic/releases/download/${TAG}/Relic-${VERSION}-linux-x86_64.AppImage"

echo "Descargando $APPIMAGE_URL..."
mkdir -p "$BIN_DIR"
DOWNLOAD_TMP="$(mktemp)"
curl -fL -# -o "$DOWNLOAD_TMP" "$APPIMAGE_URL"

# ── Verificación de integridad (sha512, publicado por electron-builder) ──
CHECKSUM_URL="https://github.com/FranjeGueje/Relic/releases/download/${TAG}/latest-linux.yml"
CHECKSUM_TMP="$(mktemp)"
if curl -fsL -o "$CHECKSUM_TMP" "$CHECKSUM_URL" 2>/dev/null; then
    EXPECTED_SHA=$(grep -m1 '^sha512:' "$CHECKSUM_TMP" | awk '{print $2}')
    ACTUAL_HEX=$(sha512sum "$DOWNLOAD_TMP" | cut -d' ' -f1)
    ACTUAL_SHA=$(echo -n "$ACTUAL_HEX" | xxd -r -p | base64 -w0)

    if [ -z "$EXPECTED_SHA" ] || [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
        rm -f "$DOWNLOAD_TMP" "$CHECKSUM_TMP"
        echo "Error: la suma sha512 del AppImage no coincide con la publicada en la release." >&2
        echo "La descarga puede estar corrupta o manipulada. Instalación abortada." >&2
        exit 1
    fi
    echo "Verificación sha512 OK."
else
    echo "Aviso: no se encontró 'latest-linux.yml' en la release; no se pudo verificar la integridad del AppImage." >&2
fi
rm -f "$CHECKSUM_TMP"

mv "$DOWNLOAD_TMP" "$BIN_DIR/relic.AppImage"
chmod +x "$BIN_DIR/relic.AppImage"
echo "AppImage instalado en $BIN_DIR/relic.AppImage"

# ── 2. Crear Relic ──
cat << 'SCRIPT' > "$BIN_DIR/Relic"
#!/bin/bash
LD_LIBRARY_PATH= LD_PRELOAD= STEAM_RUNTIME=0 "$HOME/.local/bin/relic.AppImage"
SCRIPT
chmod +x "$BIN_DIR/Relic"
echo "Wrapper creado en $BIN_DIR/Relic"

echo ""
read -r -p "¿Añadir Relic a Steam ahora? [S/n] // Add Relic to Steam now? [Y/n] " ADD_TO_STEAM_REPLY </dev/tty
case "$ADD_TO_STEAM_REPLY" in
    [nN])
        echo ""
        echo "Relic instalado correctamente. // Relic installed correctly"
        echo "Puedes añadirlo a Steam más tarde añadiendo: $BIN_DIR/Relic"
        echo "You can add it to Steam later by adding: $BIN_DIR/Relic"
        exit 0
        ;;
esac

# ── 3. Añadir a Steam ──
urlencode() {
    local string="$1"
    local length=${#string}
    local encoded=""
    local c
    for (( i = 0; i < length; i++ )); do
        c="${string:i:1}"
        case "$c" in
            [a-zA-Z0-9.~_-]) encoded+="$c" ;;
            *) encoded+=$(printf '%%%02X' "'$c") ;;
        esac
    done
    echo "$encoded"
}

EXECUTABLE="$HOME/.local/bin/Relic"
ENCODED_URL="steam://addnonsteamgame/$(urlencode "$EXECUTABLE")"

rm -f "/tmp/addnonsteamgamefile"
touch /tmp/addnonsteamgamefile
xdg-open "$ENCODED_URL"
echo "Añadiendo Relic a Steam..."
sleep 3

# ── 4. Grids (solo si exactamente 2 carpetas en userdata/) ──
if [ -d "$STEAM_USERDATA" ]; then
    DIR_COUNT=$(find "$STEAM_USERDATA" -mindepth 1 -maxdepth 1 -type d | wc -l)

    if [ "$DIR_COUNT" -eq 2 ]; then
        echo "Descargando grids..."

        obtener_appids() {
            for file in "$@"; do
                xxd -p "$file" | tr -d '\n' | grep -oP '02617070696400\K[0-9a-f]{8}' | while read -r hex; do
                    rev_hex="${hex:6:2}${hex:4:2}${hex:2:2}${hex:0:2}"
                    echo $((16#$rev_hex))
                done
            done
        }

        APPID=$(obtener_appids "$STEAM_USERDATA"/*/config/shortcuts.vdf 2>/dev/null | tail -1 || true)

        if [ -n "$APPID" ]; then
            TMP=$(mktemp -d)
            GRIDS_BASE="https://raw.githubusercontent.com/FranjeGueje/Relic/master/grids"

            for name in relic relicp relic_logo relic_icon relic_hero; do
                curl -fsL -o "$TMP/${name}.png" "$GRIDS_BASE/${name}.png"
            done

            mv "$TMP/relic.png" "$TMP/${APPID}.png"
            mv "$TMP/relicp.png" "$TMP/${APPID}p.png"
            mv "$TMP/relic_logo.png" "$TMP/${APPID}_logo.png"
            mv "$TMP/relic_icon.png" "$TMP/${APPID}_icon.png"
            mv "$TMP/relic_hero.png" "$TMP/${APPID}_hero.png"

            cp "$TMP/${APPID}"*.png "$STEAM_USERDATA"/*/config/grid/
            rm -rf "$TMP"

            echo "Grids instalados para AppID $APPID"
        else
            echo "Aviso: no se pudo extraer AppID, grids omitidos"
        fi
    fi
fi

echo ""
echo "Relic instalado correctamente. // Relic installed correctly"
read -r -p "¿Cerrar Steam para aplicar los grids? [S/n] // Close Steam to apply grids? [Y/n] " REPLY </dev/tty
case "$REPLY" in
    [nN]) echo "Abre Steam y busca 'Relic'. // Open Steam and search 'Relic'" ;;
    *)
        pkill steam
        echo "Steam cerrado. Ábrelo y busca 'Relic'. // Steam closed. Open it and search 'Relic'"
        ;;
esac

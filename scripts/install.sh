#!/bin/bash
# Instalador de Relic para Linux
# Uso: curl -sL https://raw.githubusercontent.com/FranjeGueje/Relic/master/scripts/install.sh | bash
set -euo pipefail

# ── Dependencias ──
MISSING=()
for cmd in curl python3 xxd xdg-open; do
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
curl -fL -# -o "$BIN_DIR/relic.AppImage" "$APPIMAGE_URL"
chmod +x "$BIN_DIR/relic.AppImage"
echo "AppImage instalado en $BIN_DIR/relic.AppImage"

# ── 2. Crear Relic ──
cat << 'SCRIPT' > "$BIN_DIR/Relic"
#!/bin/bash
LD_LIBRARY_PATH= LD_PRELOAD= STEAM_RUNTIME=0 "$HOME/.local/bin/relic.AppImage"
SCRIPT
chmod +x "$BIN_DIR/Relic"
echo "Wrapper creado en $BIN_DIR/Relic"

# ── 3. Añadir a Steam ──
EXECUTABLE="$HOME/.local/bin/Relic"
ENCODED_URL="steam://addnonsteamgame/$(python3 -c "import urllib.parse;print(urllib.parse.quote('$EXECUTABLE', safe=''))")"

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
echo "Relic instalado correctamente. // Relic is installed property"
echo "Cerrando Steam... // Closing Steam ..."
pkill steam
echo "Abre Steam y busca 'Relic'. // Open Steam and search 'Relic'"

#!/usr/bin/env sh
# BCDD — instalación en un comando (macOS / Linux / WSL / Git Bash).
#
#   curl -fsSL https://raw.githubusercontent.com/qbitdevz/bcdd/main/scripts/install.sh | sh
#
# Con opciones o con otro comando:
#   curl -fsSL .../install.sh | sh -s -- --with-rule
#   curl -fsSL .../install.sh | sh -s -- doctor
#
# Volver a ejecutarlo actualiza a la última versión.
# Variables: BCDD_REPO=usuario/repo · BCDD_REF=rama-o-tag · BCDD_HOME=carpeta (por defecto ~/.bcdd)
set -eu

REPO="${BCDD_REPO:-qbitdevz/bcdd}"
REF="${BCDD_REF:-main}"
BCDD_DIR="${BCDD_HOME:-$HOME/.bcdd}"
URL="${BCDD_TARBALL_URL:-https://github.com/$REPO/archive/$REF.tar.gz}"

say() { printf '%s\n' "$*"; }
die() { printf '✖ %s\n' "$*" >&2; exit 1; }

case "$REPO" in *BCDD_REPO*) [ -n "${BCDD_TARBALL_URL:-}" ] || die "El repositorio de BCDD no está configurado. Definí BCDD_REPO=usuario/repo." ;; esac
command -v tar >/dev/null 2>&1 || die "Hace falta 'tar'."

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t bcdd)"
trap 'rm -rf "$TMP"' EXIT INT TERM

say "BCDD: descargando ${REF}…"
if command -v curl >/dev/null 2>&1; then curl -fsSL "$URL" -o "$TMP/bcdd.tar.gz" || die "No pude descargar $URL"
elif command -v wget >/dev/null 2>&1; then wget -qO "$TMP/bcdd.tar.gz" "$URL" || die "No pude descargar $URL"
else die "Hace falta 'curl' o 'wget'."; fi

mkdir "$TMP/pkg"
tar -xzf "$TMP/bcdd.tar.gz" -C "$TMP/pkg" --strip-components=1 || die "El archivo descargado no es válido."
[ -f "$TMP/pkg/install.mjs" ] && [ -f "$TMP/pkg/skills/bcdd/SKILL.md" ] || die "La descarga no contiene el paquete BCDD."

mkdir -p "$BCDD_DIR"
rm -rf "$BCDD_DIR/pkg"
mv "$TMP/pkg" "$BCDD_DIR/pkg"
PKG="$BCDD_DIR/pkg"

NODE_OK=0
if command -v node >/dev/null 2>&1; then
  MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [ "$MAJOR" -ge 18 ] 2>/dev/null && NODE_OK=1
fi

if [ "$NODE_OK" -eq 1 ]; then
  # exec reemplaza este proceso y el trap no llega a correr: se limpia antes.
  rm -rf "$TMP"
  trap - EXIT INT TERM
  exec node "$PKG/install.mjs" "$@"
fi

# Sin Node 18+: instalación básica, solo copia de la skill.
GLOBAL=0
for a in "$@"; do
  case "$a" in
    --global) GLOBAL=1 ;;
    install) ;;
    *) die "'$a' necesita Node 18 o superior (doctor, update, lint, --with-rule). Sin Node solo se puede instalar la skill." ;;
  esac
done
if [ "$GLOBAL" -eq 1 ]; then BASE="$HOME"; else BASE="$(pwd)"; fi
for d in "$BASE/.claude/skills" "$BASE/.agents/skills"; do
  mkdir -p "$d"
  rm -rf "$d/bcdd"
  cp -R "$PKG/skills/bcdd" "$d/bcdd"
  say "✔ skill instalada en $d/bcdd"
done
say ""
say "Listo (instalación básica: no encontré Node 18+)."
say "La skill funciona igual. Con Node se suman doctor, lint, la regla para AGENTS.md y la página para el cliente."

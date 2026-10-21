#!/usr/bin/env bash
# Pharos-Release auf dem Hetzner-Server (/opt/pharos). Wird von der GitHub Action
# per SSH aufgerufen, läuft aber auch manuell: `bash deploy/deploy.sh [<commit>]`.
#
# Ablauf: Fast-Forward auf den Ziel-Commit → npm ci nur bei Lockfile-Änderung →
# Build in dist.next → atomarer Tausch gegen dist (kein 404-Fenster für Caddy) →
# Proxy-Neustart nur bei Server-Änderungen → Health-Check. Bei Fehler im Health-Check
# wird dist auf den vorherigen Stand zurückgetauscht.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pharos}"
TARGET="${1:-origin/main}"
FORCE="${FORCE:-0}"

cd "$APP_DIR"

before="$(git rev-parse HEAD)"
git fetch --quiet origin main
git merge --ff-only --quiet "$TARGET"
after="$(git rev-parse HEAD)"

if [[ "$before" == "$after" && "$FORCE" != "1" && -d dist ]]; then
  echo "Bereits aktuell (${after:0:7}) — nichts zu tun."
  exit 0
fi
echo "Release ${before:0:7} → ${after:0:7}"

changed() { [[ "$before" != "$after" ]] && ! git diff --quiet "$before" "$after" -- "$@"; }

if changed package.json package-lock.json || [[ ! -d node_modules ]]; then
  echo "→ Abhängigkeiten geändert: npm ci"
  npm ci --no-audit --no-fund
fi

# OCR-Modell ist gitignored; nur nachladen, falls es fehlt.
if ! compgen -G "public/tesseract/*.traineddata" > /dev/null; then
  echo "→ OCR-Modell fehlt: npm run data:ocr"
  npm run data:ocr
fi

echo "→ Build"
rm -rf dist.next
npx vite build --outDir dist.next --emptyOutDir

# Atomarer Tausch: Caddy servt durchgehend ein vollständiges dist/.
rm -rf dist.prev
[[ -d dist ]] && mv dist dist.prev
mv dist.next dist

if changed server deploy/pharos-ki-proxy.service package-lock.json; then
  echo "→ Proxy-Änderung: Neustart pharos-ki-proxy"
  sudo /usr/bin/systemctl restart pharos-ki-proxy
  sleep 2
fi

echo "→ Health-Check"
if ! curl -fsS --retry 5 --retry-delay 2 --retry-connrefused http://localhost:8787/health; then
  echo "Health-Check fehlgeschlagen — dist wird zurückgerollt." >&2
  if [[ -d dist.prev ]]; then rm -rf dist && mv dist.prev dist; fi
  exit 1
fi
echo
echo "Release ${after:0:7} live."

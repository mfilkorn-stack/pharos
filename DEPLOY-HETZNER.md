# Pharos — Deployment auf Hetzner (Caddy + systemd)

Reverse-Proxy: **Caddy** (auto-HTTPS) · Delivery: **git clone + Build am Server** · Prozess: **systemd** · Domain: **www.pharos.team**

Fertige Artefakte in `deploy/`: [`Caddyfile`](deploy/Caddyfile), [`pharos-ki-proxy.service`](deploy/pharos-ki-proxy.service).

---

## Geprüfte Fakten
- `src/data/*.json` sind **im Repo getrackt** → `npm run data` am Server **nicht nötig**.
- `public/tesseract/*.traineddata` ist **gitignored** → `npm run data:ocr` einmalig am Server (~1,5 MB, Internet nötig).
- `VITE_KI_PROXY_URL` wird **zur Build-Zeit** eingebettet → vor `npm run build` korrekt setzen (`https://www.pharos.team/ki`).
- Caddy proxyt **`/uebergabe/*`** mit (Trainer parse/evaluate) — nicht nur `/ki`,`/enrich`.
- ⚠️ Enrich-Cache: Proxy schreibt `public/data/extras-runtime.json`, Client lädt `/data/extras-runtime.json`. Die Caddyfile servt diese Datei daher aus `public/` (sonst erst nach Rebuild sichtbar).

---

## 0 — Voraussetzung (lokal)
Repo zu GitHub/GitLab pushen (privat). `.env.local` ist gitignored und bleibt draußen.

## 1 — Server & DNS
- Hetzner Cloud: Ubuntu 24.04 LTS, **CX22** (2 vCPU/4 GB). SSH-Key hinterlegen.
- Firewall (Hetzner + `ufw`): nur **22, 80, 443**.
- Deploy-User: `adduser deploy && usermod -aG sudo deploy`.
- **A-Record** `www.pharos.team` → Server-IP (vor TLS gesetzt sein).

## 2 — Abhängigkeiten
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs git
# Caddy: siehe https://caddyserver.com/docs/install
sudo apt install -y caddy
```

## 3 — Code & Secrets
```bash
sudo mkdir -p /opt/pharos && sudo chown deploy:deploy /opt/pharos
git clone <repo-url> /opt/pharos      # privates Repo → Deploy-Key am Server
cd /opt/pharos
cp .env.local.example .env.local && chmod 600 .env.local
```
`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-<key>
KI_PROXY_PORT=8787
VITE_KI_PROXY_URL=https://www.pharos.team/ki
```

## 4 — Build
```bash
npm ci
npm run data:ocr     # OCR-Modell (einmalig)
npm run build        # dist/ mit eingebetteter Proxy-URL
```

## 5 — Node-Proxy (systemd)
```bash
sudo cp deploy/pharos-ki-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pharos-ki-proxy
chown -R deploy:deploy /opt/pharos/public/data   # Enrich-Cache schreibbar
curl localhost:8787/health                        # {"ok":true,"hasKey":true}
```

## 6 — Caddy
```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy      # holt automatisch Let's-Encrypt-Zertifikat
```

## 7 — Update-Workflow

Automatisch per GitHub Action `.github/workflows/release.yml` nach jedem Merge auf `main`:
Tests und Build in CI, danach per SSH `deploy/deploy.sh` auf dem Server. Das Skript zieht
den Commit per Fast-Forward, führt `npm ci` nur bei geändertem Lockfile aus, baut nach
`dist.next`, tauscht atomar gegen `dist`, startet den Proxy nur bei Server-Änderungen neu
und rollt `dist` zurück, wenn der Health-Check scheitert.

**Kein Deploy/Restart 9–18 Uhr ohne Rückfrage** — die Action hält das ein: Merges in
diesem Fenster werden nur geprüft, der Abendlauf um 19:15 Uhr rollt sie aus. Sofort-Release
tagsüber: Actions → Release → „Run workflow" → „Sperrzeit 9–18 Uhr übergehen".

Manuell auf dem Server: `cd /opt/pharos && bash deploy/deploy.sh` (optional mit `FORCE=1`).

### Einmalige Einrichtung für die Action

1. Deploy-Schlüssel nur für GitHub erzeugen (lokal):
   ```bash
   ssh-keygen -t ed25519 -N "" -C "github-actions-pharos" -f pharos_deploy
   ```
   `pharos_deploy.pub` auf dem Server in `/home/deploy/.ssh/authorized_keys` eintragen.
2. Host-Key festhalten: `ssh-keyscan -t ed25519 www.pharos.team` → Ausgabe kopieren.
3. GitHub → Settings → Environments → **`production`** anlegen und dort als Secrets:
   `DEPLOY_HOST` (Server-IP oder Hostname), `DEPLOY_USER` (`deploy`),
   `DEPLOY_SSH_KEY` (Inhalt von `pharos_deploy`), `DEPLOY_KNOWN_HOSTS` (Ausgabe aus 2.).
   Optional unter „Required reviewers" dich selbst eintragen, dann wartet jeder Release
   auf einen Klick.
4. Neustart ohne Passwort, aber nur für diesen einen Befehl (`sudo visudo -f /etc/sudoers.d/pharos`):
   ```
   deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart pharos-ki-proxy
   ```
5. Der Server muss `git fetch` können (Deploy-Key am Server, siehe Abschnitt 3).

---

## Verifikation
1. `curl https://www.pharos.team/health` → `{"ok":true,"hasKey":true}`
2. Seite öffnen → HomeScreen, gültiges Zertifikat.
3. **Lexikon**: Suche; unbekannter Wirkstoff → „Mit KI suchen" → `/enrich`; Eintrag bleibt nach Reload.
4. **Trainer**: Diktat → `/uebergabe/parse` → Abgeben → `/uebergabe/evaluate` → Score.
5. **Offline** (DevTools): Lexikon aus Cache; Trainer zeigt Netz-Banner.
6. `journalctl -u pharos-ki-proxy -f`; Reboot-Test → Service startet automatisch.

## Sicherheit / Compliance
- `.env.local` `chmod 600`. Optional `fail2ban`, `unattended-upgrades`.
- Backup von `public/data/extras-runtime.json` (einziger veränderlicher Zustand).
- Vor Drittdaten-Nutzung: AVV mit Anthropic, EU-Endpoint, DSGVO-Rechtsgrundlage (siehe [`DEPLOY.md`](DEPLOY.md)).

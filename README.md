# elastik-vscode

Lucy in your editor. A VS Code extension for the elastik protocol.

---

## What it does

Syncs your editor context to elastik. AI sees what you're coding. You stay in control.

- **Sidebar panel** — renders your world's stage content in real-time
- **Auto world switching** — detects git repo name → maps to elastik world
- **Editor context sync** — file path, content, selection, cursor, language → `/{world}/result`
- **Symbol tree** — function/class structure sent via `executeDocumentSymbolProvider`
- **Terminal output** — last 2000 chars of terminal activity synced *(pending stable VS Code API)*
- **Git context** — `git diff --stat` + recent commits in every payload
- **Smart truncation** — 5000 chars centered on cursor, not from file top

---

## Install

1. Clone this repo
2. `npm install` → `npm run compile`
3. Open in VS Code → F5 to launch Extension Development Host
4. Lucy appears in the sidebar

---

## How it works

```
You write code
  → extension reads file + selection + cursor + symbols + terminal + git
  → POST to /{world}/result (single payload, all context)
  → your AI reads it via MCP or HTTP
  → AI writes feedback to /{world}/stage
  → sidebar panel renders stage
  → you see AI analysis next to your code
```

All data stays on your machine. `localhost:3004`. Your `universe.db`. Your disk.

---

## Context payload

```json
{
  "source": "vscode",
  "file": "src/sync.ts",
  "content": "5000 chars centered on cursor",
  "selection": "selected text",
  "language": "typescript",
  "cursor": { "line": 35, "col": 12 },
  "symbols": [
    { "name": "syncContext", "kind": "Function", "range": "30-55" }
  ],
  "git": {
    "diff_stat": "3 files changed, 42 insertions(+)",
    "recent_commits": "abc1234 fix sync timing\ndef5678 add terminal support"
  },
  "terminal": "last 2000 chars of terminal output",
  "timestamp": 1711180800000
}
```

One GET. One POST. No LSP. No Copilot subscription. No telemetry.

---

## World resolution

```
Working in elastik repo     → /elastik-dev
Working in albon repo       → /albon-dev
No git repo detected        → /vscode
```

---

## Commands

```
elastik: Toggle Panel    → show/hide sidebar
elastik: Switch World    → manually pick a world
elastik: Sync Now        → manually trigger context sync
```

---

## Configuration

```json
{
  "elastik.url": "http://localhost:3004",
  "elastik.enabled": true,
  "elastik.filterMode": "blacklist",
  "elastik.blacklist": [],
  "elastik.whitelist": ["*.py", "*.ts", "src/**"]
}
```

---

## Security

**Blacklist mode** (default): all files are synced except sensitive ones.
Built-in exclusions: `.env`, `.env.*`, `*.key`, `*.pem`, `*.p12`, `*.pfx`, `id_rsa*`, `*.keystore`, `*.token`, `*.secret`, `*.password`, `*.credential`, `credentials.*`, and related variants.
Add your own patterns via `elastik.blacklist` or a `.elastikignore` file (`.gitignore` syntax).

**Whitelist mode**: nothing is synced unless it matches `elastik.whitelist` patterns.

**Terminal scrubbing**: lines containing `password`, `token`, `secret`, `credential`, `api_key`, `apikey`, `private_key`, or `access_token` are stripped before sync.

**Remote URL warning**: if `elastik.url` points outside localhost or your Tailscale network (100.x.x.x), a confirmation dialog appears: *"Code content will leave your device. Continue?"*

**First-run opt-in**: on first activation, you must explicitly enable syncing. No data is sent without consent.

---

## Roadmap

- [ ] **Write-back channel** — AI edits code via `/{world}/pending`, diff view + approve/reject
- [ ] **Microphone sync** — local Whisper transcription → `/{world}/result` with `source: "mic"`
- [ ] **Inline suggestions** — AI writes code suggestions rendered as ghost text in editor
- [ ] **Multi-file context** — send open tabs and recently edited files, not just active file
- [ ] **Diagnostics sync** — linting errors and warnings in payload
- [ ] **Adaptive polling** — 2s when active, 10s when idle
- [ ] **Chrome Web Store** — publish elastik-extension for one-click install

---

## Part of the elastik ecosystem

```
elastik              → protocol + server (~200 lines)
elastik-extension    → browser client
elastik-vscode       → editor client (this repo)
```

---

*MIT License. © 2026 Ranger Chen.*

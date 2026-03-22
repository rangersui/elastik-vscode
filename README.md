# elastik-vscode

Lucy in your editor. A VS Code extension for the elastik protocol.

---

## What it does

Syncs your editor context to elastik. AI sees what you're coding. You stay in control.

- **Sidebar panel** — renders your world's stage content
- **Auto world switching** — detects git repo name → maps to elastik world
- **Editor context sync** — file path, content, selection, language → `/{world}/result`
- **Three triggers** — switch file, save file, move cursor (debounced)

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
  → extension reads file content + selection + language
  → POST to /{world}/result
  → your AI reads it via MCP or HTTP
  → AI writes code review / suggestions to /{world}/stage
  → sidebar panel renders stage
  → you see AI feedback next to your code
```

All data stays on your machine. `localhost:3004`. Your `universe.db`. Your disk.

---

## World resolution

```
Working in elastik repo     → /elastik-dev
Working in albon repo       → /albon-dev
No git repo detected        → /vscode
```

Reads `.git` directory name. Falls back to `/vscode`.

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
  "elastik.enabled": true
}
```

---

## What AI sees

```json
{
  "source": "vscode",
  "file": "src/sync.ts",
  "selection": "selected text if any",
  "content": "first 5000 chars of file",
  "language": "typescript",
  "timestamp": 1711180800000
}
```

One GET. One POST. No LSP. No Copilot subscription. No telemetry.

---

## Part of the elastik ecosystem

```
elastik              → protocol + server (~200 lines)
elastik-extension    → browser client
elastik-vscode       → editor client (this repo)
```

---

*MIT License. © 2026 Ranger Chen.*

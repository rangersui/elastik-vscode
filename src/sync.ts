import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
import { getUrl, isEnabled } from "./config";
import { getTerminalOutput } from "./terminal";

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

// #2: Cache world + git root per workspace folder
const worldCache = new Map<string, string>();
const gitRootCache = new Map<string, string | null>();

export function resolveWorld(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return "vscode";

  // Use workspace folder as cache key
  const wsFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  if (wsFolder) {
    const key = wsFolder.uri.fsPath;
    const cached = worldCache.get(key);
    if (cached) return cached;

    const world = findWorldFromDir(key);
    worldCache.set(key, world);
    return world;
  }

  return findWorldFromDir(path.dirname(editor.document.uri.fsPath));
}

function findWorldFromDir(dir: string): string {
  const root = findGitRoot(dir);
  if (root) return path.basename(root) + "-dev";
  return "vscode";
}

function findGitRoot(dir: string): string | null {
  const cached = gitRootCache.get(dir);
  if (cached !== undefined) return cached;

  let current = dir;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) {
      gitRootCache.set(dir, current);
      return current;
    }
    current = path.dirname(current);
  }
  gitRootCache.set(dir, null);
  return null;
}

// Git context
function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    cp.execFile("git", args, { cwd, timeout: 3000 }, (err, stdout) => {
      resolve(err ? "" : stdout.trim());
    });
  });
}

async function getGitContext(
  filePath: string
): Promise<{ diff_stat: string; recent_commits: string } | null> {
  // Find git root from file's directory
  const dir = path.dirname(filePath);
  const root = findGitRoot(dir);
  if (!root) return null;

  const [diffStat, log] = await Promise.all([
    execGit(["diff", "--stat"], root),
    execGit(["log", "--oneline", "-5"], root),
  ]);

  if (!diffStat && !log) return null;

  return {
    diff_stat: diffStat,
    recent_commits: log,
  };
}

// #1 + #6: Content window centered on cursor
function getContentWindow(
  doc: vscode.TextDocument,
  editor: vscode.TextEditor
): string {
  const fullText = doc.getText();
  if (fullText.length <= 5000) return fullText;

  const cursorOffset = doc.offsetAt(editor.selection.active);
  const half = 2500;
  let start = cursorOffset - half;
  let end = cursorOffset + half;

  if (start < 0) {
    end += -start;
    start = 0;
  }
  if (end > fullText.length) {
    start -= end - fullText.length;
    end = fullText.length;
    if (start < 0) start = 0;
  }

  return fullText.substring(start, end);
}

// #5: Document symbols
async function getSymbols(
  uri: vscode.Uri
): Promise<vscode.DocumentSymbol[] | null> {
  try {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >("vscode.executeDocumentSymbolProvider", uri);
    return symbols ?? null;
  } catch {
    return null;
  }
}

function flattenSymbols(
  symbols: vscode.DocumentSymbol[]
): { name: string; kind: string; range: string }[] {
  const result: { name: string; kind: string; range: string }[] = [];
  for (const s of symbols) {
    result.push({
      name: s.name,
      kind: vscode.SymbolKind[s.kind],
      range: `${s.range.start.line + 1}-${s.range.end.line + 1}`,
    });
    if (s.children.length) {
      result.push(...flattenSymbols(s.children));
    }
  }
  return result;
}

export async function syncContext(world: string): Promise<void> {
  if (!isEnabled()) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const selection = editor.selection;
  const selectedText = doc.getText(selection);
  const content = getContentWindow(doc, editor);

  // #5: symbols
  const rawSymbols = await getSymbols(doc.uri);
  const symbols = rawSymbols ? flattenSymbols(rawSymbols) : null;

  // #6: cursor position as line:col
  const cursor = selection.active;

  // Git context
  const git = await getGitContext(doc.uri.fsPath);

  // Terminal output
  const terminal = getTerminalOutput();

  const payload = JSON.stringify({
    source: "vscode",
    file: doc.uri.fsPath,
    selection: selectedText || null,
    cursor: { line: cursor.line + 1, col: cursor.character + 1 },
    content,
    language: doc.languageId,
    symbols,
    git,
    terminal,
    timestamp: Date.now(),
  });

  const url = `${getUrl()}/${world}/result`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  } catch {
    // elastik not running — silent
  }
}

export function syncContextDebounced(world: string): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => syncContext(world), 1000);
}

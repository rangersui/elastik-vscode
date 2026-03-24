import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Default blacklist patterns for sensitive files
const DEFAULT_BLACKLIST = [
  ".env",
  ".env.*",
  "*.key",
  "*.pem",
  "*_key",
  "*_key.*",
  "id_rsa*",
  "*.keystore",
  "*.token",
  "*_token",
  "*_token.*",
  "token.txt",
  "token.json",
  "*.secret",
  "*_secret",
  "*_secret.*",
  "secret.*",
  ".secret*",
  "*.password",
  "*_password",
  "password.*",
  ".password*",
  "*.credential",
  "*credential*",
  "credentials.*",
  "*.p12",
  "*.pfx",
];

// Sensitive keywords to scrub from terminal output
const TERMINAL_SENSITIVE =
  /\b(password|token|secret|credential|api_key|apikey|private_key|access_token)\b/i;

/**
 * Check if a filename matches a glob-like pattern.
 * Supports: *, ?, .env.* style patterns.
 */
function matchPattern(filename: string, pattern: string): boolean {
  // Exact match
  if (filename === pattern) return true;

  // Convert simple glob to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(filename);
}

/**
 * Load .elastikignore from workspace root (if exists).
 * Returns array of patterns, same syntax as .gitignore (simplified).
 */
function loadElastikIgnore(workspaceRoot: string | undefined): string[] {
  if (!workspaceRoot) return [];
  const ignorePath = path.join(workspaceRoot, ".elastikignore");
  try {
    const content = fs.readFileSync(ignorePath, "utf-8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

/**
 * Check if a file should be synced based on filter mode.
 * Returns true if the file is allowed.
 */
export function shouldSyncFile(filePath: string): boolean {
  const config = vscode.workspace.getConfiguration("elastik");
  const mode = config.get<string>("filterMode", "blacklist");
  const filename = path.basename(filePath);

  if (mode === "whitelist") {
    const whitelist = config.get<string[]>("whitelist", []);
    if (whitelist.length === 0) return false;
    // Check if file matches any whitelist pattern (against full relative path too)
    const wsFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(filePath)
    );
    const relativePath = wsFolder
      ? path.relative(wsFolder.uri.fsPath, filePath).replace(/\\/g, "/")
      : filename;

    return whitelist.some(
      (pattern) =>
        matchPattern(filename, pattern) ||
        matchPattern(relativePath, pattern)
    );
  }

  // Blacklist mode (default)
  const userBlacklist = config.get<string[]>("blacklist", []);
  const allPatterns = [...DEFAULT_BLACKLIST, ...userBlacklist];

  // Load .elastikignore
  const wsFolder = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(filePath)
  );
  const ignorePatterns = loadElastikIgnore(wsFolder?.uri.fsPath);
  allPatterns.push(...ignorePatterns);

  // Check filename and relative path against all patterns
  const relativePath = wsFolder
    ? path.relative(wsFolder.uri.fsPath, filePath).replace(/\\/g, "/")
    : filename;

  return !allPatterns.some(
    (pattern) =>
      matchPattern(filename, pattern) ||
      matchPattern(relativePath, pattern)
  );
}

/**
 * Scrub sensitive lines from terminal output.
 * Removes lines containing password/token/key/secret/credential.
 */
export function scrubTerminalOutput(output: string | null): string | null {
  if (!output) return output;
  return output
    .split("\n")
    .filter((line) => !TERMINAL_SENSITIVE.test(line))
    .join("\n");
}

/**
 * Check if the target URL is remote (not localhost, not 100.x.x.x).
 */
export function isRemoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("100.")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

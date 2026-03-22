const buffers = new Map<string, string>();

export function getTerminalOutput(): string | null {
  const allOutput: string[] = [];
  for (const [name, buf] of buffers) {
    if (buf.trim()) allOutput.push(`[${name}]\n${buf}`);
  }
  if (!allOutput.length) return null;
  return allOutput.join("\n---\n").slice(-2000);
}

// TODO: Terminal output capture requires proposed API (onDidWriteTerminalData).
// When VS Code stabilizes it, re-enable.
// For now, getTerminalOutput() always returns null.

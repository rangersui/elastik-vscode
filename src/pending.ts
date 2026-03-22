// Write-back channel — disabled pending server-side debugging.
// Will re-enable once pending_js persistence issue is resolved.
//
// Features when enabled:
// - Polls /{world}/pending every 2s
// - Parses edit actions
// - Shows diff + modal approval (Apply/Reject)
// - Fuzzy file resolution via findFiles
// - Output channel logging

export function initPendingSync(): void {
  // no-op
}

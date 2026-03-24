import * as vscode from "vscode";

export function getUrl(): string {
  return vscode.workspace
    .getConfiguration("elastik")
    .get<string>("url", "http://localhost:3004");
}

export function isEnabled(): boolean {
  return vscode.workspace
    .getConfiguration("elastik")
    .get<boolean>("enabled", true);
}

export function getFilterMode(): "blacklist" | "whitelist" {
  return vscode.workspace
    .getConfiguration("elastik")
    .get<"blacklist" | "whitelist">("filterMode", "blacklist");
}

export function hasOptedIn(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>("elastik.optedIn", false);
}

export async function setOptedIn(
  context: vscode.ExtensionContext,
  value: boolean
): Promise<void> {
  await context.globalState.update("elastik.optedIn", value);
}

export function hasConfirmedRemote(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>("elastik.confirmedRemote", false);
}

export async function setConfirmedRemote(
  context: vscode.ExtensionContext,
  value: boolean
): Promise<void> {
  await context.globalState.update("elastik.confirmedRemote", value);
}

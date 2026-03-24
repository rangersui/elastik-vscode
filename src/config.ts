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

export function hasConfirmedRemote(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>("elastik.confirmedRemote", false);
}

export async function setConfirmedRemote(
  context: vscode.ExtensionContext,
  value: boolean
): Promise<void> {
  await context.globalState.update("elastik.confirmedRemote", value);
}

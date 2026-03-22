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

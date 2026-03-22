import * as vscode from "vscode";
import { ElastikPanelProvider } from "./panel";
import { resolveWorld, syncContext, syncContextDebounced } from "./sync";
// import { initPendingSync } from "./pending"; // disabled — pending server-side debugging
import { getUrl } from "./config";

let panelProvider: ElastikPanelProvider;

export function activate(context: vscode.ExtensionContext) {
  panelProvider = new ElastikPanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ElastikPanelProvider.viewType,
      panelProvider
    )
  );

  // Set initial world
  updateWorld();

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("elastik.togglePanel", () => {
      vscode.commands.executeCommand("elastik.panel.focus");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("elastik.switchWorld", async () => {
      try {
        const res = await fetch(`${getUrl()}/stages`);
        const data = (await res.json()) as { name: string }[];
        const worlds = data.map((w) => w.name);
        const picked = await vscode.window.showQuickPick(worlds, {
          placeHolder: "Select world",
        });
        if (picked) {
          panelProvider.setWorld(picked);
          syncContext(picked);
        }
      } catch {
        const input = await vscode.window.showInputBox({
          prompt: "Enter world name (server not reachable for list)",
          value: panelProvider.world,
        });
        if (input) {
          panelProvider.setWorld(input);
          syncContext(input);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("elastik.syncNow", () => {
      syncContext(panelProvider.world);
    })
  );

  // Write-back channel — disabled pending server-side debugging
  // initPendingSync(context, () => panelProvider.world);

  // Auto-sync on editor events
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateWorld();
      syncContext(panelProvider.world);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      syncContext(panelProvider.world);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(() => {
      syncContextDebounced(panelProvider.world);
    })
  );
}

function updateWorld(): void {
  const world = resolveWorld();
  if (world !== panelProvider.world) {
    panelProvider.setWorld(world);
  }
}

export function deactivate() {}

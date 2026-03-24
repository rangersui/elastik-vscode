import * as vscode from "vscode";
import { ElastikPanelProvider } from "./panel";
import { resolveWorld, syncContext, syncContextDebounced } from "./sync";
// import { initPendingSync } from "./pending"; // disabled — pending server-side debugging
import {
  getUrl,
  hasConfirmedRemote,
  setConfirmedRemote,
} from "./config";
import { isRemoteUrl } from "./filter";

let panelProvider: ElastikPanelProvider;

export async function activate(context: vscode.ExtensionContext) {
  // "Elastik: Enable" command — always registered, even if declined
  context.subscriptions.push(
    vscode.commands.registerCommand("elastik.enable", async () => {
      await context.globalState.update("elastik.optIn", "pending");
      vscode.window.showInformationMessage(
        "Elastik reset. Reload window to re-enable.",
        "Reload"
      ).then((choice) => {
        if (choice === "Reload") {
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      });
    })
  );

  // First activation: opt-in prompt. Declined → silent disable, user runs "Elastik: Enable" to retry.
  const optInState = context.globalState.get<string>("elastik.optIn", "pending");
  if (optInState === "declined") return;
  if (optInState === "pending") {
    const url = getUrl();
    const choice = await vscode.window.showWarningMessage(
      `Elastik will sync file content, cursor, terminal output and git info to [${url}]. Sensitive files (.env, keys) are excluded by default. Continue?`,
      { modal: true },
      "Enable",
      "Disable"
    );
    if (choice === "Enable") {
      await context.globalState.update("elastik.optIn", "accepted");
    } else {
      await context.globalState.update("elastik.optIn", "declined");
      return;
    }
  }

  // Remote URL warning (non-localhost, non-100.x.x.x)
  const url = getUrl();
  if (isRemoteUrl(url) && !hasConfirmedRemote(context)) {
    const choice = await vscode.window.showWarningMessage(
      "Code content will leave your device. Continue?",
      { modal: true },
      "Continue",
      "Cancel"
    );
    if (choice === "Continue") {
      await setConfirmedRemote(context, true);
    } else {
      return;
    }
  }
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

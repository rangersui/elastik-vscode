import * as vscode from "vscode";
import { getUrl } from "./config";

export class ElastikPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "elastik.panel";

  private _view?: vscode.WebviewView;
  private _world = "vscode";
  private _pollTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    this._setHtml();
    this._startPolling();

    webviewView.onDidDispose(() => {
      if (this._pollTimer) clearInterval(this._pollTimer);
    });
  }

  public setWorld(world: string): void {
    this._world = world;
    this._setHtml();
    this._poll();
  }

  public get world(): string {
    return this._world;
  }

  private _startPolling(): void {
    this._poll();
    this._pollTimer = setInterval(() => this._poll(), 2000);
  }

  private async _poll(): Promise<void> {
    if (!this._view) return;

    const url = `${getUrl()}/${this._world}/read`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const data = (await res.json()) as {
        stage_html?: string;
        version?: number;
      };
      this._view.webview.postMessage({
        type: "update",
        stageHtml: data.stage_html || "",
        version: data.version ?? 0,
      });
    } catch {
      this._view.webview.postMessage({ type: "offline" });
    }
  }

  private _setHtml(): void {
    if (!this._view) return;

    this._view.webview.html = /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0 8px;
      border-bottom: 1px solid var(--vscode-widget-border);
      margin-bottom: 8px;
    }
    .world-name {
      font-weight: bold;
      font-size: 13px;
      opacity: 0.8;
    }
    .status {
      font-size: 11px;
      opacity: 0.6;
    }
    #stage {
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }
    .error {
      opacity: 0.5;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="world-name">/${this._world}</span>
    <span class="status" id="status">loading...</span>
  </div>
  <div id="stage"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const stageEl = document.getElementById("stage");
    const statusEl = document.getElementById("status");

    window.addEventListener("message", (e) => {
      const msg = e.data;
      if (msg.type === "update") {
        stageEl.innerHTML = msg.stageHtml || "<i>(empty)</i>";
        statusEl.textContent = "v" + msg.version;
      } else if (msg.type === "offline") {
        stageEl.innerHTML = '<span class="error">elastik not reachable</span>';
        statusEl.textContent = "offline";
      }
    });
  </script>
</body>
</html>`;
  }
}

import * as vscode from 'vscode';
import { APIService } from './services/APIService';
import { FileService } from './services/FileService';

// Keep track of all active webview panels
const webviewPanels: vscode.WebviewPanel[] = [];

export function activate(context: vscode.ExtensionContext) {
  const fileService = new FileService(context);
  const apiService = new APIService(context, fileService);

  let disposableConfig = vscode.commands.registerCommand('turbotime.openConfig', () => {
    openWebview('config', context, apiService, fileService);
  });

  let disposableChat = vscode.commands.registerCommand('turbotime.openChat', () => {
    openWebview('chat', context, apiService, fileService);
  });

  context.subscriptions.push(disposableConfig, disposableChat);

  // Listen for theme changes
  context.subscriptions.push(vscode.window.onDidChangeActiveColorTheme(() => {
    // Notify all webviews about the theme change
    webviewPanels.forEach(panel => {
      if (panel.visible) {
        panel.webview.postMessage({ type: 'updateTheme' });
      }
    });
  }));
}

function openWebview(
  type: 'config' | 'chat',
  context: vscode.ExtensionContext,
  apiService: APIService,
  fileService: FileService
) {
  if (!fileService.hasWorkspace()) {
    vscode.window.showErrorMessage('TurboTime requires an open workspace to function.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    `turbotime${type.charAt(0).toUpperCase() + type.slice(1)}`,
    `TurboTime ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')]
    }
  );

  // Add the new panel to our list
  webviewPanels.push(panel);

  // Set the webview panel on the APIService instance
  apiService.setWebviewPanel(panel);

  // Remove the panel from our list when it's disposed
  panel.onDidDispose(() => {
    const index = webviewPanels.indexOf(panel);
    if (index > -1) {
      webviewPanels.splice(index, 1);
    }
  });

  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, type);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'loadConfig':
          const config = await apiService.loadConfig();
          panel.webview.postMessage({ command: 'initializeData', data: config });
          break;
        case 'saveConfig':
          await apiService.saveConfig(message.config);
          vscode.window.showInformationMessage('Configuration saved successfully.');
          break;
        case 'sendMessage':
          try {
            const response = await apiService.sendUserMessage(message.text);
            panel.webview.postMessage({ command: 'receiveMessage', message: response });
          } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
          }
          break;
        case 'getProjectFiles':
          const files = await fileService.getProjectFiles();
          panel.webview.postMessage({ command: 'updateProjectFiles', files });
          break;
        case 'getFullContext':
          const fullContext = await apiService.getFullContext();
          panel.webview.postMessage({ command: 'fullContext', context: fullContext });
          break;
        case 'getContextLimit':
          const contextLimit = await apiService.getContextLimit();
          panel.webview.postMessage({ command: 'updateContextLimit', contextLimit });
          break;
        case 'updateTokenCount':
          apiService.setSelectedFiles(message.selectedFiles);
          await apiService.updateTokenCount(message.input);
          break;
        case 'writeToFile':
          try {
            await fileService.writeFile(message.filePath, message.code);
            vscode.window.showInformationMessage(`File ${message.filePath} has been updated.`);
          } catch (error: any) {
            vscode.window.showErrorMessage(`Error writing to file: ${error.message}`);
          }
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, page: 'config' | 'chat'): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview-ui.js'));

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TurboTime ${page === 'config' ? 'Configuration' : 'Chat'}</title>
    </head>
    <body>
        <div id="root"></div>
        <script>
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
            window.initialPage = "${page}";
        </script>
        <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

export function deactivate() {}
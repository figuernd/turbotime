import * as vscode from 'vscode';
import { APIService } from './APIService';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigPanel {
    public static currentPanel: ConfigPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private apiService: APIService) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionContext: vscode.ExtensionContext, apiService: APIService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'configPanel',
            'Configuration',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'media')]
            }
        );

        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionContext.extensionUri, apiService);
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
        this._setWebviewMessageListener(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'configPanel.html');
        let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

        // Make paths to CSS and JavaScript files absolute
        const nonce = this._getNonce();
        html = html.replace(/#{nonce}/g, nonce);
        html = html.replace(/#{webview.cspSource}/g, webview.cspSource);
        
        return html;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                switch (message.command) {
                    case 'saveConfig':
                        await this.apiService.saveConfig(message.apiEndpoint, message.stringTemplate);
                        vscode.window.showInformationMessage('Configuration saved successfully!');
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    public dispose() {
        ConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
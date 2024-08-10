import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { APIService } from './APIService';
import { FileService } from './FileService';

export class ConfigPanel {
    public static currentPanel: ConfigPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private apiService: APIService, private fileService: FileService) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static async createOrShow(extensionContext: vscode.ExtensionContext, apiService: APIService, fileService: FileService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConfigPanel.currentPanel) {
            ConfigPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'configPanel',
            'TurboTime Configuration',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'media')]
            }
        );

        ConfigPanel.currentPanel = new ConfigPanel(panel, extensionContext.extensionUri, apiService, fileService);
    }

    private async _update() {
        const webview = this._panel.webview;

        this._panel.webview.html = await this._getHtmlForWebview(webview);

        this._setWebviewMessageListener(webview);
    }

    private async _getHtmlForWebview(webview: vscode.Webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'configPanel.html');
        let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

        const nonce = this._getNonce();

        const config = await this.apiService.loadConfig();

        // Replace placeholders with actual values
        html = html.replace('#{nonce}', nonce);
        html = html.replace('#{apiEndpoint}', config.apiEndpoint || '');
        html = html.replace('#{apiKey}', config.apiKey || '');
        html = html.replace('#{systemMessage}', config.systemMessage || '');
        html = html.replace('#{userMessageTemplate}', config.userMessageTemplate || '');
        html = html.replace('#{assistantMessageTemplate}', config.assistantMessageTemplate || '');
        html = html.replace('#{maxTokens}', config.maxTokens?.toString() || '150');
        html = html.replace('#{temperature}', config.temperature?.toString() || '0.7');
        html = html.replace('#{topP}', config.topP?.toString() || '1');
        html = html.replace('#{frequencyPenalty}', config.frequencyPenalty?.toString() || '0');
        html = html.replace('#{presencePenalty}', config.presencePenalty?.toString() || '0');
        html = html.replace('#{stopSequences}', (config.stopSequences || []).join(', '));
        html = html.replace('#{modelName}', config.modelName || '');
        html = html.replace('#{responseFormat}', config.responseFormat || 'text');

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
                        await this.apiService.saveConfig(message);
                        vscode.window.showInformationMessage('Configuration saved successfully.');
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
import * as vscode from 'vscode';
import { APIService } from './APIService';
import * as fs from 'fs';
import * as path from 'path';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _chatHistory: ChatMessage[] = [];

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

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'chatPanel',
            'TurboTime Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'media')]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionContext.extensionUri, apiService);
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
        this._setWebviewMessageListener(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'chatPanel.html');
        let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

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
                    case 'sendMessage':
                        await this._handleUserMessage(message.text);
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _handleUserMessage(text: string) {
        // Add user message to chat history
        this._chatHistory.push({ role: 'user', content: text });
        this._updateChatView();

        try {
            // Call API
            const response = await this.apiService.makeAPICall(text);

            // Add assistant message to chat history
            this._chatHistory.push({ role: 'assistant', content: response });
            this._updateChatView();
        } catch (error:any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }

    private _updateChatView() {
        this._panel.webview.postMessage({
            command: 'updateChat',
            chatHistory: this._chatHistory
        });
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
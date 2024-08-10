import * as vscode from 'vscode';
import { APIService, Message } from './APIService';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require('dompurify');

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private purify: any;
    

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private apiService: APIService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.purify = createDOMPurify(new JSDOM('').window);
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
        try {
            // Send user message and get response
            await this.apiService.sendUserMessage(text);

            // Update chat view
            await this._updateChatView();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }

    private async _updateChatView() {
        const history = await this.apiService.getMessageHistory();
        // Remove system message
        const chatHistory = history.slice(1);
        const formattedHistory = chatHistory.map(message => ({
            ...message,
            content: this._formatMessage(message.content)
        }));
        this._panel.webview.postMessage({
            command: 'updateChat',
            chatHistory: formattedHistory
        });
    }

    private _formatMessage(content: string): string {
        // Convert markdown to HTML
        const rawHtml = marked(content);
        
        // Sanitize the HTML
        const sanitizedHtml = this.purify.sanitize(rawHtml as any, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'code', 'pre'],
            ALLOWED_ATTR: []
        });

        return sanitizedHtml;
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
import * as vscode from 'vscode';
import { ConfigPanel } from './ConfigPanel';
import { ChatPanel } from './ChatPanel';
import { APIService } from './APIService';

export function activate(context: vscode.ExtensionContext) {
    const apiService = new APIService(context);

    let disposableConfig = vscode.commands.registerCommand('turbotime.openConfig', () => {
        ConfigPanel.createOrShow(context, apiService);
    });

    let disposableChat = vscode.commands.registerCommand('turbotime.openChat', () => {
        ChatPanel.createOrShow(context, apiService);
    });

    context.subscriptions.push(disposableConfig, disposableChat);
}

export function deactivate() {}
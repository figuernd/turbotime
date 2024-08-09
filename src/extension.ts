import * as vscode from 'vscode';
import { ConfigPanel } from './ConfigPanel';
import { ChatPanel } from './ChatPanel';
import { APIService } from './APIService';
import { FileService } from './FileService';

export function activate(context: vscode.ExtensionContext) {
    const fileService = new FileService(context);
    const apiService = new APIService(context, fileService);

    let disposableConfig = vscode.commands.registerCommand('turbotime.openConfig', () => {
        ConfigPanel.createOrShow(context, apiService, fileService);
    });

    let disposableChat = vscode.commands.registerCommand('turbotime.openChat', () => {
        ChatPanel.createOrShow(context, apiService);
    });

    context.subscriptions.push(disposableConfig, disposableChat);
}

export function deactivate() {}
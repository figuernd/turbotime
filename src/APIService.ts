import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class APIService {
    private configPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.configPath = path.join(context.extensionPath, 'config.json');
    }

    public async saveConfig(apiEndpoint: string, stringTemplate: string): Promise<void> {
        const config = { apiEndpoint, stringTemplate };
        await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
    }

    public async loadConfig(): Promise<{ apiEndpoint: string, stringTemplate: string }> {
        try {
            const data = await fs.promises.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { apiEndpoint: '', stringTemplate: '' };
        }
    }

    public async makeAPICall(endpoint: string, data: any): Promise<any> {
        console.log(`Making API call to ${endpoint} with data:`, data);
        return { success: true, message: 'API call successful' };
    }
}
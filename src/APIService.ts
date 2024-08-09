import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';

interface Config {
    apiEndpoint: string;
    systemMessage: string;
    userMessageTemplate: string;
    assistantMessageTemplate: string;
    apiKey?: string;
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class APIService {
    private configPath: string;
    private messageHistory: Message[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.configPath = path.join(context.extensionPath, 'config.json');
    }

    public async saveConfig(config: Config): Promise<void> {
        await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
    }

    public async loadConfig(): Promise<Config> {
        try {
            const data = await fs.promises.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {
                apiEndpoint: '',
                systemMessage: '',
                userMessageTemplate: '{message}',
                assistantMessageTemplate: '{message}'
            };
        }
    }

    public async sendUserMessage(userMessage: string): Promise<string> {
        const config = await this.loadConfig();
        
        if (!config.apiEndpoint) {
            throw new Error('API endpoint is not configured');
        }

        const axiosConfig: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (config.apiKey && axiosConfig.headers) {
            axiosConfig.headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        // Add the system message if it's not already in the history
        if (this.messageHistory.length === 0 && config.systemMessage) {
            this.messageHistory.push({ role: 'system', content: config.systemMessage });
        }

        // Add the new user message without template
        this.messageHistory.push({ role: 'user', content: userMessage });

        // Apply templates to create the payload
        const formattedMessages = this.messageHistory.map(msg => ({
            ...msg,
            content: this.applyTemplate(msg.content, msg.role, config)
        }));

        const payload = {
            messages: formattedMessages,
            max_tokens: 150,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        };

        try {
            const response = await axios.post(config.apiEndpoint, payload, axiosConfig);

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const assistantMessage = response.data.choices[0].message.content.trim();
                // Store the raw assistant message
                this.messageHistory.push({ role: 'assistant', content: assistantMessage });
                return assistantMessage;
            } else {
                throw new Error('Unexpected response format from the API');
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw new Error(`Failed to get response: ${error.message}`);
        }
    }

    public getMessageHistory(): Message[] {
        return this.messageHistory;
    }

    public async getFormattedMessageHistory(): Promise<Message[]> {
        const config = await this.loadConfig();
        return this.messageHistory.map(msg => ({
            ...msg,
            content: this.applyTemplate(msg.content, msg.role, config)
        }));
    }

    private applyTemplate(content: string, role: string, config: Config): string {
        if (role === 'user') {
            return config.userMessageTemplate.replace('{message}', content);
        } else if (role === 'assistant') {
            return config.assistantMessageTemplate.replace('{message}', content);
        }
        return content; // For system messages or any other roles
    }

    public clearMessageHistory() {
        this.messageHistory = [];
    }
}
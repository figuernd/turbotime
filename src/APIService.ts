import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import { FileService } from './FileService';

interface Config {
    apiEndpoint: string;
    systemMessage: string;
    userMessageTemplate: string;
    assistantMessageTemplate: string;
    apiKey?: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
    modelName: string;
    responseFormat: string;
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class APIService {
    private configPath: string;
    private messageHistory: Message[] = [];
    private fileService: FileService;

    constructor(private context: vscode.ExtensionContext, fileService: FileService) {
        this.configPath = path.join(context.extensionPath, 'config.json');
        this.fileService = fileService;
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
                assistantMessageTemplate: '{message}',
                maxTokens: 150,
                temperature: 0.7,
                topP: 1,
                frequencyPenalty: 0,
                presencePenalty: 0,
                stopSequences: [],
                modelName: 'meta-llama-3.1-8b',
                responseFormat: 'text'
            };
        }
    }

    private async replaceProjectFiles(message: string): Promise<string> {
        if (message.includes('{project-files}')) {
            const projectFiles = await this.fileService.getProjectFiles();
            const fileList = projectFiles.join('\n');
            return message.replace('{project-files}', fileList);
        }
        return message;
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
            const systemMessage = await this.replaceProjectFiles(config.systemMessage);
            this.messageHistory.push({ role: 'system', content: systemMessage });
        }

        // Add the new user message without template
        this.messageHistory.push({ role: 'user', content: userMessage });

        // Apply templates to create the payload
        const formattedMessages = await Promise.all(this.messageHistory.map(async msg => ({
            ...msg,
            content: await this.applyTemplate(msg.content, msg.role, config)
        })));

        const payload = {
            messages: formattedMessages,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            top_p: config.topP,
            frequency_penalty: config.frequencyPenalty,
            presence_penalty: config.presencePenalty,
            stop: config.stopSequences.length > 0 ? config.stopSequences : undefined,
            model: config.modelName,
            response_format: { type: config.responseFormat },
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
        return Promise.all(this.messageHistory.map(async msg => ({
            ...msg,
            content: await this.applyTemplate(msg.content, msg.role, config)
        })));
    }

    private async applyTemplate(content: string, role: string, config: Config): Promise<string> {
        let templateContent = content;
        if (role === 'user') {
            templateContent = config.userMessageTemplate.replace('{message}', content);
        } else if (role === 'assistant') {
            templateContent = config.assistantMessageTemplate.replace('{message}', content);
        } else if (role === 'system') {
            templateContent = await this.replaceProjectFiles(content);
        }
        return templateContent;
    }

    public clearMessageHistory() {
        this.messageHistory = [];
    }
}
import * as vscode from 'vscode';
import { AiRequest, AiRequestOptions, AIResponse } from '../models/tdd-models';

export class AiClient {
    private readonly apiKey: string;
    private readonly apiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');

        if (!this.apiKey) {
            vscode.window.showErrorMessage('OpenAI API key is not set. Please configure it in settings.');
        }
    }

    public async sendRequest<T> (
        prompt: string, 
        options: AiRequestOptions
    ): Promise<T> {
        if (!this.apiKey) {
            throw new Error('API key is not set.');
        }

        try {
            const messages: AiRequest[] = [];

            if (options.systemPrompt) {
                let systemContent = options.systemPrompt;
                if (options.problemRequirements) {
                    systemContent += `\n\nRequisiti del problema: ${options.problemRequirements}`;
                }
                messages.push({
                    role: 'system',
                    content: systemContent
                });
            }

            let finalPrompt = prompt;

            if (options.context) {
                const contextStr = JSON.stringify(options.context, null, 2);
                finalPrompt = `Contesto del progetto:\n${contextStr}\n\nPrompt:\n${prompt}`;
            }

            messages.push({
                    role: 'user',
                    content: finalPrompt
                });

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://vscode-extension.tdd-mentor-ai', 
                    'X-Title': 'TDD-Mentor-AI'
                },
                body: JSON.stringify({
                    model: options.model ?? 'google/gemma-3-27b-it:free',
                    messages: messages,
                    max_tokens: options.maxTokens ?? 1000,
                    temperature: options.temperature ?? 0.7
                })
            });

            // Log the response for debugging
            vscode.window.showInformationMessage(`Response received from OpenRouter: ${response.status} ${response.statusText}`);
            vscode.window.showInformationMessage(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}`);
            vscode.window.showInformationMessage(`Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage: string;
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = `OpenRouter API error: ${JSON.stringify(errorData)}`;
                } else {
                    errorMessage = await response.text();
                    console.error('Non-JSON error response:', errorMessage);
                }
                
                throw new Error(`AI request failed (${response.status}): ${errorMessage}`);
            }

            const data = await response.json() as AIResponse;

            // Log the complete API response for debugging
            const outputChannel = vscode.window.createOutputChannel('TDD Mentor AI Debug');
            outputChannel.appendLine('--- RISPOSTA COMPLETA API ---');
            outputChannel.appendLine(JSON.stringify(data, null, 2));
            outputChannel.appendLine('--------------------------');
            outputChannel.show();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content;
                try {
                    const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
                    const match = content.match(jsonRegex);
                    
                    const jsonContent = match ? match[1].trim() : content.trim();
                    
                    const parsedContent = JSON.parse(jsonContent);
                    return parsedContent as T;
                } catch (parseError) {
                    console.warn('Failed to parse response as JSON, returning raw response');
                    return data as unknown as T;
                }
            } else {
                throw new Error('Invalid response format from OpenRouter API');
            }

        } catch (error: any) {
            console.error('Errore nella richiesta a OpenRouter:', error);
            throw error;
        }
    }
}
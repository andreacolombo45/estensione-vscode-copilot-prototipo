import { AiRequest, AiRequestOptions, AIResponse } from '../models/tdd-models';

export class AiClient {
    private readonly apiKey: string;
    private readonly apiUrl: string = 'https://api.openai.com/v1/chat/completions';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    public async sendRequest<T> (
        prompt: string, 
        options: AiRequestOptions
    ): Promise<T> {
        if (!this.apiKey) {
            throw new Error('API key is not set.');
        }

        const messages: AiRequest[] = [];

        if (options.systemPrompt) {
            messages.push({
                    role: 'system',
                    content: options.systemPrompt
                });
        }

        messages.push({
                role: 'user',
                content: prompt
            });

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
            'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
                model: options.model ?? 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: options.maxTokens ?? 2000,
                temperature: options.temperature ?? 0.7
                })
            });

        if (!response.ok) {
                const errorText = await response.text();
            throw new Error(`AI request failed: ${response.status} ${errorText}`);
        }

            const data = await response.json() as AIResponse;

        return data as T;
    }
}
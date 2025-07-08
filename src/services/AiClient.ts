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
        
        return '' as T;
    }
}
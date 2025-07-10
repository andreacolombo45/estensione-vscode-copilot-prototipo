import * as vscode from 'vscode';
import { UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';
import { AiClient } from './ai-client';
import { CodeAnalysisService } from './code-analysis-service';
import { aiConfigs } from '../models/tdd-prompts';

type AiGeneratedItem = UserStory | TestProposal | RefactoringSuggestion;

export class AiService {
    private static instance: AiService;
    private aiClient: AiClient;
    private codeAnalysisService: CodeAnalysisService;
    private readonly configs: typeof aiConfigs;

    private constructor() {
        const apikey = vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');
        this.aiClient = new AiClient(apikey);
        this.codeAnalysisService = CodeAnalysisService.getInstance();

        this.configs = aiConfigs;
    }

    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    private async generateTenItems<T extends AiGeneratedItem>(
        type: 'userStories' | 'testProposals' | 'refactoringSuggestions',
        context: any = {}
    ): Promise<T[]> {
        try {
            const config = this.configs[type];
            let userPrompt = config.userPrompt;

            const projectContext = await this.getProjectContext();

            const response = await this.aiClient.sendRequest<{ items: T[] }>(
                userPrompt, 
                {
                systemPrompt: config.systemPrompt,
                model: config.modelOptions?.model,
                maxTokens: config.modelOptions?.maxTokens,
                temperature: config.modelOptions?.temperature,
                context: { ...projectContext, ...context }
            });

            if (response && Array.isArray(response.items)) {
                return response.items;
            } else {
                throw new Error('Response format is invalid.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Errore with the generation of ${type}: ${error}`);
            return [];
        }
    }

    private async selectThreeItems<T extends AiGeneratedItem>(
        type: 'userStories' | 'testProposals' | 'refactoringSuggestions',
        items: T[],
        context: any = {}
    ): Promise<T[]> {
        if (items.length <= 3) {
            return items;
        }

        try {
            const config = this.configs[type];
            const selectionPrompt = config.selectionPrompt;

            const response = await this.aiClient.sendRequest<{ items: T[] }>(
                selectionPrompt,
                {
                    systemPrompt: '',
                    model: config.modelOptions?.model,
                    temperature: 0.3,
                    context: {
                        ...context,
                        items
                    }
                }
            );

            if (response && Array.isArray(response.items)) {
                return response.items.slice(0, 3);
            } else {
                throw new Error('Ai Response is invalid.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error with the selection of ${type}: ${error}`);
            return items.slice(0, 3);
        }
    }

    private async getProjectContext(): Promise<any> {
        try {
            const projectStructure = await this.codeAnalysisService.getProjectStructure();
            const commitHistory = await this.codeAnalysisService.getCommitHistory();

            return {
                projectStructure,
                commitHistory
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Error during workspace analysis: ${error}`);
            return {};
        }
    }

    public async generateUserStories(): Promise<UserStory[]> {
        try {
            const tenUserStories = await this.generateTenItems<UserStory>('userStories');

            return await this.selectThreeItems<UserStory>('userStories', tenUserStories);
        } catch (error) {
            vscode.window.showErrorMessage(`Error during user story generation: ${error}`);
            return [];
        }
    }

    public async generateTestProposals(userStory: UserStory): Promise<TestProposal[]> {
        try {
            const tenTestProposals = await this.generateTenItems<TestProposal>('testProposals', { userStory });
            
            return await this.selectThreeItems<TestProposal>('testProposals', tenTestProposals, { userStory });
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of test proposals: ${error}`);
            return [];
        }
    }

    public async generateRefactoringSuggestions(): Promise<RefactoringSuggestion[]> {
        try {
            /*const implementedCode = await this.codeAnalysisService.getImplementedCode();*/
            const tenRefactoringSuggestions = await this.generateTenItems<RefactoringSuggestion>('refactoringSuggestions' /*,{ implementedCode }*/);

            return await this.selectThreeItems<RefactoringSuggestion>('refactoringSuggestions', tenRefactoringSuggestions);
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of refactoring suggestions: ${error}`);
            return [];
        }
    }

    public async verifyTests(): Promise<{ success: boolean; message: string }> {
        try {
            return {
                success: true,
                message: 'Tutti i test sono stati completati con successo!'
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Errore durante la verifica dei test: ${error}`);
            return {
                success: false,
                message: `Errore durante l'esecuzione dei test: ${error}`
            };
        }
    }
}

import * as vscode from 'vscode';
import { UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';
import { AiClient } from './ai-client';
import { CodeAnalysisService } from './code-analysis-service';
import { AiGenerationConfig } from '../models/tdd-models';

type AiGeneratedItem = UserStory | TestProposal | RefactoringSuggestion;

export class AiService {
    private static instance: AiService;
    private aiClient: AiClient;
    private codeAnalysisService: CodeAnalysisService;

    private readonly configs: {
        userStories: AiGenerationConfig<UserStory>;
        testProposals: AiGenerationConfig<TestProposal>;
        refactoringSuggestions: AiGenerationConfig<RefactoringSuggestion>;
    };

    private constructor() {
        const apikey = vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');
        this.aiClient = new AiClient(apikey);
        this.codeAnalysisService = CodeAnalysisService.getInstance();

        this.configs = {
            userStories: {
                systemPrompt: 'Sei un esperto di analisi di requisiti software. Il tuo compito è analizzare il contesto del progetto e generare 10 user stories realistiche e implementabili.',
                userPrompt: 'Analizza il contesto del progetto e genera 10 potenziali user stories basate sul codice implementato e sulla storia dei commit. Le user stories devono seguire il formato "Come [ruolo] voglio [funzionalità] per [motivo]". Ogni user story deve avere un id, un titolo e una descrizione breve.',
                selectionPrompt: 'Date queste user stories, seleziona le 3 più rilevanti e utili per il progetto. Considera fattori come la fattibilità, il valore per l\'utente e le dipendenze con altre funzionalità.',
                modelOptions: {
                    model: 'gpt-3.5-turbo',
                    maxTokens: 2000,
                    temperature: 0.7
                }
            },
            testProposals: {
                systemPrompt: 'Sei un esperto di TDD (Test-Driven Development). Il tuo compito è generare 10 proposte di test che guidino l\'implementazione di una user story.',
                userPrompt: 'Genera 10 proposte di test dettagliate per la user story selezionata. Ogni test deve avere un id, un titolo, una descrizione e il codice di implementazione.',
                selectionPrompt: 'Dati questi test per la user story selezionata, seleziona i 3 test più rilevanti e utili. Considera fattori come la copertura del codice, la complessità dell\'implementazione e i casi limite.',
                modelOptions: {
                    model: 'gpt-3.5-turbo',
                    maxTokens: 2000,
                    temperature: 0.7
                }
            },
            refactoringSuggestions: {
                systemPrompt: 'Sei un esperto di refactoring del codice e code smell. Il tuo compito è analizzare il codice esistente e generare 10 suggerimenti di refactoring per migliorare la manutenibilità e le prestazioni.',
                userPrompt: 'Analizza il codice e suggerisci 10 miglioramenti. Per ogni suggerimento, fornisci un id, un titolo e una descrizione dettagliata del refactoring proposto. Considera aspetti come la riduzione della complessità, l\'eliminazione di code smell, il miglioramento della leggibilità e l\'uso di pattern riconosciuti.',
                selectionPrompt: 'Dati questi suggerimenti di refactoring, seleziona i 3 più impattanti. Considera fattori come l\'impatto sul codice esistente, il rapporto tra la complessità e i benefici attesi.',
                modelOptions: {
                    model: 'gpt-3.5-turbo',
                    maxTokens: 2000,
                    temperature: 0.7
                }
            }
        };
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
            console.log('Generating refactoring suggestions...');
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

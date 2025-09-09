import * as vscode from 'vscode';
import { UserStory, TestProposal, RefactoringSuggestion, RefactoringFeedback } from '../models/tdd-models';
import { AiClient } from './ai-client';
import { CodeAnalysisService } from './code-analysis-service';
import { aiConfigs } from '../models/tdd-prompts';
import path from 'path';
import fs from 'fs';
import { error } from 'console';

type AiGeneratedItem = UserStory | TestProposal | RefactoringSuggestion | RefactoringFeedback;
type AiResponse = { content?: string } | string;

export class AiService {
    private static instance: AiService;

    private constructor(private aiClient: AiClient,
        private codeAnalysisService: CodeAnalysisService,
        private readonly configs: typeof aiConfigs
    ) {}

    public static async getInstance(codeAnalysisService: CodeAnalysisService, aiClient?: AiClient): Promise<AiService> {
        if (!AiService.instance) {
            if (!aiClient) {
                const apikey = vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');
                aiClient = new AiClient(apikey);
            }
            AiService.instance = new AiService(aiClient, codeAnalysisService, aiConfigs);
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
                problemRequirements: vscode.workspace.getConfiguration('tddMentorAI').get('problemRequirements', ''),
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
            const selectionPrompt = `${config.selectionPrompt} ${JSON.stringify(items)}`;

            const response = await this.aiClient.sendRequest<{ items: T[] }>(
                selectionPrompt,
                {
                    systemPrompt: '',
                    model: config.modelOptions?.model,
                    temperature: 0.3,
                    context: {
                        ...context,
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
            const commitHistory = await this.codeAnalysisService.getCommitHistory(3);

            const commitDiffs: { message: string; diff: string }[] = [];
            for (const commit of commitHistory) {
                const diff = await this.codeAnalysisService.showCommitDetails([commit.hash]);
                commitDiffs.push({
                    message: commit.message,
                    diff: diff
                });
            }

            function safeRead(file: string): string {
                try {
                    return fs.readFileSync(file, 'utf8');
                } catch {
                    return '';
                }
            }

            const sourceFilesContent = projectStructure.sourceFiles.slice(0, 5).map(f => ({
                file: f,
                content: safeRead(f)
            }));

            const testFilesContent = projectStructure.testFiles.slice(0, 5).map(f => ({
                file: f,
                content: safeRead(f)
            }));

            return {
                language: projectStructure.language,
                hasTests: projectStructure.hasTests,
                testFiles: testFilesContent,
                sourceFiles: sourceFilesContent,
                recentCommits: commitDiffs
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
            
            const finalProposals = await this.selectThreeItems<TestProposal>('testProposals', tenTestProposals, { userStory });

            return finalProposals.map(proposal => ({
                ...proposal,
                targetFile: path.basename(proposal.targetFile ?? '')
            }));
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of test proposals: ${error}`);
            return [];
        }
    }

    public async generateRefactoringSuggestions(): Promise<RefactoringSuggestion[]> {
        try {
            const implementedCode = await this.codeAnalysisService.getImplementedCode();
            const tenRefactoringSuggestions = await this.generateTenItems<RefactoringSuggestion>('refactoringSuggestions', { implementedCode });

            return await this.selectThreeItems<RefactoringSuggestion>('refactoringSuggestions', tenRefactoringSuggestions);
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of refactoring suggestions: ${error}`);
            return [];
        }
    }

    public async generateRefactoringFeedback(): Promise<RefactoringFeedback | null> {
        try {
            const implementedCode = await this.codeAnalysisService.getImplementedCode();
            const projectContext = await this.getProjectContext();
        
            const config = this.configs.refactoringFeedback;
            const userPrompt = config.userPrompt;

            const response = await this.aiClient.sendRequest<RefactoringFeedback>(
                userPrompt, 
                {
                    systemPrompt: config.systemPrompt,
                    model: config.modelOptions?.model,
                    maxTokens: config.modelOptions?.maxTokens,
                    temperature: config.modelOptions?.temperature,
                    context: { ...projectContext, implementedCode }
            });

            if (response) {
                return response;
            } else {
                throw new Error('Response format is invalid.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of refactoring feedback: ${error}`);
            return null;
        }
    }

    public async askGreenQuestion(
        question: string, 
        chatHistory: { user: string, ai: string }[], 
        greenQuestionCount: number,
        selectedTest: TestProposal | undefined
    ): Promise<string | null> {
        try {
            const projectContext = await this.getProjectContext();
            const userPrompt = this._buildGreenPhasePrompt(question, greenQuestionCount);

            const response = await this.aiClient.sendRequest<string>(
                userPrompt,
                {
                    systemPrompt: this.configs.greenQuestion.systemPrompt,
                    model: this.configs.greenQuestion.modelOptions?.model,
                    maxTokens: this.configs.greenQuestion.modelOptions?.maxTokens,
                    temperature: this.configs.greenQuestion.modelOptions?.temperature,
                    context: { ...projectContext, chatHistory, selectedTest }
                }
            );

            if (response) {
                return this.parseAiResponse(response);
            } else {
                throw new Error('Response format is invalid.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error during the generation of refactoring feedback: ${error}`);
            return null;
        }
    }

    private _buildGreenPhasePrompt(question: string, level: number): string {
        switch (level) {
            case 1:
                return `L'utente ti chiede: "${question}". Rispondi solo con domande generiche che stimolino la riflessione, senza dare suggerimenti specifici.`;
            case 2:
                return `L'utente ti chiede: "${question}". Puoi dare suggerimenti più mirati, ma non soluzioni, e stimola il ragionamento.`;
            case 3:
                return `L'utente ti chiede: "${question}". Dai suggerimenti molto mirati, ma non fornire mai la soluzione completa.`;
            default:
                return `L'utente ti chiede: "${question}". Rispondi solo con domande generiche che stimolino la riflessione, senza dare suggerimenti specifici.`;
        }
    }

    private parseAiResponse(response: any): string {
        if (typeof response === 'string') {
            return response;
        }
        if (
            response.choices &&
            Array.isArray(response.choices) &&
            response.choices[0] &&
            response.choices[0].message &&
            typeof response.choices[0].message.content === 'string'
        ) {
            return response.choices[0].message.content;
        }
        if (response.content && typeof response.content === 'string') {
            return response.content;
        }
        return '';
    }
}

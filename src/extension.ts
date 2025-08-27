import * as vscode from 'vscode';
import { TddCycleView } from './views/tdd-cycle-view';
import { TddInteractionView } from './views/tdd-interaction-view';
import { TddPhase } from './models/tdd-models';
import { TddStateManager } from './services/tdd-state-manager';
import { AiService } from './services/ai-service';
import { CodeAnalysisService } from './services/code-analysis-service';
import { GitService } from './services/git-service';
import { AiClient } from './services/ai-client';

export async function activate(context: vscode.ExtensionContext) {

	console.log('Estensione "TDD-Mentor-AI" attivata!');

    const stateManager = TddStateManager.getInstance(context);
    let tddInteractionViewProvider: TddInteractionView | undefined;
    let tddCycleViewProvider: TddCycleView | undefined;

    const previousSession = stateManager.loadPreviousSession();

    const apikey = vscode.workspace.getConfiguration('tddMentorAI').get('openaiApiKey', '');
    if (!apikey) {
        const configAction = 'Configura API Key';
        const response = await vscode.window.showWarningMessage(
            'Per utilizzare TDD-Mentor-AI è necessaria una API key di OpenAI.',
            configAction
        );
        
        if (response === configAction) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'tddMentorAI.openaiApiKey');
        }
    }

    const problemRequirements = vscode.workspace.getConfiguration('tddMentorAI').get('problemRequirements', '');
    if (!problemRequirements) {
        const configAction = 'Configura Requisiti Problema';
        const response = await vscode.window.showWarningMessage(
            'Per utilizzare TDD-Mentor-AI è necessario specificare i requisiti del problema.',
            configAction
        );

        if (response === configAction) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'tddMentorAI.problemRequirements');
        }
    }

    let gitService: GitService | null = null;
    let codeAnalysisService: CodeAnalysisService | null = null;
    let aiService: AiService;

    try {
        gitService = await GitService.create();
        if (!gitService) {
            const initGitAction = 'Inizializza Git';
            const response = await vscode.window.showWarningMessage(
                'TDD-Mentor-AI richiede un repository Git. Alcune funzionalità saranno limitate.',
                initGitAction
            );
            
            if (response === initGitAction) {
                vscode.commands.executeCommand('git.init');
            }
        } else {
            codeAnalysisService = CodeAnalysisService.getInstance(gitService);
            
            const aiClient = new AiClient(apikey);
            aiService = await AiService.getInstance(codeAnalysisService, aiClient);

            tddCycleViewProvider = new TddCycleView(context.extensionUri);

            try {
                if (aiService && codeAnalysisService) {
                    tddInteractionViewProvider = await TddInteractionView.create(context.extensionUri, aiService, codeAnalysisService);

                    if (apikey && problemRequirements && gitService && !previousSession) {
                        vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: 'TDD Mentor AI sta generando le user stories iniziali...',
                            cancellable: false
                        }, async () => {
                            const userStories = await aiService.generateUserStories();
                            stateManager.setUserStories(userStories);
                            stateManager.setPhase(TddPhase.PICK);
                            vscode.window.showInformationMessage('User stories iniziali generate con successo!');
                        });
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Errore durante la creazione della vista di interazione TDD: ${error}`);
            }
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Errore durante l'inizializzazione dei servizi: ${error}`);
    }

    if (tddCycleViewProvider) {
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                TddCycleView.viewType,
                tddCycleViewProvider
            )
        );
    }

    if (tddInteractionViewProvider) {
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                TddInteractionView.viewType,
                tddInteractionViewProvider
            )
        );
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.start', () => {
            vscode.commands.executeCommand('workbench.view.extension.tdd-mentor-ai-sidebar');
            
            stateManager.reset();
            vscode.window.showInformationMessage('Sessione TDD Mentor avviata!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.pickPhase', async () => {
            stateManager.setPhase(TddPhase.PICK);
            
            const userStories = await aiService.generateUserStories();
            stateManager.setUserStories(userStories);
            
            vscode.window.showInformationMessage('Fase PICK avviata: scegli una user story.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.redPhase', () => {
            const state = stateManager.state;
            if (!state.selectedUserStory) {
                vscode.window.showWarningMessage('Devi prima selezionare una user story nella fase PICK.');
                return;
            }
            
            stateManager.setPhase(TddPhase.RED);
            vscode.window.showInformationMessage('Fase RED avviata: scegli un test da implementare.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.greenPhase', () => {
            const state = stateManager.state;
            if (!state.selectedTest) {
                vscode.window.showWarningMessage('Devi prima selezionare un test nella fase RED.');
                return;
            }
            
            stateManager.setPhase(TddPhase.GREEN);
            vscode.window.showInformationMessage('Fase GREEN avviata: implementa il codice per far passare il test.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.refactorPhase', () => {
            const state = stateManager.state;
            if (!state.testResults?.success) {
                vscode.window.showWarningMessage('I test devono passare prima di procedere al refactoring.');
                return;
            }
            
            stateManager.setPhase(TddPhase.REFACTORING);
            vscode.window.showInformationMessage('Fase REFACTORING avviata: migliora il tuo codice.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.verify', async () => {
            vscode.window.showInformationMessage('Verifica dei test in corso...');

            const testResults = await codeAnalysisService?.runTests();
            if (testResults) {
                stateManager.setTestResults(testResults.success, testResults.output);
            }

            if (testResults?.success) {
                vscode.window.showInformationMessage('Tutti i test sono passati!');
            } else {
                vscode.window.showWarningMessage('Alcuni test non sono passati. Controlla il messaggio di errore.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.complete', async () => {
            stateManager.setPhase(TddPhase.PICK);
            
            const userStories = await aiService.generateUserStories();
            stateManager.setUserStories(userStories);
            
            vscode.window.showInformationMessage('Fase completata! Ritorno alla fase PICK.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.runTests', async () => {
            stateManager.setPhase(TddPhase.RED);

            const testResults = await codeAnalysisService?.runTests();
            if (testResults) {
                vscode.window.showInformationMessage(`Test eseguiti: ${testResults.success ? 'Successo' : 'Fallimento'}`);
            } else {
                vscode.window.showErrorMessage('Errore durante l\'esecuzione dei test.');
            }
        })
    );
}

export function deactivate() {}

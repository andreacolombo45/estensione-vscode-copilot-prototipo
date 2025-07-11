import * as vscode from 'vscode';
import { TddCycleView } from './views/tdd-cycle-view';
import { TddInteractionView } from './views/tdd-interaction-view';
import { TddPhase } from './models/tdd-models';
import { TddStateManager } from './services/tdd-state-manager';
import { AiService } from './services/ai-service';
import { CodeAnalysisService } from './services/code-analysis-service';
import { GitService } from './services/git-service';

export async function activate(context: vscode.ExtensionContext) {

	console.log('Estensione "TDD-Mentor-AI" attivata!');

    const stateManager = TddStateManager.getInstance();
    const aiService = await AiService.getInstance();
    const gitService = await GitService.create();
    if (!gitService) {
		console.warn('Git not initialized.');
		return;
	}
    const codeAnalysisService = CodeAnalysisService.getInstance(gitService);

    const tddCycleViewProvider = new TddCycleView(context.extensionUri);
    const tddInteractionViewProvider = await TddInteractionView.create(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            TddCycleView.viewType,
            tddCycleViewProvider
        )
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            TddInteractionView.viewType,
            tddInteractionViewProvider
        )
    );

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
            
            const testResults = await aiService.verifyTests();
            stateManager.setTestResults(testResults.success, testResults.message);
            
            if (testResults.success) {
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
}

export function deactivate() {}

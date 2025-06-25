// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TddCycleView } from './views/tdd-cycle-view';
import { TddInteractionView } from './views/tdd-interaction-view';
import { TddPhase } from './models/tdd-models';
import { TddStateManager } from './services/tdd-state-manager';
import { AiService } from './services/ai-service';
import { CodeAnalysisService } from './services/code-analysis-service';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Estensione "TDD-Mentor-AI" attivata!');

    // Inizializza i servizi
    const stateManager = TddStateManager.getInstance();
    const aiService = AiService.getInstance();
    const codeAnalysisService = CodeAnalysisService.getInstance();

    // Registra i provider delle viste
    const tddCycleViewProvider = new TddCycleView(context.extensionUri);
    const tddInteractionViewProvider = new TddInteractionView(context.extensionUri);

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

    // Registra i comandi
    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.start', () => {
            // Mostra la view del ciclo TDD
            vscode.commands.executeCommand('workbench.view.extension.tdd-mentor-ai-sidebar');
            
            // Resetta lo stato dell'estensione
            stateManager.reset();
            vscode.window.showInformationMessage('Sessione TDD Mentor avviata!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tdd-mentor-ai.pickPhase', async () => {
            stateManager.setPhase(TddPhase.PICK);
            
            // Genera nuove user stories
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
            
            // Esegui i test e verifica i risultati
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
            // Completa la fase corrente e torna alla fase PICK
            stateManager.setPhase(TddPhase.PICK);
            
            // Genera nuove user stories
            const userStories = await aiService.generateUserStories();
            stateManager.setUserStories(userStories);
            
            vscode.window.showInformationMessage('Fase completata! Ritorno alla fase PICK.');
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}

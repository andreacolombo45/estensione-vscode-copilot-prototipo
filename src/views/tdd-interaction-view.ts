import * as vscode from 'vscode';
import { TddPhase, TddState, UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';
import { TddStateManager } from '../services/tdd-state-manager';
import { AiService } from '../services/ai-service';
import { CodeAnalysisService } from '../services/code-analysis-service';

/**
 * WebView che gestisce l'interazione con il mentor AI
 */
export class TddInteractionView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'tdd-mentor-ai-interaction';
    
    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly _stateManager: TddStateManager;
    private readonly _aiService: AiService;
    private readonly _codeAnalysisService: CodeAnalysisService;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        this._stateManager = TddStateManager.getInstance();
        this._aiService = AiService.getInstance();
        this._codeAnalysisService = CodeAnalysisService.getInstance();
        
        // Registra listener per i cambiamenti di stato
        this._stateManager.onStateChanged(() => {
            if (this._view) {
                this._updateView();
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        // Configura il webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Imposta il contenuto iniziale
        this._updateView();

        // Gestisce i messaggi dal webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'selectUserStory':
                    if (data.storyId) {
                        this._stateManager.selectUserStory(data.storyId);
                        this._stateManager.setPhase(TddPhase.RED);
                        
                        // Genera proposte di test per la storia selezionata
                        const state = this._stateManager.state;
                        if (state.selectedUserStory) {
                            const testProposals = await this._aiService.generateTestProposals(state.selectedUserStory);
                            this._stateManager.setTestProposals(testProposals);
                        }
                    }
                    break;
                    
                case 'selectTestProposal':
                    if (data.testId) {
                        this._stateManager.selectTestProposal(data.testId);
                        const state = this._stateManager.state;
                        if (state.selectedTest) {
                            this._stateManager.setTestEditingMode(
                                true,
                                state.selectedTest.code,
                                state.selectedTest.targetFile || 'test.js'
                            );
                        }
                    }
                    break;
                    
                case 'verifyTests':
                    // Esegui i test e verifica i risultati
                    const testResults = await this._aiService.verifyTests();
                    this._stateManager.setTestResults(testResults.success, testResults.message);
                    
                    // Se i test hanno successo, passa alla fase di refactoring
                    if (testResults.success) {
                        this._stateManager.setPhase(TddPhase.REFACTORING);
                        
                        // Genera suggerimenti di refactoring
                        const refactoringSuggestions = await this._aiService.generateRefactoringSuggestions();
                        this._stateManager.setRefactoringSuggestions(refactoringSuggestions);
                    }
                    break;
                    
                case 'completePhase':
                    // Completa la fase corrente e torna alla fase PICK
                    this._stateManager.setPhase(TddPhase.PICK);
                    
                    // Genera nuove user stories
                    const userStories = await this._aiService.generateUserStories();
                    this._stateManager.setUserStories(userStories);
                    break;
                    
                case 'refreshUserStories':
                    // Genera nuove user stories
                    const stories = await this._aiService.generateUserStories();
                    this._stateManager.setUserStories(stories);
                    break;
            }
        });
    }

    private async _updateView() {
        if (!this._view) {
            return;
        }

        const state = this._stateManager.state;
        
        // Se è la prima volta che si carica la vista nella fase PICK, genera user stories
        if (state.currentPhase === TddPhase.PICK && state.userStories.length === 0) {
            const userStories = await this._aiService.generateUserStories();
            this._stateManager.setUserStories(userStories);
        }
        
        this._view.webview.html = await this._getHtmlForWebview(state);
    }

    private async _getHtmlForWebview(state: TddState): Promise<string> {
        // Contenuto specifico per ogni fase
        let phaseContent = '';
        
        switch (state.currentPhase) {
            case TddPhase.PICK:
                phaseContent = this._getPickPhaseHtml(state.userStories);
                break;
                
            case TddPhase.RED:
                phaseContent = this._getRedPhaseHtml(state.testProposals, state.selectedUserStory);
                break;
                
            case TddPhase.GREEN:
                phaseContent = this._getGreenPhaseHtml(state.selectedTest);
                break;
                
            case TddPhase.REFACTORING:
                phaseContent = this._getRefactoringPhaseHtml(state.refactoringSuggestions);
                break;
        }

        return `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Interazione TDD</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 15px;
                }
                
                h1 {
                    font-size: 1.2em;
                    margin-bottom: 1em;
                }
                
                h2 {
                    font-size: 1.1em;
                    margin-top: 1.5em;
                    margin-bottom: 0.8em;
                }
                
                .card {
                    background-color: var(--vscode-input-background);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 15px;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                
                .card:hover {
                    transform: translateY(-2px);
                    background-color: var(--vscode-input-hoverBackground);
                }
                
                .card.selected {
                    border-left: 3px solid var(--vscode-activityBarBadge-background);
                }
                
                .card-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .card-description {
                    font-size: 0.9em;
                    margin-bottom: 10px;
                }
                
                .btn {
                    padding: 8px 12px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-top: 10px;
                }
                
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .code-block {
                    background-color: var(--vscode-editor-background);
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                    margin: 10px 0;
                    white-space: pre;
                    line-height: 1.5;
                }
                
                .test-result {
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 5px;
                }
                
                .test-result.success {
                    background-color: var(--vscode-testing-iconPassed);
                    color: var(--vscode-editor-background);
                }
                
                .test-result.failure {
                    background-color: var(--vscode-testing-iconFailed);
                    color: var(--vscode-editor-background);
                }
                
                .phase-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .phase-emoji {
                    font-size: 1.5em;
                    margin-right: 10px;
                }
                
                .refresh-btn {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: var(--vscode-button-background);
                    cursor: pointer;
                    font-size: 1em;
                }
                
                .refresh-btn:hover {
                    color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            ${phaseContent}
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function selectUserStory(storyId) {
                    vscode.postMessage({
                        command: 'selectUserStory',
                        storyId: storyId
                    });
                }
                
                function selectTestProposal(testId) {
                    vscode.postMessage({
                        command: 'selectTestProposal',
                        testId: testId
                    });
                }
                
                function verifyTests() {
                    vscode.postMessage({
                        command: 'verifyTests'
                    });
                }
                
                function completePhase() {
                    vscode.postMessage({
                        command: 'completePhase'
                    });
                }
                
                function refreshUserStories() {
                    vscode.postMessage({
                        command: 'refreshUserStories'
                    });
                }
            </script>
        </body>
        </html>
        `;
    }

    private _getPickPhaseHtml(userStories: UserStory[]): string {
        let storiesHtml = '';
        
        if (userStories.length === 0) {
            storiesHtml = '<div>Caricamento user stories...</div>';
        } else {
            userStories.forEach(story => {
                storiesHtml += `
                <div class="card" onclick="selectUserStory('${story.id}')">
                    <div class="card-title">${story.title}</div>
                    <div class="card-description">${story.description}</div>
                </div>
                `;
            });
        }
        
        return `
        <div class="phase-header">
            <span class="phase-emoji">📋</span>
            <h1>Fase PICK - Scegli una User Story</h1>
            <button class="refresh-btn" onclick="refreshUserStories()">🔄</button>
        </div>
        
        <p>Seleziona una delle seguenti user stories per iniziare il ciclo TDD:</p>
        
        ${storiesHtml}
        `;
    }

    private _getRedPhaseHtml(testProposals: TestProposal[], selectedUserStory?: UserStory): string {
        if (!selectedUserStory) {
            return '<div>Nessuna user story selezionata. Torna alla fase PICK.</div>';
        }
        
        let proposalsHtml = '';
        
        if (testProposals.length === 0) {
            proposalsHtml = '<div>Generazione test in corso...</div>';
        } else {
            testProposals.forEach(test => {
                proposalsHtml += `
                <div class="card" onclick="selectTestProposal('${test.id}')">
                    <div class="card-title">${test.title}</div>
                    <div class="card-description">${test.description}</div>
                    <div class="code-block">${this._escapeHtml(test.code)}</div>
                    <div>File di destinazione: ${test.targetFile || 'test.js'}</div>
                </div>
                `;
            });
        }
        
        return `
        <div class="phase-header">
            <span class="phase-emoji">🔴</span>
            <h1>Fase RED - Scegli un Test</h1>
        </div>
        
        <h2>User Story selezionata: ${selectedUserStory.title}</h2>
        <p>${selectedUserStory.description}</p>
        
        <p>Seleziona uno dei seguenti test proposti:</p>
        
        ${proposalsHtml}
        `;
    }

    private _getGreenPhaseHtml(selectedTest?: TestProposal): string {
        if (!selectedTest) {
            return '<div>Nessun test selezionato. Torna alla fase RED.</div>';
        }
        
        let testResultHtml = '';
        const state = this._stateManager.state;
        
        if (state.testResults) {
            const resultClass = state.testResults.success ? 'success' : 'failure';
            testResultHtml = `
            <div class="test-result ${resultClass}">
                ${state.testResults.message}
            </div>
            `;
            
            if (state.testResults.success) {
                testResultHtml += `
                <button class="btn" onclick="completePhase()">Passa al Refactoring</button>
                `;
            }
        }
        
        return `
        <div class="phase-header">
            <span class="phase-emoji">🟢</span>
            <h1>Fase GREEN - Implementa il Codice</h1>
        </div>
        
        <h2>Test selezionato: ${selectedTest.title}</h2>
        <p>${selectedTest.description}</p>
        
        <div class="code-block">${this._escapeHtml(selectedTest.code)}</div>
        
        <p>Ora implementa il codice necessario per far passare questo test.</p>
        
        <button class="btn" onclick="verifyTests()">Verifica Test</button>
        
        ${testResultHtml}
        `;
    }

    private _getRefactoringPhaseHtml(refactoringSuggestions: RefactoringSuggestion[]): string {
        let suggestionsHtml = '';
        
        if (refactoringSuggestions.length === 0) {
            suggestionsHtml = '<div>Generazione suggerimenti in corso...</div>';
        } else {
            refactoringSuggestions.forEach(suggestion => {
                suggestionsHtml += `
                <div class="card">
                    <div class="card-title">${suggestion.title}</div>
                    <div class="card-description">${suggestion.description}</div>
                </div>
                `;
            });
        }
        
        return `
        <div class="phase-header">
            <span class="phase-emoji">🔄</span>
            <h1>Fase REFACTORING - Migliora il Codice</h1>
        </div>
        
        <p>Ecco alcuni suggerimenti per migliorare il tuo codice:</p>
        
        ${suggestionsHtml}
        
        <p>Applica i miglioramenti che ritieni appropriati, poi prosegui.</p>
        
        <button class="btn" onclick="completePhase()">Completa Ciclo</button>
        `;
    }

    private _escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

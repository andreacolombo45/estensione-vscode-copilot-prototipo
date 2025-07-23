import * as vscode from 'vscode';
import { TddPhase, TddState, UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';
import { TddStateManager } from '../services/tdd-state-manager';
import { AiService } from '../services/ai-service';
import { CodeAnalysisService } from '../services/code-analysis-service';

export class TddInteractionView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'tdd-mentor-ai-interaction';
    
    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly _stateManager: TddStateManager;
    private readonly _aiService: AiService;
    private readonly _codeAnalysisService: CodeAnalysisService;

    private constructor(
        extensionUri: vscode.Uri,
        aiService: AiService,
        codeAnalysisService: CodeAnalysisService
    ) {
        this._extensionUri = extensionUri;
        this._stateManager = TddStateManager.getInstance();
        this._aiService = aiService;
        this._codeAnalysisService = codeAnalysisService;

        this._stateManager.onStateChanged(() => {
            if (this._view) {
                this._updateView();
            }
        });
    }

    public static async create(
        extensionUri: vscode.Uri,
        aiService: AiService,
        codeAnalysisService: CodeAnalysisService
    ): Promise<TddInteractionView> {
        if (!aiService) {
            throw new Error('AI Service is not initialized.');
        }
        if (!codeAnalysisService) {
            throw new Error('Code Analysis Service is not initialized.');
        }
        return new TddInteractionView(extensionUri, aiService, codeAnalysisService);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this._updateView();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'selectUserStory':
                    if (data.storyId) {
                        const currentUserStory = this._stateManager.state.selectedUserStory;
                        this._stateManager.selectUserStory(data.storyId);
                        this._stateManager.setPhase(TddPhase.RED);
                        
                        const state = this._stateManager.state;
                        if (state.selectedUserStory && currentUserStory?.id !== data.storyId) {
                            this._stateManager.setTestProposals([]);
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
                                true
                            );
                        }
                    }
                    break;
                
                case 'confirmTestCode':
                    if (data.testCode && data.targetFile) {
                        this._stateManager.updateModifiedSelectedTest(data.testCode, data.targetFile);
                        
                        const success = await this._codeAnalysisService.insertTestCode(
                            data.testCode,
                            data.targetFile
                        );

                        if (success) {
                            this._stateManager.setTestEditingMode(false);
                            this._stateManager.setPhase(TddPhase.GREEN);
                        } else {
                            vscode.window.showErrorMessage('Non è stato possibile inserire il codice di test nel file.');
                        }
                    }
                    break;
                
                case 'cancelEditTest':
                    this._stateManager.setTestEditingMode(false);
                    this._stateManager.setPhase(TddPhase.RED);
                    break;
                    
                case 'verifyTests':
                    const testResults = await this._codeAnalysisService.runTests();
                    this._stateManager.setTestResults(testResults.success, testResults.output);
                    
                    if (testResults.success) {
                        await this._codeAnalysisService.commitChanges(this._stateManager.state);
                        this._stateManager.setPhase(TddPhase.REFACTORING);
                        
                        const refactoringSuggestions = await this._aiService.generateRefactoringSuggestions();
                        this._stateManager.setRefactoringSuggestions(refactoringSuggestions);
                    }
                    break;
                    
                case 'completeCycle':
                    try {
                        await this.commitRefactoring();

                        this._stateManager.reset();
                        this._stateManager.setPhase(TddPhase.PICK);

                        const userStories = await this._aiService.generateUserStories();
                        this._stateManager.setUserStories(userStories);
                    } catch (error) {
                        console.error('Errore durante il ciclo TDD:', error);
                    }
                    break;
                
                case 'commitAndStay':
                    await this.commitRefactoring();
                    break;
                
                case 'commitAndGoToTest':
                    try {
                        await this.commitRefactoring();

                        this._stateManager.resetForNewTests();
                        this._stateManager.setPhase(TddPhase.RED);

                        if (this._stateManager.state.selectedUserStory) {
                            const testProposals = await this._aiService.generateTestProposals(this._stateManager.state.selectedUserStory);
                            this._stateManager.setTestProposals(testProposals);
                        }
                    } catch (error) {
                        console.error('Errore durante il ciclo TDD:', error);
                    }
                
                    break;

                case 'refreshUserStories':
                    const stories = await this._aiService.generateUserStories();
                    this._stateManager.setUserStories(stories);
                    break;
                
                case 'refreshTestProposals':
                    if (this._stateManager.state.selectedUserStory) {
                        const proposals = await this._aiService.generateTestProposals(this._stateManager.state.selectedUserStory);
                        this._stateManager.setTestProposals(proposals);
                    }
                    break;

                case 'refreshRefactoringSuggestions':
                    const suggestions = await this._aiService.generateRefactoringSuggestions();
                    this._stateManager.setRefactoringSuggestions(suggestions);
                    break;
            }
        });
    }

    private async _updateView() {
        if (!this._view) {
            return;
        }

        const state = this._stateManager.state;

        this._view.webview.html = await this._getHtmlForWebview(state);
    }

    private async _getHtmlForWebview(state: TddState): Promise<string> {
        let phaseContent = '';
        
        switch (state.currentPhase) {
            case TddPhase.PICK:
                phaseContent = this._getPickPhaseHtml(state.userStories);
                break;
                
            case TddPhase.RED:
                phaseContent = this._getRedPhaseHtml(state.testProposals, state.selectedUserStory);
                break;
                
            case TddPhase.GREEN:
                phaseContent = this._getGreenPhaseHtml(state.modifiedSelectedTest);
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
                    color: var(--vscode-foreground);
                    cursor: pointer;
                    font-size: 1em;
                }
                
                .refresh-btn:hover {
                    color: var(--vscode-button-hoverBackground);
                }

                .tooltip {
                    position: relative;
                    display: inline-block;
                }
                
                .tooltip .tooltip-text {
                    visibility: hidden;
                    width: 100px;
                    background-color: var(--vscode-editorHoverWidget-background);
                    color: var(--vscode-editorHoverWidget-foreground);
                    text-align: center;
                    border-radius: 4px;
                    padding: 5px;
                    position: absolute;
                    z-index: 1;
                    bottom: 125%;
                    right: 0;
                    opacity: 0;
                    transition: opacity 0.3s;
                    font-size: 0.8em;
                    pointer-events: none;
                    border: 1px solid var(--vscode-editorHoverWidget-border);
                    white-space: nowrap;
                }
                
                .tooltip:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
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
                
                function completeCycle() {
                    vscode.postMessage({
                        command: 'completeCycle'
                    });
                }

                function commitAndStay() {
                    vscode.postMessage({
                        command: 'commitAndStay'
                    });
                }

                function commitAndGoToTest() {
                    vscode.postMessage({
                        command: 'commitAndGoToTest'
                    });
                }

                function refreshUserStories() {
                    vscode.postMessage({
                        command: 'refreshUserStories'
                    });
                }

                function refreshTestProposals() {
                    vscode.postMessage({
                        command: 'refreshTestProposals'
                    });
                }

                function refreshRefactoringSuggestions() {
                    vscode.postMessage({
                        command: 'refreshRefactoringSuggestions'
                    });
                }

                function cancelEditTest() {
                    vscode.postMessage({
                        command: 'cancelEditTest'
                    });
                }
                
                function confirmTestCode() {
                    const testCode = document.getElementById('testCode').value;
                    const targetFile = document.getElementById('targetFile').value;
                    
                    vscode.postMessage({
                        command: 'confirmTestCode',
                        testCode: testCode,
                        targetFile: targetFile
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
            <button class="refresh-btn tooltip" onclick="refreshUserStories()">
                ⟳
                <span class="tooltip-text">Ricarica Stories</span>
            </button>
        </div>
        
        <p>Seleziona una delle seguenti user stories per iniziare il ciclo TDD:</p>
        
        ${storiesHtml}
        `;
    }

    private _getRedPhaseHtml(testProposals: TestProposal[], selectedUserStory?: UserStory): string {
        if (!selectedUserStory) {
            return '<div>Nessuna user story selezionata. Torna alla fase PICK.</div>';
        }
        
        const state = this._stateManager.state;

        if (state.isEditingTest && state.selectedTest) {
            return this._getTestEditingHtml(state.selectedTest, state.selectedTest.code, state.selectedTest.targetFile || 'test.js');
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
            <button class="refresh-btn tooltip" onclick="refreshTestProposals()">
                ⟳
                <span class="tooltip-text">Ricarica Test</span>
            </button>
        </div>
        
        <h2>User Story selezionata: ${selectedUserStory.title}</h2>
        <p>${selectedUserStory.description}</p>
        
        <p>Seleziona uno dei seguenti test proposti:</p>
        
        ${proposalsHtml}
        `;
    }

    private _getTestEditingHtml(selectedTest: TestProposal, editingCode?: string, editingFile?: string): string {
        const testCode = editingCode || selectedTest.code;
        const targetFile = editingFile || selectedTest.targetFile || 'test.js';

        return `
        <div class="phase-header">
            <span class="phase-emoji">✏️</span>
            <h1>Fase RED - Modifica Test</h1>
        </div>

        <h2>Test selezionato: ${selectedTest.title}</h2>
        <p>${selectedTest.description}</p>

        <div class="edit-container">
            <div class="form-group">
                <label for="testCode">Codice del test:</label>
                <textarea
                id="testCode"
        class="code-editor"
        rows="15"
        placeholder="Modifica il codice del test..."
                >${this._escapeHtml(testCode)}</textarea>
            </div>

            <div class="form-group">
                <label for="targetFile">File di destinazione:</label>
                <input
                type="text"
        id="targetFile"
        value="${targetFile}"
        class="file-input"
        placeholder="Percorso del file di test"
                >
            </div>

            <div class="button-group">
                <button class="btn btn-primary" onclick="confirmTestCode()">
                    ✅ Conferma e Inserisci
                </button>
                <button class="btn btn-secondary" onclick="cancelEditTest()">
                    ❌ Annulla
                </button>
            </div>
        </div>

        <style>
            .edit-container {
            background-color: var(--vscode-input-background);
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
            border: 1px solid var(--vscode-input-border);
        }

            .code-editor {
            width: 100%;
            min-height: 300px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 10px;
            resize: vertical;
            box-sizing: border-box;
        }

            .file-input {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            box-sizing: border-box;
        }

            .form-group {
            margin-bottom: 15px;
        }

            .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }

            .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

            .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

            .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

            .file-target {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
        }

            .action-hint {
            font-size: 0.75em;
            color: var(--vscode-textLink-foreground);
            font-style: italic;
            margin-top: 5px;
            text-align: center;
        }

            .card:hover .action-hint {
            color: var(--vscode-textLink-activeForeground);
        }
        </style>
        `;
    }

    private _getGreenPhaseHtml(selectedTest?: TestProposal): string {
        if (!selectedTest) {
            return '<div>Nessun test selezionato. Torna alla fase RED.</div>';
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
            <button class="refresh-btn tooltip" onclick="refreshRefactoringSuggestions()">
                ⟳
                <span class="tooltip-text">Ricarica Refactoring</span>
            </button>
        </div>
        
        <p>Ecco alcuni suggerimenti per migliorare il tuo codice:</p>
        
        ${suggestionsHtml}
        
        <p>Applica i miglioramenti che ritieni appropriati, poi prosegui.</p>
        
        <button class="btn" onclick="completeCycle()">Completa Ciclo</button>

        <button class="btn" onclick="commitAndStay()">Salva Refactoring</button>

        <button class="btn" onclick="commitAndGoToTest()">Passa ai Test</button>
        `;
    }

    private async commitRefactoring() {
        try {
            const modifiedFiles = await this._codeAnalysisService.getModifiedFiles();
            const filesToCommit = modifiedFiles
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.substring(3)); 
            if (filesToCommit.length > 0) {
                const commitTitle = await vscode.window.showInputBox({
                    prompt: 'Inserisci il titolo del commit',
                    placeHolder: 'Titolo del commit'
                });

                if (commitTitle) {
                    await this._codeAnalysisService.commitChanges(this._stateManager.state, commitTitle);
                }
            }
        } catch (error) {
            console.error('Error committing changes:', error);
        }
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

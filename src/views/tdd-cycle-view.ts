import * as vscode from 'vscode';
import { TddPhase, TddState } from '../models/tdd-models';
import { TddStateManager } from '../services/tdd-state-manager';

export class TddCycleView implements vscode.WebviewViewProvider {
    public static readonly viewType = 'tdd-mentor-ai-cycle';
    
    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly _stateManager: TddStateManager;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        this._stateManager = TddStateManager.getInstance();
        
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

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this._updateView();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.command) {
                case 'setPhase':
                    if (data.phase) {
                        this._stateManager.setPhase(data.phase as TddPhase);
                    }
                    break;
                case 'resetCycle':
                    this._stateManager.reset();
                    break;
            }
        });
    }

    private _updateView() {
        if (!this._view) {
            return;
        }

        const state = this._stateManager.state;
        this._view.webview.html = this._getHtmlForWebview(state);
    }

    private _getHtmlForWebview(state: TddState): string {
        const pickActive = state.currentPhase === TddPhase.PICK ? 'active' : '';
        const redActive = state.currentPhase === TddPhase.RED ? 'active' : '';
        const greenActive = state.currentPhase === TddPhase.GREEN ? 'active' : '';
        const refactorActive = state.currentPhase === TddPhase.REFACTORING ? 'active' : '';
        
        const redDisabled = !state.selectedUserStory ? 'disabled' : '';
        const greenDisabled = !state.selectedTest ? 'disabled' : '';
        const refactorDisabled = !state.testResults?.success ? 'disabled' : '';

        return `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ciclo TDD</title>
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
                
                .cycle-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .phase-btn {
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    border-radius: 5px;
                    cursor: pointer;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    font-weight: bold;
                    border: none;
                    transition: background-color 0.2s;
                }
                
                .phase-btn.active {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border-left: 3px solid var(--vscode-activityBarBadge-background);
                }
                
                .phase-btn:hover:not(.disabled) {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .phase-btn.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .phase-icon {
                    margin-right: 10px;
                    font-size: 1.1em;
                }
                
                .phase-description {
                    font-size: 0.8em;
                    margin-top: 5px;
                    opacity: 0.8;
                }
                
                .reset-btn {
                    margin-top: 20px;
                    padding: 5px 10px;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                }
                
                .reset-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                
                .mode-indicator {
                    margin-top: 20px;
                    padding: 8px;
                    background-color: var(--vscode-input-background);
                    border-radius: 3px;
                    font-size: 0.8em;
                }
            </style>
        </head>
        <body>
            <h1>Ciclo di Test-Driven Development</h1>
            <div class="cycle-container">
                <button class="phase-btn ${pickActive}" onclick="setPhase('pick')">
                    <span class="phase-icon">📋</span>
                    <div>
                        <div>PICK</div>
                        <div class="phase-description">Scegli una user story</div>
                    </div>
                </button>
                
                <button class="phase-btn ${redActive} ${redDisabled}" ${redDisabled ? 'disabled' : ''} onclick="setPhase('red')">
                    <span class="phase-icon">🔴</span>
                    <div>
                        <div>RED</div>
                        <div class="phase-description">Scrivi un test che fallisce</div>
                    </div>
                </button>
                
                <button class="phase-btn ${greenActive} ${greenDisabled}" ${greenDisabled ? 'disabled' : ''} onclick="setPhase('green')">
                    <span class="phase-icon">🟢</span>
                    <div>
                        <div>GREEN</div>
                        <div class="phase-description">Fai passare il test</div>
                    </div>
                </button>
                
                <button class="phase-btn ${refactorActive} ${refactorDisabled}" ${refactorDisabled ? 'disabled' : ''} onclick="setPhase('refactoring')">
                    <span class="phase-icon">🔄</span>
                    <div>
                        <div>REFACTORING</div>
                        <div class="phase-description">Migliora il codice</div>
                    </div>
                </button>
            </div>
            
            <div class="mode-indicator">
                Modalità corrente: <strong>${state.currentMode.toUpperCase()}</strong>
            </div>
            
            <button class="reset-btn" onclick="resetCycle()">
                Ripristina Ciclo
            </button>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function setPhase(phase) {
                    vscode.postMessage({
                        command: 'setPhase',
                        phase: phase
                    });
                }
                
                function resetCycle() {
                    vscode.postMessage({
                        command: 'resetCycle'
                    });
                }
            </script>
        </body>
        </html>
        `;
    }
}

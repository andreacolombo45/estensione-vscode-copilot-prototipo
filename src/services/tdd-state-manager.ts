import * as vscode from 'vscode';
import { TddPhase, AiMode, TddState, UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';

/**
 * Classe che gestisce lo stato dell'estensione TDD Mentor AI
 */
export class TddStateManager {
    private static instance: TddStateManager;
    private _state: TddState;
    private _stateEventEmitter = new vscode.EventEmitter<TddState>();

    public readonly onStateChanged = this._stateEventEmitter.event;

    private constructor() {
        // Inizializza lo stato con i valori predefiniti
        this._state = {
            currentPhase: TddPhase.PICK,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: []
        };
    }

    public static getInstance(): TddStateManager {
        if (!TddStateManager.instance) {
            TddStateManager.instance = new TddStateManager();
        }
        return TddStateManager.instance;
    }

    public get state(): TddState {
        return { ...this._state };
    }

    /**
     * Imposta la fase corrente del ciclo TDD
     * @param phase La nuova fase del ciclo TDD
     */
    public setPhase(phase: TddPhase): void {
        // Imposta la modalità AI appropriata in base alla fase
        let mode: AiMode = AiMode.ASK;
        if (phase === TddPhase.RED) {
            mode = AiMode.MENTOR;
        }

        this._state = {
            ...this._state,
            currentPhase: phase,
            currentMode: mode
        };
        this._notifyStateChanged();
    }

    /**
     * Aggiorna l'elenco delle user story e notifica i listener
     * @param stories Le nuove user story
     */
    public setUserStories(stories: UserStory[]): void {
        this._state = {
            ...this._state,
            userStories: stories
        };
        this._notifyStateChanged();
    }

    /**
     * Seleziona una user story specifica
     * @param storyId L'ID della user story da selezionare
     */
    public selectUserStory(storyId: string): void {
        const selectedStory = this._state.userStories.find(story => story.id === storyId);
        if (selectedStory) {
            this._state = {
                ...this._state,
                selectedUserStory: selectedStory
            };
            this._notifyStateChanged();
        }
    }

    /**
     * Aggiorna l'elenco dei test proposti e notifica i listener
     * @param tests I nuovi test proposti
     */
    public setTestProposals(tests: TestProposal[]): void {
        this._state = {
            ...this._state,
            testProposals: tests
        };
        this._notifyStateChanged();
    }

    /**
     * Seleziona un test proposto specifico
     * @param testId L'ID del test da selezionare
     */
    public selectTestProposal(testId: string): void {
        const selectedTest = this._state.testProposals.find(test => test.id === testId);
        if (selectedTest) {
            this._state = {
                ...this._state,
                selectedTest: selectedTest
            };
            this._notifyStateChanged();
        }
    }

    /**
     * Aggiorna l'elenco dei suggerimenti di refactoring e notifica i listener
     * @param suggestions I nuovi suggerimenti di refactoring
     */
    public setRefactoringSuggestions(suggestions: RefactoringSuggestion[]): void {
        this._state = {
            ...this._state,
            refactoringSuggestions: suggestions
        };
        this._notifyStateChanged();
    }

    /**
     * Aggiorna i risultati dei test e notifica i listener
     * @param success Se i test sono stati completati con successo
     * @param message Il messaggio associato ai risultati del test
     */
    public setTestResults(success: boolean, message: string): void {
        this._state = {
            ...this._state,
            testResults: {
                success,
                message
            }
        };
        this._notifyStateChanged();
    }

    /**
     * Ripristina lo stato al ciclo iniziale
     */
    public reset(): void {
        this._state = {
            currentPhase: TddPhase.PICK,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: []
        };
        this._notifyStateChanged();
    }

    private _notifyStateChanged(): void {
        this._stateEventEmitter.fire(this.state);
    }
}

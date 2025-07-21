import * as vscode from 'vscode';
import { TddPhase, AiMode, TddState, UserStory, TestProposal, RefactoringSuggestion } from '../models/tdd-models';


export class TddStateManager {
    private static instance: TddStateManager;
    private _state: TddState;
    private _stateEventEmitter = new vscode.EventEmitter<TddState>();

    public readonly onStateChanged = this._stateEventEmitter.event;

    private constructor() {
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

    public setPhase(phase: TddPhase): void {
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

    public setUserStories(stories: UserStory[]): void {
        this._state = {
            ...this._state,
            userStories: stories
        };
        this._notifyStateChanged();
    }

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

    public setTestProposals(tests: TestProposal[]): void {
        this._state = {
            ...this._state,
            testProposals: tests
        };
        this._notifyStateChanged();
    }

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

    public setRefactoringSuggestions(suggestions: RefactoringSuggestion[]): void {
        this._state = {
            ...this._state,
            refactoringSuggestions: suggestions
        };
        this._notifyStateChanged();
    }

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

    public setTestEditingMode(isEditing: boolean): void {
        this._state = {
            ...this._state,
            isEditingTest: isEditing
        };
        this._notifyStateChanged();
    }

    public updateModifiedSelectedTest(testCode: string, targetFile?: string): void {
        if (!this._state.selectedTest) {
            return;
        }

        this._state = {
            ...this._state,
            modifiedSelectedTest: {
                ...this._state.selectedTest,
                code: testCode,
                targetFile: targetFile || this._state.selectedTest.targetFile
            }
        };
        this._notifyStateChanged();
    }

    public reset(): void {
        this._state = {
            currentPhase: TddPhase.PICK,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
            selectedUserStory: undefined,
            selectedTest: undefined,
            modifiedSelectedTest: undefined,
            testResults: undefined,
            isEditingTest: false
        };
        this._notifyStateChanged();
    }

    public resetForNewTests(): void {
    }

    private _notifyStateChanged(): void {
        this._stateEventEmitter.fire(this.state);
    }
}

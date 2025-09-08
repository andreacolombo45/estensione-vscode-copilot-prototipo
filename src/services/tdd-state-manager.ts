import * as vscode from 'vscode';
import { TddPhase, AiMode, TddState, UserStory, TestProposal, RefactoringSuggestion, RefactoringFeedback } from '../models/tdd-models';


export class TddStateManager {
    private static instance: TddStateManager;
    private _state: TddState;
    private _stateEventEmitter = new vscode.EventEmitter<TddState>();
    private _extensionContext?: vscode.ExtensionContext;

    private static readonly STATE_KEY = 'tddMentorAIState';
    private static readonly SESSION_VERSION = '1.0';

    public readonly onStateChanged = this._stateEventEmitter.event;

    private constructor(context?: vscode.ExtensionContext) {
        this._state = {
            currentPhase: TddPhase.PICK,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
            greenQuestionCount: 0,
            greenChatHistory: [],
            refactoringFeedback: undefined,
            selectedUserStory: undefined,
            selectedTest: undefined,
        };
        this._extensionContext = context;
    }

    public static getInstance(context?: vscode.ExtensionContext): TddStateManager {
        if (!TddStateManager.instance) {
            TddStateManager.instance = new TddStateManager(context);
        } else if (context && !TddStateManager.instance._extensionContext) {
            TddStateManager.instance._extensionContext = context;
        }
        return TddStateManager.instance;
    }

    public get state(): TddState {
        return { ...this._state };
    }

    private saveState(): void {
        if (this._extensionContext) {
            const stateToSave = {
                version: TddStateManager.SESSION_VERSION,
                data: this._state
            };
            this._extensionContext.globalState.update(TddStateManager.STATE_KEY, stateToSave);
        }
    }

    public loadPreviousSession(): boolean {
        if (!this._extensionContext) {
            return false;
        }
        const savedState = this._extensionContext.globalState.get<{ version: string, data: TddState }>(TddStateManager.STATE_KEY);
        if (savedState && savedState.version === TddStateManager.SESSION_VERSION) {
            this._state = savedState.data;
            this._notifyStateChanged();
            return true;
        }
        return false;
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
        this.saveState();
    }

    public setUserStories(stories: UserStory[]): void {
        this._state = {
            ...this._state,
            userStories: stories
        };
        this._notifyStateChanged();
        this.saveState();
    }

    public selectUserStory(storyId: string): void {
        const selectedStory = this._state.userStories.find(story => story.id === storyId);
        if (selectedStory) {
            this._state = {
                ...this._state,
                selectedUserStory: selectedStory
            };
            this._notifyStateChanged();
            this.saveState();
        }
    }

    public setTestProposals(tests: TestProposal[]): void {
        this._state = {
            ...this._state,
            testProposals: tests
        };
        this._notifyStateChanged();
        this.saveState();
    }

    public selectTestProposal(testId: string): void {
        const selectedTest = this._state.testProposals.find(test => test.id === testId);
        if (selectedTest) {
            this._state = {
                ...this._state,
                selectedTest: selectedTest
            };
            this._notifyStateChanged();
            this.saveState();
        }
    }

    public setRefactoringSuggestions(suggestions: RefactoringSuggestion[]): void {
        this._state = {
            ...this._state,
            refactoringSuggestions: suggestions
        };
        this._notifyStateChanged();
        this.saveState();
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
        this.saveState();
    }

    public setTestEditingMode(isEditing: boolean): void {
        this._state = {
            ...this._state,
            isEditingTest: isEditing
        };
        this._notifyStateChanged();
        this.saveState();
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
        this.saveState();
    }

    public setRefactoringFeedback(feedback: RefactoringFeedback | undefined): void {
        this._state.refactoringFeedback = feedback;
        this._notifyStateChanged();
        this.saveState();
    }

    public setNextPhase(phase: 'pick' | 'red' | 'refactoring' | undefined): void {
        this._state.nextPhase = phase;
        this._notifyStateChanged();
        this.saveState();
    }

    public increaseQuestionCount(): void {
        this._state.greenQuestionCount++;
        this._notifyStateChanged();
        this.saveState();
    }

    public reset(): void {
        this._state = {
            currentPhase: TddPhase.PICK,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
            refactoringFeedback: undefined,
            selectedUserStory: undefined,
            selectedTest: undefined,
            modifiedSelectedTest: undefined,
            testResults: undefined,
            isEditingTest: false,
            nextPhase: undefined,
            greenQuestionCount: 0,
            greenChatHistory: []
        };
        this._notifyStateChanged();
        this.saveState();
    }

    public resetForNewTests(): void {
        this._state = {
            currentPhase: TddPhase.RED,
            currentMode: AiMode.MENTOR,
            testProposals: [],
            selectedTest: undefined,
            modifiedSelectedTest: undefined,
            testResults: undefined,
            isEditingTest: false,
            userStories: this._state.userStories, 
            refactoringSuggestions: [],
            refactoringFeedback: undefined,
            selectedUserStory: this._state.selectedUserStory,
            nextPhase: undefined,
            greenQuestionCount: 0,
            greenChatHistory: []
        };
        this._notifyStateChanged();
        this.saveState();
    }

    private _notifyStateChanged(): void {
        this._stateEventEmitter.fire(this.state);
    }
}

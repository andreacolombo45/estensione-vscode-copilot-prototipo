import * as assert from 'assert';
import * as sinon from 'sinon';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase, AiMode } from '../models/tdd-models';

suite('TddStateManager Test Suite', () => {
    let stateManager: TddStateManager;

    setup(() => {
        (TddStateManager as any).instance = undefined;
        stateManager = TddStateManager.getInstance();
    });

    teardown(() => {
        stateManager.reset();
    });

    test('Should return singleton instance', () => {
        const instance1 = TddStateManager.getInstance();
        const instance2 = TddStateManager.getInstance();
        assert.strictEqual(instance1, instance2);
    });

    test('Should initialize with default state', () => {
        const state = stateManager.state;
        assert.strictEqual(state.currentPhase, TddPhase.PICK);
        assert.strictEqual(state.currentMode, AiMode.ASK);
        assert.strictEqual(state.userStories.length, 0);
        assert.strictEqual(state.testProposals.length, 0);
        assert.strictEqual(state.refactoringSuggestions.length, 0);
        assert.strictEqual(state.selectedUserStory, undefined);
        assert.strictEqual(state.selectedTest, undefined);
        assert.strictEqual(state.testResults, undefined);
    });

    test("Should set phase and update mode correctly", () => {
        stateManager.setPhase(TddPhase.RED);
        let state = stateManager.state;
        assert.strictEqual(state.currentPhase, TddPhase.RED);
        assert.strictEqual(state.currentMode, AiMode.MENTOR);

        stateManager.setPhase(TddPhase.GREEN);
        state = stateManager.state;
        assert.strictEqual(state.currentPhase, TddPhase.GREEN);
        assert.strictEqual(state.currentMode, AiMode.ASK);
    });

    test("Should manage user stories correctly", () => {
        const stories = [
            { id: '1', title: 'Story 1', description: 'Description 1' },
            { id: '2', title: 'Story 2', description: 'Description 2' }
        ];

        stateManager.setUserStories(stories);
        let state = stateManager.state;
        assert.deepStrictEqual(state.userStories, stories);

        stateManager.selectUserStory('1');
        state = stateManager.state;
        assert.strictEqual(state.selectedUserStory?.id, '1');
        assert.strictEqual(state.selectedUserStory?.title, 'Story 1');

        stateManager.selectUserStory('3');
        state = stateManager.state;
        assert.strictEqual(state.selectedUserStory?.id, '1');
        assert.strictEqual(state.selectedUserStory?.title, 'Story 1');
    });

    test("Should manage test proposals correctly", () => {
        const testProposals = [
            { id: '1', title: 'Test 1', description: 'Description 1', code: 'code1' },
            { id: '2', title: 'Test 2', description: 'Description 2', code: 'code2' }
        ];

        stateManager.setTestProposals(testProposals);
        let state = stateManager.state;
        assert.deepStrictEqual(state.testProposals, testProposals);

        stateManager.selectTestProposal('1');
        state = stateManager.state;
        assert.strictEqual(state.selectedTest?.id, '1');
        assert.strictEqual(state.selectedTest?.title, 'Test 1');

        stateManager.selectTestProposal('3');
        state = stateManager.state;
        assert.strictEqual(state.selectedTest?.id, '1');
        assert.strictEqual(state.selectedTest?.title, 'Test 1');
    });

    test("Should manage refactoring suggestions correctly", () => {
        const suggestions = [
            { id: '1', title: 'Refactor 1', description: 'Description 1' },
            { id: '2', title: 'Refactor 2', description: 'Description 2' }
        ];

        stateManager.setRefactoringSuggestions(suggestions);
        const state = stateManager.state;
        assert.deepStrictEqual(state.refactoringSuggestions, suggestions);
    });

    test("Should manage test results correctly", () => {
        stateManager.setTestResults(true, 'All tests passed');
        let state = stateManager.state;
        assert.strictEqual(state.testResults?.success, true);
        assert.strictEqual(state.testResults?.message, 'All tests passed');

        stateManager.setTestResults(false, 'Some tests failed');
        state = stateManager.state;
        assert.strictEqual(state.testResults?.success, false);
        assert.strictEqual(state.testResults?.message, 'Some tests failed');
    });

    test("Should reset state correctly", () => {
        stateManager.setPhase(TddPhase.RED);
        stateManager.setUserStories([{ id: '1', title: 'Story 1', description: 'Description 1' }]);
        stateManager.setTestProposals([{ id: '1', title: 'Test 1', description: 'Description 1', code: 'code1' }]);
        stateManager.setRefactoringSuggestions([{ id: '1', title: 'Refactor 1', description: 'Description 1' }]);
        stateManager.setTestResults(true, 'All tests passed');
        stateManager.setTestEditingMode(true);
        stateManager.selectUserStory('1');
        stateManager.selectTestProposal('1');
        stateManager.updateModifiedSelectedTest('new code', 'testFile.js');

        stateManager.reset();
        const state = stateManager.state;
        assert.strictEqual(state.currentPhase, TddPhase.PICK);
        assert.strictEqual(state.currentMode, AiMode.ASK);
        assert.strictEqual(state.userStories.length, 0);
        assert.strictEqual(state.testProposals.length, 0);
        assert.strictEqual(state.refactoringSuggestions.length, 0);
        assert.strictEqual(state.selectedUserStory, undefined);
        assert.strictEqual(state.selectedTest, undefined);
        assert.strictEqual(state.testResults, undefined);
        assert.strictEqual(state.isEditingTest, false);
        assert.strictEqual(state.modifiedSelectedTest, undefined);
    }); 

    test("Should notify listeners on state change", (done) => {
        stateManager.onStateChanged(() => {
            const state = stateManager.state;
            assert.strictEqual(state.currentPhase, TddPhase.RED);
            done();
        });

        stateManager.setPhase(TddPhase.RED);
    });

    test("Should handle test editing mode", () => {
        stateManager.setTestEditingMode(true);
        let state = stateManager.state;
        assert.strictEqual(state.isEditingTest, true);

        stateManager.setTestEditingMode(false);
        state = stateManager.state;
        assert.strictEqual(state.isEditingTest, false);
    }); 

    test("Should update modified selected test", () => {
        const testProposal = { id: '1', title: 'Test 1', description: 'Description 1', code: 'code1' };
        stateManager.setTestProposals([testProposal]);
        stateManager.selectTestProposal('1');
        stateManager.updateModifiedSelectedTest('new code', 'testFile.js');

        const state = stateManager.state;
        assert.strictEqual(state.modifiedSelectedTest?.code, 'new code');
        assert.strictEqual(state.modifiedSelectedTest?.targetFile, 'testFile.js');
    });

    test('Should reset state partially without affecting user stories', () => {
        const stories = [
            { id: '1', title: 'Story 1', description: 'Description 1' },
            { id: '2', title: 'Story 2', description: 'Description 2' }
        ];

        stateManager.setUserStories(stories);
        stateManager.selectUserStory('1');
        stateManager.setPhase(TddPhase.REFACTORING);
        stateManager.setTestProposals([{ id: '1', title: 'Test 1', description: 'Description 1', code: 'code1' }]);
        stateManager.setRefactoringSuggestions([{ id: '1', title: 'Refactor 1', description: 'Description 1' }]);
        stateManager.setTestResults(true, 'All tests passed');
        stateManager.setTestEditingMode(true);
        stateManager.updateModifiedSelectedTest('new code', 'testFile.js');
        stateManager.selectTestProposal('1');
        
        stateManager.resetForNewTests();
        
        const state = stateManager.state;
        assert.strictEqual(state.currentPhase, TddPhase.RED);
        assert.strictEqual(state.currentMode, AiMode.MENTOR);
        assert.deepStrictEqual(state.userStories, stories);
        assert.strictEqual(state.selectedUserStory?.id, '1');
        assert.strictEqual(state.testProposals.length, 0);
        assert.strictEqual(state.refactoringSuggestions.length, 0);
        assert.strictEqual(state.testResults, undefined);
        assert.strictEqual(state.isEditingTest, false);
        assert.strictEqual(state.modifiedSelectedTest, undefined);
        assert.strictEqual(state.selectedTest, undefined);
    });

    test('Should save state when extensionContext is available', () => {
        const mockGlobalState = {
            update: sinon.stub().resolves(),
            get: sinon.stub(),
            keys: sinon.stub().returns([])
        };
        
        const mockContext = {
            globalState: mockGlobalState,
            workspaceState: {},
            subscriptions: [],
            extensionUri: {} as any,
            extensionPath: '',
            asAbsolutePath: sinon.stub(),
            storageUri: undefined,
            storagePath: undefined,
            globalStorageUri: {} as any,
            globalStoragePath: '',
            logUri: {} as any,
            logPath: '',
            extensionMode: 1,
            extension: {} as any,
            secrets: {} as any,
            environmentVariableCollection: {} as any
        } as any;

        (TddStateManager as any).instance = undefined;
        const stateManagerWithContext = TddStateManager.getInstance(mockContext);

        const testStories = [{ id: '1', title: 'Test Story', description: 'Test Description' }];
        stateManagerWithContext.setUserStories(testStories);

        assert.ok(mockGlobalState.update.calledOnce);
        
        const [key, savedData] = mockGlobalState.update.getCall(0).args;
        assert.strictEqual(key, 'tddMentorAIState');
        assert.strictEqual(savedData.version, '1.0');
        assert.deepStrictEqual(savedData.data.userStories, testStories);
});
});
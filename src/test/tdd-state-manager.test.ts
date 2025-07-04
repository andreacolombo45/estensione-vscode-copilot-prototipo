import * as assert from 'assert';
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
});
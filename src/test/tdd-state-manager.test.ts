import * as assert from 'assert';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase, AiMode } from '../models/tdd-models';

suite('TddStateManager Test Suite', () => {
    let stateManager: TddStateManager;

    setup(() => {
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
});
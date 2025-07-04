import * as assert from 'assert';
import { TddStateManager } from '../services/tdd-state-manager';

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
});
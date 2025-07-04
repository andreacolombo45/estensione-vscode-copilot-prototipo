import * as assert from 'assert';
import { AiService } from '../services/ai-service';

suite('AiService Test Suite', () => {
    let aiService: AiService;

    setup(() => {
        (AiService as any).instance = undefined;
        aiService = AiService.getInstance();
    });

    test('Should return singleton instance', () => {
        const instance1 = AiService.getInstance();
        const instance2 = AiService.getInstance();
        assert.strictEqual(instance1, instance2);
    });
});
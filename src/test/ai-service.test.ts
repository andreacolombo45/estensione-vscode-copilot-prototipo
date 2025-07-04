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

    test('Should generate user stories', async () => {
        const userStories = await aiService.generateUserStories();
        assert.ok(Array.isArray(userStories));
        assert.ok(userStories.length > 0);

        userStories.forEach(story => {
            assert.ok(story.id);
            assert.ok(story.title);
            assert.ok(story.description);
            assert.strictEqual(typeof story.id, 'string');
            assert.strictEqual(typeof story.title, 'string');
            assert.strictEqual(typeof story.description, 'string');
        });
    });

    test('Should generate test proposals for user story', async () => {
        const userStory = {
            id: 'us1',
            title: 'Test User Story',
            description: 'This is a test user story'
        };

        const testProposals = await aiService.generateTestProposals(userStory);

        assert.ok(Array.isArray(testProposals));
        assert.ok(testProposals.length > 0);

        testProposals.forEach(proposal => {
            assert.ok(proposal.id);
            assert.ok(proposal.title);
            assert.ok(proposal.description);
            assert.ok(proposal.code);
            assert.strictEqual(typeof proposal.id, 'string');
            assert.strictEqual(typeof proposal.title, 'string');
            assert.strictEqual(typeof proposal.description, 'string');
            assert.strictEqual(typeof proposal.code, 'string');         });
    });
});
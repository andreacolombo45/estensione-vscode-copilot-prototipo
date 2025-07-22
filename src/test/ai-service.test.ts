import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { AiService } from '../services/ai-service';
import { CodeAnalysisService } from '../services/code-analysis-service';
import { AiClient } from '../services/ai-client';
import { GitService } from '../services/git-service';

suite('AiService Test Suite', () => {
    let aiService: AiService;
    let sendRequestStub: sinon.SinonStub;
    let getProjectStructureStub: sinon.SinonStub;
    let getCommitHistoryStub: sinon.SinonStub;
    let workspaceConfigStub: sinon.SinonStub;
    let codeAnalysisServiceStub: CodeAnalysisService;

    const mockUserStories = [
        {
            id: 'us1',
            title: 'Gestire l\'autenticazione degli utenti',
            description: 'Come utente, voglio poter registrarmi e accedere al sistema con le mie credenziali.'
        },
        {
            id: 'us2',
            title: 'Aggiungere elementi alla lista',
            description: 'Come utente, voglio poter aggiungere nuovi elementi alla mia lista.'
        },
        {
            id: 'us3',
            title: 'Filtrare gli elementi per stato',
            description: 'Come utente, voglio poter filtrare gli elementi della lista per stato.'
        }
    ];

    const mockTestProposals = [
        {
            id: 'test1',
            title: 'Test di registrazione utente',
            description: 'Verifica che un nuovo utente possa registrarsi con email e password valide',
            code: 'test code 1',
            targetFile: 'auth.test.js'
        },
        {
            id: 'test2',
            title: 'Test di login utente',
            description: 'Verifica che un utente possa accedere con credenziali corrette',
            code: 'test code 2',
            targetFile: 'auth.test.js'
        },
        {
            id: 'test3',
            title: 'Test di login fallito',
            description: 'Verifica che il login fallisca con credenziali errate',
            code: 'test code 3',
            targetFile: 'auth.test.js'
        }
    ];

    const mockTestProposals2 = [
        {
            id: 'test4',
            title: 'Test aggiunta elemento',
            description: 'Verifica che un elemento possa essere aggiunto alla lista',
            code: 'test code 4',
            targetFile: 'list.test.js'
        },
        {
            id: 'test5',
            title: 'Test rimozione elemento',
            description: 'Verifica che un elemento possa essere rimosso dalla lista',
            code: 'test code 5',
            targetFile: 'list.test.js'
        },
        {
            id: 'test6',
            title: 'Test elemento duplicato',
            description: 'Verifica che non si possano aggiungere elementi duplicati',
            code: 'test code 6',
            targetFile: 'list.test.js'
        }
    ];

    const mockRefactoringSuggestions = [
        {
            id: 'refactor1',
            title: 'Estrai metodo comune',
            description: 'Il codice contiene logica duplicata nelle funzioni processData e validateData.'
        },
        {
            id: 'refactor2',
            title: 'Utilizza pattern factory',
            description: 'La creazione degli oggetti utente è sparsa in diverse parti del codice.'
        },
        {
            id: 'refactor3',
            title: 'Migliora la gestione degli errori',
            description: 'Attualmente gli errori vengono gestiti in modo incoerente.'
        }
    ];

    setup(async () => {
        (AiService as any).instance = undefined;

        const gitServiceStub = {
            getRecentCommits: sinon.stub().resolves([]),
        } as any;

        sinon.stub(GitService, 'create').returns(gitServiceStub);

        workspaceConfigStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: sinon.stub().returns('test-api-key')
        } as any);

        sendRequestStub = sinon.stub(AiClient.prototype, 'sendRequest');
        
        sendRequestStub.withArgs(
            sinon.match.any,
            sinon.match.has('systemPrompt', sinon.match(/user stor/i))
        ).resolves({ items: mockUserStories });
        
        sendRequestStub.withArgs(
            sinon.match.any,
            sinon.match(obj => obj.context && obj.context.userStory && obj.context.userStory.id === 'us1')
        ).resolves({ items: mockTestProposals });
        
        sendRequestStub.withArgs(
            sinon.match.any,
            sinon.match(obj => obj.context && obj.context.userStory && obj.context.userStory.id === 'us2')
        ).resolves({ items: mockTestProposals2 });
        
        sendRequestStub.withArgs(
            sinon.match.any,
            sinon.match.has('systemPrompt', sinon.match(/refactoring/i))
        ).resolves({ items: mockRefactoringSuggestions });

        const getProjectStructureStub = sinon.stub().resolves({ files: [], folders: [] });
        const getCommitHistoryStub = sinon.stub().resolves({ commits: [] });
        const getImplementedCodeStub = sinon.stub().resolves({ code: '' });

        codeAnalysisServiceStub = {
            getProjectStructure: getProjectStructureStub,
            getCommitHistory: getCommitHistoryStub,
            getImplementedCode: getImplementedCodeStub
        } as any;

        sinon.stub(CodeAnalysisService, 'getInstance').returns(codeAnalysisServiceStub);

        const aiClientStub = {
            sendRequest: sendRequestStub,
        } as any as AiClient;

        aiService = await AiService.getInstance(codeAnalysisServiceStub, aiClientStub);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should return singleton instance', async () => {
        const instance1 = await AiService.getInstance(codeAnalysisServiceStub);
        const instance2 = await AiService.getInstance(codeAnalysisServiceStub);
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

        assert.deepStrictEqual(userStories, mockUserStories.slice(0, 3));
    });

    test('Should generate test proposals for user story', async () => {
        const userStory = mockUserStories[0];

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
            assert.strictEqual(typeof proposal.code, 'string');
        });

        assert.deepStrictEqual(testProposals, mockTestProposals);
    });

    test("Should generate different test proposals for different user stories", async () => {
        const userStory1 = {
            id: 'us1',
            title: 'User Story 1',
            description: 'Description for User Story 1'
        };

        const userStory2 = {
            id: 'us2',
            title: 'User Story 2',
            description: 'Description for User Story 2'
        };
        
        const proposals1 = await aiService.generateTestProposals(userStory1);
        const proposals2 = await aiService.generateTestProposals(userStory2);

        assert.notDeepStrictEqual(proposals1, proposals2);
        assert.deepStrictEqual(proposals1, mockTestProposals);
        assert.deepStrictEqual(proposals2, mockTestProposals2);
    });

    test("Should generate refactoring suggestions", async () => {
        const suggestions = await aiService.generateRefactoringSuggestions();

        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        
        suggestions.forEach(suggestion => {
            assert.ok(suggestion.id);
            assert.ok(suggestion.title);
            assert.ok(suggestion.description);
            assert.strictEqual(typeof suggestion.id, 'string');
            assert.strictEqual(typeof suggestion.title, 'string');
            assert.strictEqual(typeof suggestion.description, 'string');
        }); 

        assert.deepStrictEqual(suggestions, mockRefactoringSuggestions);
    });

    test("Should call correct methods when generating user stories", async () => {
        const generateTenItemsStub = sinon.stub(aiService as any, "generateTenItems").returns(Promise.resolve(mockUserStories));
        const selectThreeItemsStub = sinon.stub(aiService as any, "selectThreeItems").returns(Promise.resolve(mockUserStories));

        const userStories = await aiService.generateUserStories();

        assert.ok(generateTenItemsStub.calledOnce);
        assert.ok(selectThreeItemsStub.calledOnce);
        assert.deepStrictEqual(userStories, mockUserStories);
    });

    test("Should call correct methods when generating test proposals", async () => {
        const userStory = {
            id: 'us1',
            title: 'Test User Story',
            description: 'This is a test user story'
        };

        const generateTenItemsStub = sinon.stub(aiService as any, "generateTenItems").returns(Promise.resolve(mockTestProposals));
        const selectThreeItemsStub = sinon.stub(aiService as any, "selectThreeItems").returns(Promise.resolve(mockTestProposals));

        const testProposals = await aiService.generateTestProposals(userStory);

        assert.ok(generateTenItemsStub.calledOnce);
        assert.ok(selectThreeItemsStub.calledOnce);
        assert.deepStrictEqual(testProposals, mockTestProposals);
    });

    test("Should call correct methods when generating refactoring suggestions", async () => {
        const generateTenItemsStub = sinon.stub(aiService as any, "generateTenItems").returns(Promise.resolve(mockRefactoringSuggestions));
        const selectThreeItemsStub = sinon.stub(aiService as any, "selectThreeItems").returns(Promise.resolve(mockRefactoringSuggestions));

        const suggestions = await aiService.generateRefactoringSuggestions();

        assert.ok(generateTenItemsStub.calledOnce);
        assert.ok(selectThreeItemsStub.calledOnce);
        assert.deepStrictEqual(suggestions, mockRefactoringSuggestions);
    });
});
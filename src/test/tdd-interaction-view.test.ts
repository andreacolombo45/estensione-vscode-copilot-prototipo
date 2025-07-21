import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TddInteractionView } from '../views/tdd-interaction-view';
import { AiService } from '../services/ai-service';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase } from '../models/tdd-models';
import { CodeAnalysisService } from '../services/code-analysis-service';
import { GitService } from '../services/git-service';
import { get } from 'http';
import { stat } from 'fs';

suite('TddInteractionView Test Suite', () => {
    let tddInteractionView: TddInteractionView;
    let mockExtensionUri: vscode.Uri;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let stateManager: TddStateManager;
    let aiService: AiService;
    let codeAnalysisService: CodeAnalysisService;

    setup(async () => {
        (TddStateManager as any).instance = undefined;
        (AiService as any).instance = undefined;
        (CodeAnalysisService as any).instance = undefined;

        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: { fsPath: '/mock/workspace' },
                name: 'mock-workspace',
                index: 0
            } as unknown as vscode.WorkspaceFolder
        ]);
        const gitServiceStub = {} as any as GitService;
        sinon.stub(GitService, 'create').resolves(gitServiceStub);

        const codeAnalysisServiceStub = {
            getProjectStructure: sinon.stub().resolves({ files: [], folders: [] }),
            getCommitHistory: sinon.stub().resolves({ commits: [] }),
            insertTestCode: sinon.stub().resolves(true),
            commitChanges: sinon.stub().resolves(),
            getModifiedFiles: sinon.stub().resolves(' M src/file1.ts\n M src/file2.ts\n'),
        } as any as CodeAnalysisService;

        sinon.stub(CodeAnalysisService, 'getInstance').returns(codeAnalysisServiceStub);

        codeAnalysisService = codeAnalysisServiceStub;

        const aiClientStub = {
            sendPrompt: sinon.stub().resolves('Fake response')
        } as any;

        aiService = await AiService.getInstance(codeAnalysisService, aiClientStub);

        stateManager = TddStateManager.getInstance();

        mockWebview = {
            html: '',
            options: {},
            onDidReceiveMessage: sinon.stub().returns({ dispose: sinon.stub() }),
            postMessage: sinon.stub(),
            asWebviewUri: sinon.stub(),
            cspSource: 'mock-csp'
        } as any;

        mockWebviewView = {
            webview: mockWebview,
            visible: true,
            onDidDispose: sinon.stub().returns({ dispose: sinon.stub() }),
            onDidChangeVisibility: sinon.stub().returns({ dispose: sinon.stub() }),
            show: sinon.stub(),
            title: 'Test View',
            description: 'Test Description'
        } as any;

        mockExtensionUri = vscode.Uri.file('/mock/extension/path');

        tddInteractionView = await TddInteractionView.create(mockExtensionUri, aiService, codeAnalysisService);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should initialize with correct view type', () => {
        assert.strictEqual(TddInteractionView.viewType, 'tdd-mentor-ai-interaction');
    });

    test("Should handle selectUserStory message", async () => {
        const selectUserStorySpy = sinon.spy(stateManager, 'selectUserStory');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const setTestProposalsSpy = sinon.spy(stateManager, 'setTestProposals');

        const mockUserStory = { id: '1', title: 'Test User Story', description: 'Test Description' };
        const mockTestProposals = [
            { id: 'test1', title: 'Test 1', description: 'First test', code: 'test code 1', targetFile: 'test.js' }
        ];

        const generateTestProposalsStub = sinon.stub(aiService, 'generateTestProposals')
            .resolves(mockTestProposals);

        stateManager.setUserStories([mockUserStory]);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'selectUserStory', storyId: '1' });

        assert.ok(selectUserStorySpy.calledWith('1'));
        assert.ok(setPhaseSpy.calledWith(TddPhase.RED));
        assert.ok(setTestProposalsSpy.calledWith(mockTestProposals));
        assert.ok(generateTestProposalsStub.calledWith(mockUserStory));
    });

    test("Should handle verifyTests message", async () => {
        const verifyTestsStub = sinon.stub(aiService, 'verifyTests').resolves({
            success: true,
            message: 'All tests passed'
        });

        const setTestResultsSpy = sinon.spy(stateManager, 'setTestResults');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const setRefactoringSuggestionsSpy = sinon.spy(stateManager, 'setRefactoringSuggestions');
        const generateRefactoringSuggestionsStub = sinon.stub(aiService, 'generateRefactoringSuggestions')
            .resolves([{ id: 'refactor1', title: 'Refactor 1', description: 'Refactor description' }]);
        const commitChangesStub = codeAnalysisService.commitChanges as sinon.SinonStub;

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'verifyTests' });

        assert.ok(verifyTestsStub.calledOnce);
        assert.ok(setTestResultsSpy.calledWith(true, 'All tests passed' ));
        assert.ok(setPhaseSpy.calledWith(TddPhase.REFACTORING));
        assert.ok(generateRefactoringSuggestionsStub.calledOnce);
        assert.ok(setRefactoringSuggestionsSpy.calledWith([{ id: 'refactor1', title : 'Refactor 1', description: 'Refactor description' }]));
        assert.ok(commitChangesStub.calledOnce);
    });

    test("Should handle refreshUserStories message", async () => {
        const generateUserStoriesStub = sinon.stub(aiService, 'generateUserStories').resolves([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]);

        const setUserStoriesSpy = sinon.spy(stateManager, 'setUserStories');

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'refreshUserStories' });

        assert.ok(generateUserStoriesStub.called);
        assert.ok(setUserStoriesSpy.calledWith([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]));
    });

    test("Should handle completeCycle message", async () => {
        const generateUserStoriesStub = sinon.stub(aiService, 'generateUserStories').resolves([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]);

        const resetSpy = sinon.spy(stateManager, 'reset');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const setUserStoriesSpy = sinon.spy(stateManager, 'setUserStories');
        const getModifiedFilesStub = codeAnalysisService.getModifiedFiles as sinon.SinonStub;
        const showInputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('Test commit message');
        const commitChangesStub = codeAnalysisService.commitChanges as sinon.SinonStub;

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'completeCycle' });

        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(showInputBoxStub.calledOnce);
        assert.ok(commitChangesStub.calledOnce);
        assert.ok(generateUserStoriesStub.called);
        assert.ok(setPhaseSpy.calledWith(TddPhase.PICK));
        assert.ok(resetSpy.calledOnce);
        assert.ok(setUserStoriesSpy.calledWith([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]));
    });

    test("Should handle confirmTestCode message", async () => {
        const setTestEditingModeSpy = sinon.spy(stateManager, 'setTestEditingMode');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const updateModifiedSelectedTestSpy = sinon.spy(stateManager, 'updateModifiedSelectedTest');
        const insertTestCodeStub = codeAnalysisService.insertTestCode as sinon.SinonStub;
        insertTestCodeStub.resetHistory();

        const testCode = 'test code';
        const targetFile = 'test.js';

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'confirmTestCode', testCode, targetFile });

        assert.ok(setTestEditingModeSpy.calledWith(false));
        assert.ok(setPhaseSpy.calledWith(TddPhase.GREEN));
        assert.ok(insertTestCodeStub.calledWith(testCode, targetFile));
        assert.ok(updateModifiedSelectedTestSpy.calledWith(testCode, targetFile));
    });

    test("Should handle cancelEditTest message", async () => {
        const setTestEditingModeSpy = sinon.spy(stateManager, 'setTestEditingMode');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'cancelEditTest' });

        assert.ok(setTestEditingModeSpy.calledWith(false));
        assert.ok(setPhaseSpy.calledWith(TddPhase.RED));
    });

    test("Should handle refreshTestProposals message", async () => {
        const generateTestProposalsStub = sinon.stub(aiService, 'generateTestProposals').resolves([
            { id: 'test1', title: 'Test 1', description: 'First test', code: 'test code 1', targetFile: 'test.js' },
            { id: 'test2', title: 'Test 2', description: 'Second test', code: 'test code 2', targetFile: 'test.js' }
        ]);

        const setTestProposalsSpy = sinon.spy(stateManager, 'setTestProposals');

        stateManager.setUserStories([{ id: 'us1', title: 'User Story 1', description: 'Description 1' }]);
        stateManager.selectUserStory('us1');

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'refreshTestProposals' });

        assert.ok(generateTestProposalsStub.called);
        assert.ok(setTestProposalsSpy.calledWith([
            { id: 'test1', title: 'Test 1', description: 'First test', code: 'test code 1', targetFile: 'test.js' },
            { id: 'test2', title: 'Test 2', description: 'Second test', code: 'test code 2', targetFile: 'test.js' }
        ]));
    });

    test("Should handle refreshRefactoringSuggestions message", async () => {
        const generateRefactoringSuggestionsStub = sinon.stub(aiService, 'generateRefactoringSuggestions').resolves([
            { id: 'refactor1', title: 'Refactor 1', description: 'Refactor description' },
            { id: 'refactor2', title: 'Refactor 2', description: 'Another refactor' }
        ]);
        const setRefactoringSuggestionsSpy = sinon.spy(stateManager, 'setRefactoringSuggestions');

        stateManager.setPhase(TddPhase.REFACTORING);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'refreshRefactoringSuggestions' });

        assert.ok(generateRefactoringSuggestionsStub.called);
        assert.ok(setRefactoringSuggestionsSpy.calledWith([
            { id: 'refactor1', title: 'Refactor 1', description: 'Refactor description' },
            { id: 'refactor2', title: 'Refactor 2', description: 'Another refactor' }
        ]));
    });

    test('Should not generate new test proposals if selecting same user story', async () => {
        const mockUserStory = { id: '1', title: 'Test User Story', description: 'Test Description' };
        const mockTestProposals = [
            { id: 'test1', title: 'Test 1', description: 'First test', code: 'test code 1', targetFile: 'test.js' }
        ];

        const generateTestProposalsStub = sinon.stub(aiService, 'generateTestProposals')
            .resolves(mockTestProposals);

        stateManager.setUserStories([mockUserStory]);
        stateManager.selectUserStory('1'); 
        stateManager.setTestProposals(mockTestProposals);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'selectUserStory', storyId: '1' });

        assert.ok(generateTestProposalsStub.notCalled);
        assert.deepStrictEqual(stateManager.state.testProposals, mockTestProposals);
    });

    test('Should reset cycle even if no refactoring is done', async () => {
        const resetSpy = sinon.spy(stateManager, 'reset');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const setUserStoriesSpy = sinon.spy(stateManager, 'setUserStories');
        const getModifiedFilesStub = codeAnalysisService.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves('');
        const showInputBoxSpy = sinon.spy(vscode.window, 'showInputBox');
        const commitChangesStub = codeAnalysisService.commitChanges as sinon.SinonStub;
        const generateUserStoriesStub = sinon.stub(aiService, 'generateUserStories').resolves([]);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'completeCycle' });

        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(showInputBoxSpy.notCalled);
        assert.ok(commitChangesStub.notCalled);
        assert.ok(resetSpy.calledOnce);
        assert.ok(setPhaseSpy.calledWith(TddPhase.PICK));
        assert.ok(generateUserStoriesStub.calledOnce);
        assert.ok(setUserStoriesSpy.calledWith([]));
    });
});
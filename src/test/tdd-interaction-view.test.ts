import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TddInteractionView } from '../views/tdd-interaction-view';
import { AiService } from '../services/ai-service';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase } from '../models/tdd-models';
import { CodeAnalysisService } from '../services/code-analysis-service';

suite('TddInteractionView Test Suite', () => {
    let tddInteractionView: TddInteractionView;
    let mockExtensionUri: vscode.Uri;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let stateManager: TddStateManager;
    let aiService: AiService;
    let codeAnalysisService: CodeAnalysisService;

    setup(() => {
        (TddStateManager as any).instance = undefined;
        (AiService as any).instance = undefined;
        (CodeAnalysisService as any).instance = undefined;

        stateManager = TddStateManager.getInstance();
        aiService = AiService.getInstance();
        codeAnalysisService = CodeAnalysisService.getInstance();

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
        
        tddInteractionView = new TddInteractionView(mockExtensionUri);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should initialize with correct view type', () => {
        assert.strictEqual(TddInteractionView.viewType, 'tdd-mentor-ai-interaction');
    });

    test("Should generate user stories on first PICK phase", () => {
        const generateUserStoriesStub = sinon.stub(aiService, 'generateUserStories').resolves([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
        ]);

        stateManager.setPhase(TddPhase.PICK);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        assert.ok(generateUserStoriesStub.calledOnce);
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
        stateManager.selectUserStory('1');

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

    test("Should handle selectTestProposal message and update editing mode", async () => {
        const selectTestProposalSpy = sinon.spy(stateManager, 'selectTestProposal');
        const setTestEditingModeSpy = sinon.spy(stateManager, 'setTestEditingMode');

        const testProposal = { id: 'test1', title: 'Test 1', description: 'First test', code: 'test code 1', targetFile: 'test.js' };

        stateManager.setTestProposals([testProposal]);

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'selectTestProposal', testId: 'test1' });

        assert.ok(selectTestProposalSpy.calledWith('test1'));
        assert.ok(setTestEditingModeSpy.calledWith(true, testProposal.code, testProposal.targetFile));
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

    test("Should handle completePhase message", async () => {
        const generateUserStoriesStub = sinon.stub(aiService, 'generateUserStories').resolves([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]);

        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const setUserStoriesSpy = sinon.spy(stateManager, 'setUserStories');

        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddInteractionView.resolveWebviewView(mockWebviewView, context, token);

        const messageHandler = (mockWebview.onDidReceiveMessage as sinon.SinonStub).getCall(0).args[0];
        await messageHandler({ command: 'completePhase' });

        assert.ok(generateUserStoriesStub.called);
        assert.ok(setPhaseSpy.calledWith(TddPhase.PICK));
        assert.ok(setUserStoriesSpy.calledWith([
            { id: '1', title: 'Test User Story 1', description: 'Description 1' },
            { id: '2', title: 'Test User Story 2', description: 'Description 2' }
        ]));
    });

    test("Should handle confirmTestCode message", async () => {
        const setTestEditingModeSpy = sinon.spy(stateManager, 'setTestEditingMode');
        const setPhaseSpy = sinon.spy(stateManager, 'setPhase');
        const insertTestCodeStub = sinon.stub(codeAnalysisService, 'insertTestCode' as any).resolves(true);

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
    });
});
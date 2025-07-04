import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TddInteractionView } from '../views/tdd-interaction-view';
import { AiService } from '../services/ai-service';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase } from '../models/tdd-models';

suite('TddInteractionView Test Suite', () => {
    let tddInteractionView: TddInteractionView;
    let mockExtensionUri: vscode.Uri;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let stateManager: TddStateManager;
    let aiService: AiService;

    setup(() => {
        (TddStateManager as any).instance = undefined;
        (AiService as any).instance = undefined;

        stateManager = TddStateManager.getInstance();
        aiService = AiService.getInstance();

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
});
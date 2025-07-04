import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TddCycleView } from '../views/tdd-cycle-view';
import { TddStateManager } from '../services/tdd-state-manager';
import { TddPhase } from '../models/tdd-models';

suite('TddCycleView Test Suite', () => {
    let tddCycleView: TddCycleView;
    let mockExtensionUri: vscode.Uri;
    let mockWebview: vscode.Webview;
    let mockWebviewView: vscode.WebviewView;
    let stateManager: TddStateManager;

    setup(() => {
        (TddStateManager as any).instance = undefined;
        stateManager = TddStateManager.getInstance();

        mockExtensionUri = vscode.Uri.file('/mock/extension/path');

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

        tddCycleView = new TddCycleView(mockExtensionUri);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should initialize with correct view type', () => {
        assert.strictEqual(TddCycleView.viewType, 'tdd-mentor-ai-cycle');
    });

    test("Should configure webview options correctly", () => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        tddCycleView.resolveWebviewView(mockWebviewView, context, token);

        assert.ok(mockWebview.options);
        assert.strictEqual(mockWebview.options.enableScripts, true);
        assert.ok(mockWebview.options.localResourceRoots);
        assert.ok(mockWebview.html.length > 0);
    });

    test("Should generete correct HTML content for different phases", () => {
        const context = {} as vscode.WebviewViewResolveContext;
        const token = {} as vscode.CancellationToken;

        stateManager.setPhase(TddPhase.PICK);
        tddCycleView.resolveWebviewView(mockWebviewView, context, token);
        assert.ok(mockWebview.html.includes('PICK'));
        
        stateManager.setPhase(TddPhase.RED);
        assert.ok(mockWebview.html.includes('RED'));

        stateManager.setPhase(TddPhase.GREEN);
        assert.ok(mockWebview.html.includes('GREEN'));

        stateManager.setPhase(TddPhase.REFACTORING);
        assert.ok(mockWebview.html.includes('REFACTORING'));
    });
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CodeAnalysisService } from '../services/code-analysis-service';
import { GitService } from '../services/git-service';
import { get } from 'http';

suite('CodeAnalysisService Test Suite', () => {
    let codeAnalysisService: CodeAnalysisService;
    let workspaceFoldersStub: sinon.SinonStub;
    let showErrorMessageSpy: sinon.SinonSpy;
    let gitServiceStub: GitService;

    setup(() => {
        (CodeAnalysisService as any).instance = undefined;
        gitServiceStub = sinon.createStubInstance(GitService);
        codeAnalysisService = CodeAnalysisService.getInstance(gitServiceStub);

        showErrorMessageSpy = sinon.spy(vscode.window, 'showErrorMessage');
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should return singleton instance', () => {
        const instance1 = CodeAnalysisService.getInstance(gitServiceStub);
        const instance2 = CodeAnalysisService.getInstance(gitServiceStub);
        assert.strictEqual(instance1, instance2);
    });

    test('Should analyze workspace correctly', async () => {
        const mockWorkspaceFolder = {
            uri: { fsPath: '/mock/workspace' },
            name: 'mock-workspace',
            index: 0
        };

        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

        const getAllFilesStub = sinon.stub(codeAnalysisService as any, 'getAllFiles');
        
        const mockFiles = [
            '/mock/workspace/src/main.ts',
            '/mock/workspace/src/utils.js',
            '/mock/workspace/tests/main.test.ts',
            '/mock/workspace/tests/utils.spec.js',
            '/mock/workspace/package.json'
        ];

        getAllFilesStub.resolves(mockFiles);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'typescript'); 
        assert.strictEqual(result.hasTests, true);
        assert.ok(result.testFiles.length > 0);
        assert.ok(result.sourceFiles.length > 0);
        
        assert.ok(result.testFiles.some(file => file.includes('main.test.ts')));
        assert.ok(result.testFiles.some(file => file.includes('utils.spec.js')));
        
        assert.ok(result.sourceFiles.every(file => 
            !file.includes('.test.') && !file.includes('.spec.')
        ));
    });

    test('Should handle workspace without folders', async () => {
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'unknown');
        assert.strictEqual(result.hasTests, false);
        assert.strictEqual(result.testFiles.length, 0);
        assert.strictEqual(result.sourceFiles.length, 0);
        assert.ok(showErrorMessageSpy.called);
    });

    test('Should handle empty file list', async () => {
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace', index: 0 }]);

        const getAllFilesStub = sinon.stub(codeAnalysisService as any, 'getAllFiles');
        getAllFilesStub.resolves([]);

        const result = await codeAnalysisService.getProjectStructure();

        assert.strictEqual(result.language, 'javascript');
        assert.strictEqual(result.hasTests, false);
        assert.strictEqual(result.testFiles.length, 0);
        assert.strictEqual(result.sourceFiles.length, 0);
    });

    test('Should return recent commit history', async () => {
        const getRecentCommitsStub = gitServiceStub.getRecentCommits as sinon.SinonStub;
        getRecentCommitsStub.resolves([]);

        const commits = await codeAnalysisService.getCommitHistory(5);

        assert.ok(getRecentCommitsStub.calledOnceWith(5));
    });
});
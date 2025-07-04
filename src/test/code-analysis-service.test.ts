import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CodeAnalysisService } from '../services/code-analysis-service';

suite('CodeAnalysisService Test Suite', () => {
    let codeAnalysisService: CodeAnalysisService;
    let workspaceFoldersStub: sinon.SinonStub;

    setup(() => {
        (CodeAnalysisService as any).instance = undefined;
        codeAnalysisService = CodeAnalysisService.getInstance();
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should return singleton instance', () => {
        const instance1 = CodeAnalysisService.getInstance();
        const instance2 = CodeAnalysisService.getInstance();
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
        
        const result = await codeAnalysisService.analyzeWorkspace();
        
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
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CodeAnalysisService } from '../services/code-analysis-service';
import { GitService } from '../services/git-service';
import { AiMode, TddPhase, TddState } from '../models/tdd-models';
import * as fs from 'fs';
import * as path from 'path';

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

    test('Should ignore non-code files', async () => {
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace', index: 0 }]);

        const getAllFilesStub = sinon.stub(codeAnalysisService as any, 'getAllFiles');
        
        const mockFiles = [
            '/mock/workspace/image.png',
            '/mock/workspace/build/output.exe',
            '/mock/workspace/logs/app.log',
            '/mock/workspace/src/app.py'
        ];

        getAllFilesStub.resolves(mockFiles);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'python');
        assert.strictEqual(result.hasTests, false);
        assert.strictEqual(result.sourceFiles.length, 1);
        assert.ok(result.sourceFiles[0].endsWith('app.py'));
    });

    test('Should return recent commit history', async () => {
        const getRecentCommitsStub = gitServiceStub.getRecentCommits as sinon.SinonStub;
        getRecentCommitsStub.resolves([]);

        const commits = await codeAnalysisService.getCommitHistory(5);

        assert.ok(getRecentCommitsStub.calledOnceWith(5));
    });

    test('Should append code to existing test file', async () => {
        const testFilePath = '/mock/workspace/tests/example.test.js';
        const testCode = 'testCode';
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace', index: 0 }]);

        sinon.stub(codeAnalysisService as any, 'getAllFiles').resolves([testFilePath]);

        const readFileStub = sinon.stub(fs.promises, 'readFile').resolves('existing content');
        const writeFileStub = sinon.stub(fs.promises, 'writeFile').resolves();

        sinon.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
        sinon.stub(vscode.window, 'showTextDocument').resolves();

        const success = await codeAnalysisService.insertTestCode(testCode, 'example.test.js');

        assert.strictEqual(success, true);
        assert.ok(readFileStub.calledWith(testFilePath));
        assert.ok(writeFileStub.calledWith(
            testFilePath,
            sinon.match((value: string | string[]) => value.includes('existing content') && value.includes(testCode))
        ));
    });

    test('Should create new test file if it does not exist', async () => {
        const mockFsPath = '/mock/workspace';
        const testFilePath = path.join(mockFsPath, 'tests', 'new.test.js');
        const testCode = 'testCode';

        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: { fsPath: mockFsPath } }
        ]);

        sinon.stub(codeAnalysisService as any, 'getAllFiles').resolves([]);

        const mkdirStub = sinon.stub(fs.promises, 'mkdir').resolves();
        const writeFileStub = sinon.stub(fs.promises, 'writeFile').resolves();
        sinon.stub(fs.promises, 'readFile').resolves('');

        sinon.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
        sinon.stub(vscode.window, 'showTextDocument').resolves();

        const success = await codeAnalysisService.insertTestCode(testCode, 'new.test.js');

        assert.strictEqual(success, true);
        assert.ok(mkdirStub.called);
        assert.ok(writeFileStub.calledWith(
            testFilePath,
            sinon.match((value: string | string[]) => value.includes(testCode))
        ));
    });

    test('Should run tests and handle success', async () => {
        const stub = sinon.stub<any, any>(codeAnalysisService as any, 'execPromise')
            .resolves({ stdout: 'Test passed' });

        const result = await codeAnalysisService.runTests();

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.output, 'Test passed');
        assert.ok(stub.calledWith('npm test'));

        stub.restore();
    });

    test('Should run tests and handle failure', async () => {
        const stub = sinon.stub<any, any>(codeAnalysisService as any, 'execPromise')
            .rejects(new Error('Test failed'));

        const result = await codeAnalysisService.runTests();

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.output, 'Test failed');
        assert.ok(stub.calledWith('npm test'));

        stub.restore();
    });

    test('Should return added lines from last commit', async () => {
        const mockCommit = {
            hash: 'abc123',
            message: 'Added new feature',
            author: 'Andrea',
            date: new Date(),
        };

        const getRecentCommitsStub = gitServiceStub.getRecentCommits as sinon.SinonStub;
        getRecentCommitsStub.resolves([mockCommit]);
        const showCommitDetailsStub = gitServiceStub.showCommitDetails as sinon.SinonStub;
        showCommitDetailsStub.resolves(`
diff --git a/file.ts b/file.ts
+++ b/file.ts
+const a = 1;
+function test() { return a; }
-someRemovedLine()
`);

        const result = await codeAnalysisService.getImplementedCode();

        assert.strictEqual(result, 'const a = 1;\nfunction test() { return a; }');
        assert.ok(getRecentCommitsStub.calledOnceWith(1));
        assert.ok(showCommitDetailsStub.calledOnceWith(['abc123']));
    });

    test('Should handle no recent commits', async () => {
        const getRecentCommitsStub = gitServiceStub.getRecentCommits as sinon.SinonStub;
        getRecentCommitsStub.resolves([]);

        const result = await codeAnalysisService.getImplementedCode();

        assert.strictEqual(result, '');
        assert.ok(getRecentCommitsStub.calledOnceWith(1));
    });

    test('Should handle no modified files in commit', async () => {
        const mockState: TddState = {
            currentPhase: TddPhase.GREEN,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
        };
        const getModifiedFilesStub = gitServiceStub.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves('');

        const showInformationMessageSpy = sinon.spy(vscode.window, 'showInformationMessage');

        const result = await codeAnalysisService.commitChanges(mockState);

        assert.strictEqual(result, '');
        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(showInformationMessageSpy.calledWith('Nothing to commit. No modified files found.'));
    });

    test('Should commit changes with GREEN phase', async () => {
        const mockState: TddState = {
            currentPhase: TddPhase.GREEN,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
            selectedTest: { 
                id: 'test1',
                title: 'Implement feature X',
                description: 'This test implements feature X',
                code: 'test code here',
                targetFile: 'src/featureX.ts'
            }
        };

        const modifiedFiles = ' M src/file1.ts\n M src/file2.ts\n';
        const getModifiedFilesStub = gitServiceStub.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves(modifiedFiles);

        const commitFilesStub = gitServiceStub.commitFiles as sinon.SinonStub;
        commitFilesStub.resolves();

        const result = await codeAnalysisService.commitChanges(mockState);

        assert.strictEqual(result, 'GREEN: Implement feature X');
        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(commitFilesStub.calledOnceWith(['src/file1.ts', 'src/file2.ts'], 'GREEN: Implement feature X'));
    });

    test('Should commit changes with REFACTORING phase', async () => {
        const mockState: TddState = {
            currentPhase: TddPhase.REFACTORING,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
        };

        const modifiedFiles = ' M src/file1.ts\n M src/file2.ts\n';
        const getModifiedFilesStub = gitServiceStub.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves(modifiedFiles);

        const commitFilesStub = gitServiceStub.commitFiles as sinon.SinonStub;
        commitFilesStub.resolves();

        const result = await codeAnalysisService.commitChanges(mockState, 'Refactor code');

        assert.strictEqual(result, 'REFACTORING: Refactor code');
        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(commitFilesStub.calledOnceWith(['src/file1.ts', 'src/file2.ts'], 'REFACTORING: Refactor code'));
    });
});

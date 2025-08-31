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
            '/mock/workspace/src/main/java/com/example/Main.java',
            '/mock/workspace/src/main/java/com/example/Calculator.java',
            '/mock/workspace/src/test/java/com/example/MainTest.java',
            '/mock/workspace/src/test/java/com/example/CalculatorTest.java',
            '/mock/workspace/build.gradle'
        ];

        getAllFilesStub.resolves(mockFiles);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'java'); 
        assert.strictEqual(result.hasTests, true);
        assert.ok(result.testFiles.length > 0);
        assert.ok(result.sourceFiles.length > 0);
        
        assert.ok(result.testFiles.some(file => file.includes('MainTest.java')));
        assert.ok(result.testFiles.some(file => file.includes('CalculatorTest.java')));
        
        assert.ok(result.sourceFiles.every(file => 
            !file.includes('Test.java') && !file.includes('Tests.java')
        ));
    });

    test('Should handle workspace without folders', async () => {
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'java');
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

        assert.strictEqual(result.language, 'java');
        assert.strictEqual(result.hasTests, false);
        assert.strictEqual(result.testFiles.length, 0);
        assert.strictEqual(result.sourceFiles.length, 0);
    });

    test('Should ignore non-code files', async () => {
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace', index: 0 }]);

        const getAllFilesStub = sinon.stub(codeAnalysisService as any, 'getAllFiles');
        
        const mockFiles = [
            '/mock/workspace/image.png',
            '/mock/workspace/build/output.jar',
            '/mock/workspace/logs/app.log',
            '/mock/workspace/src/main/java/com/example/App.java'
        ];

        getAllFilesStub.resolves(mockFiles);
        
        const result = await codeAnalysisService.getProjectStructure();
        
        assert.strictEqual(result.language, 'java');
        assert.strictEqual(result.hasTests, false);
        assert.strictEqual(result.sourceFiles.length, 1);
        assert.ok(result.sourceFiles[0].endsWith('App.java'));
    });

    test('Should return recent commit history', async () => {
        const getRecentCommitsStub = gitServiceStub.getRecentCommits as sinon.SinonStub;
        getRecentCommitsStub.resolves([]);

        const commits = await codeAnalysisService.getCommitHistory(5);

        assert.ok(getRecentCommitsStub.calledOnceWith(5));
    });

    test('Should append code to existing test file', async () => {
        const testFilePath = '/mock/workspace/src/test/java/com/example/ExampleTest.java';
        const testCode = `@Test
    public void testExample() {
        assertTrue(true);
    }`;
        workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace', index: 0 }]);

        sinon.stub(codeAnalysisService as any, 'getAllFiles').resolves([testFilePath]);

        const existingJavaContent = `package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ExampleTest {
    // I test verranno aggiunti qui
}`;

        const readFileStub = sinon.stub(fs.promises, 'readFile').resolves(existingJavaContent);
        const writeFileStub = sinon.stub(fs.promises, 'writeFile').resolves();

        sinon.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
        sinon.stub(vscode.window, 'showTextDocument').resolves();

        const success = await codeAnalysisService.insertTestCode(testCode, 'ExampleTest.java');

        assert.strictEqual(success, true);
        assert.ok(readFileStub.calledWith(testFilePath));
        assert.ok(writeFileStub.calledWith(
            testFilePath,
            sinon.match((value: string) => 
                value.includes('package com.example') && 
                value.includes(testCode) &&
                value.includes('public class ExampleTest')
            )
        ));
    });

    test('Should create new test file if it does not exist', async () => {
        const mockFsPath = '/mock/workspace';
        const testFilePath = path.join(mockFsPath, 'src', 'test', 'java', 'NewTest.java');
        const testCode = `@Test
    public void testNew() {
        assertTrue(true);
    }`;

        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: { fsPath: mockFsPath } }
        ]);

        sinon.stub(codeAnalysisService as any, 'getAllFiles').resolves([]);

        const mkdirStub = sinon.stub(fs.promises, 'mkdir').resolves();
        const writeFileStub = sinon.stub(fs.promises, 'writeFile').resolves();

        const javaTemplate = `package test;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class NewTest {
    // I test verranno aggiunti qui
}`;
        sinon.stub(fs.promises, 'readFile').resolves(javaTemplate);

        sinon.stub(vscode.workspace, 'openTextDocument').resolves({} as any);
        sinon.stub(vscode.window, 'showTextDocument').resolves();

        const success = await codeAnalysisService.insertTestCode(testCode, 'NewTest.java');

        assert.strictEqual(success, true);
        assert.ok(mkdirStub.called);
        assert.ok(writeFileStub.calledTwice);
    });

    test('Should run tests and handle success', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: { fsPath: '/fake/project' } }
        ]);

        sinon.stub(codeAnalysisService as any, 'fsExistsSync').returns(true);

        const execStub = sinon.stub<any, any>(codeAnalysisService as any, 'execPromise');

        execStub.onFirstCall().resolves({ stdout: 'Gradle 7.6' });
        execStub.onSecondCall().resolves({ stdout: 'BUILD SUCCESSFUL\n5 tests completed' });

        const result = await codeAnalysisService.runTests();

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.output, 'BUILD SUCCESSFUL\n5 tests completed');
        assert.ok(execStub.calledWith('./gradlew test', { cwd: '/fake/project' }));

        sinon.restore();
    });

    test('Should run tests and handle failure', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: { fsPath: '/fake/project' } }
        ]);

        sinon.stub(codeAnalysisService as any, 'fsExistsSync').returns(true);

        const execStub = sinon.stub<any, any>(codeAnalysisService as any, 'execPromise');
        execStub.withArgs('gradle --version', { cwd: '/fake/project' }).resolves({ stdout: 'Gradle 7.6' });
        
        const testError = new Error('Command failed') as any;
        testError.stdout = 'BUILD FAILED\n2 tests failed';
        testError.stderr = '';
        execStub.withArgs('./gradlew test', sinon.match.any).rejects(testError);
        execStub.withArgs('gradle test', sinon.match.any).rejects(testError);

        const result = await codeAnalysisService.runTests();

        assert.strictEqual(result.success, false);
        assert.strictEqual(result.output, 'BUILD FAILED\n2 tests failed');

        sinon.restore();
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
diff --git a/Main.java b/Main.java
+++ b/Main.java
+public class Calculator {
+    public int add(int a, int b) { return a + b; }
+}
-// TODO: implement
`);

        const result = await codeAnalysisService.getImplementedCode();

        assert.strictEqual(result, 'public class Calculator {\n    public int add(int a, int b) { return a + b; }\n}\n// TODO: implement');
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

        await codeAnalysisService.commitChanges(mockState);
        
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
                code: '@Test\npublic void testAdd() { assertEquals(5, calculator.add(2, 3)); }',
                targetFile: 'CalculatorTest.java'
            }
        };

        const modifiedFiles = ' M src/main/java/Calculator.java\n M src/test/java/CalculatorTest.java\n';
        const getModifiedFilesStub = gitServiceStub.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves(modifiedFiles);

        const commitFilesStub = gitServiceStub.commitFiles as sinon.SinonStub;
        commitFilesStub.resolves();

        await codeAnalysisService.commitChanges(mockState);

        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(commitFilesStub.calledOnceWith(
            ['src/main/java/Calculator.java', 'src/test/java/CalculatorTest.java'], 
            'GREEN: Implement feature X'
        ));
    });

    test('Should commit changes with REFACTORING phase', async () => {
        const mockState: TddState = {
            currentPhase: TddPhase.REFACTORING,
            currentMode: AiMode.ASK,
            testProposals: [],
            userStories: [],
            refactoringSuggestions: [],
        };

        const modifiedFiles = ' M src/main/java/Calculator.java\n M src/test/java/CalculatorTest.java\n';
        const getModifiedFilesStub = gitServiceStub.getModifiedFiles as sinon.SinonStub;
        getModifiedFilesStub.resolves(modifiedFiles);

        const commitFilesStub = gitServiceStub.commitFiles as sinon.SinonStub;
        commitFilesStub.resolves();

        await codeAnalysisService.commitChanges(mockState, 'Refactor Calculator class');

        assert.ok(getModifiedFilesStub.calledOnce);
        assert.ok(commitFilesStub.calledOnceWith(['src/main/java/Calculator.java', 'src/test/java/CalculatorTest.java'], 'REFACTORING: Refactor Calculator class'));
    });
});

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { GitService } from '../services/git-service';

suite('GitService Test Suite', () => {
    let execStub: sinon.SinonStub;
    let workspaceFolderStub: sinon.SinonStub;

    setup(() => {
        const workspaceFolder = {
            uri: { fsPath: '/mock/workspace' },
            name: 'mock-workspace',
            index: 0
        };
        workspaceFolderStub = sinon.stub(vscode.workspace, 'workspaceFolders').value([workspaceFolder]);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should create GitService instance', async () => {
        execStub = sinon.stub().resolves({ stdout: 'true' });

        const gitService = await GitService.create(execStub);

        assert.ok(gitService instanceof GitService);
        assert.notStrictEqual(gitService, null);
    });

    test('Should show error message on Git command failure', async () => {
        execStub = sinon.stub().rejects(new Error('Git command failed'));

        const gitService = await GitService.create(execStub);

        assert.strictEqual(gitService, null);
    });

    test('Should show error message when no workspace is open', async () => {
        workspaceFolderStub.restore(); 
        const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');

        const gitService = await GitService.create(execStub);

        assert.strictEqual(gitService, null);
        sinon.assert.calledWith(showErrorMessageStub, 'No workspace folder is open.');
    });

    test('Should return parsed commits', async () => {
        const execStub = sinon.stub();
        execStub.onCall(0).resolves({ stdout: 'true' });
        execStub.onCall(1).resolves({ stdout: 'some-hash' });

        execStub.onCall(2).resolves({
            stdout: `abc123|Andrea|1625079600|Fix bug\nxyz789|Bob|1625079601|Add feature`
        });

        execStub.onCall(3).resolves({ stdout: 'src/file1.ts\nsrc/file2.ts\n' });
        execStub.onCall(4).resolves({ stdout: 'test/test1.spec.ts\n' });

        const gitService = await GitService.create(execStub);

        assert.ok(gitService instanceof GitService);
        const commits = await gitService.getRecentCommits(2);

        assert.strictEqual(commits.length, 2);

        assert.deepStrictEqual(commits[0], {
            hash: 'abc123',
            author: 'Andrea',
            date: new Date(1625079600 * 1000),
            message: 'Fix bug',
            filesChanged: ['src/file1.ts', 'src/file2.ts']
        });

        assert.deepStrictEqual(commits[1], {
            hash: 'xyz789',
            author: 'Bob',
            date: new Date(1625079601 * 1000),
            message: 'Add feature',
            filesChanged: ['test/test1.spec.ts']
        });
    });

    test('Should show commit details', async () => {
        const execStub = sinon.stub();
        const expectedOutput = `commit abc123\nAuthor: Andrea \nDate:   Fri Jul 30 12:00:00 2021 +0200\n\n    Fix bug\n\n+added line 1\n+added line 2`;

        execStub.onCall(0).resolves({ stdout: 'true' });

        execStub.onCall(1).resolves({
            stdout: expectedOutput
        });

        const gitService = await GitService.create(execStub);
        assert.ok(gitService instanceof GitService);

        const output = await gitService.showCommitDetails(['abc123']);
        assert.strictEqual(output, expectedOutput);
        assert.ok(execStub.calledWith('git show abc123', sinon.match.has('cwd', gitService['workspacePath'])));
    });
});
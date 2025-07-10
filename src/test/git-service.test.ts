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
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CodeAnalysisService } from '../services/code-analysis-service';

suite('CodeAnalysisService Test Suite', () => {
    let codeAnalysisService: CodeAnalysisService;

    setup(() => {
        (CodeAnalysisService as any).instance = undefined;
        codeAnalysisService = CodeAnalysisService.getInstance();
    });

    test('Should return singleton instance', () => {
        const instance1 = CodeAnalysisService.getInstance();
        const instance2 = CodeAnalysisService.getInstance();
        assert.strictEqual(instance1, instance2);
    });
});
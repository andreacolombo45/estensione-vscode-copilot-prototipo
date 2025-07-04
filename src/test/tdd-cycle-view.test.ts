import * as assert from 'assert';
import * as vscode from 'vscode';
import { TddCycleView } from '../views/tdd-cycle-view';

suite('TddCycleView Test Suite', () => {
    let tddCycleView: TddCycleView;
    let mockExtensionUri: vscode.Uri;

    setup(() => {
        mockExtensionUri = vscode.Uri.file('/mock/extension/path');
        tddCycleView = new TddCycleView(mockExtensionUri);
    });

    test('Should initialize with correct view type', () => {
        assert.strictEqual(TddCycleView.viewType, 'tdd-mentor-ai-cycle');
    });
});
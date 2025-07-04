import * as assert from 'assert';
import * as vscode from 'vscode';
import { TddInteractionView } from '../views/tdd-interaction-view';

suite('TddInteractionView Test Suite', () => {
    let tddInteractionView: TddInteractionView;
    let mockExtensionUri: vscode.Uri;

    setup(() => {
        mockExtensionUri = vscode.Uri.file('/mock/extension/path');
        
        tddInteractionView = new TddInteractionView(mockExtensionUri);
    });

    test('Should initialize with correct view type', () => {
        assert.strictEqual(TddInteractionView.viewType, 'tdd-mentor-ai-interaction');
    });
});
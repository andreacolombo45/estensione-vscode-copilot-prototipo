import * as sinon from 'sinon';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { AiClient } from "../services/ai-client";

suite('AiClient Test Suite', () => {
    let aiClient: AiClient;
    let fetchStub: sinon.SinonStub;

    setup(() => {
        aiClient = new AiClient("test-api-key");
        fetchStub = sinon.stub(global, "fetch");
    });

    teardown(() => {
        sinon.restore();
    });

    test("Should throw error if API key is not set", async () => {
        const client = new AiClient("");
        await assert.rejects(() => client.sendRequest("test prompt", {model: "test"}), {
            message: "API key is not set."
        });
    });

    test("Should send request and return response", async () => {
        const mockResponseData = {
            choices: [{
                message: {
                    content: "Test response"
                }
            }]
        };

        const mockResponse = new Response(JSON.stringify(mockResponseData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        fetchStub.resolves(mockResponse);

        const response = await aiClient.sendRequest("test prompt", { model: "gpt-3.5-turbo" });
        assert.ok(fetchStub.calledOnce);

        const fetchArgs = fetchStub.getCall(0);
        const url = fetchArgs.args[0];
        const options = fetchArgs.args[1];

        assert.strictEqual(url, "https://api.openai.com/v1/chat/completions");
        assert.strictEqual(options.method, "POST");
        assert.strictEqual(options.headers['Content-Type'], 'application/json');
        assert.strictEqual(options.headers['Authorization'], 'Bearer test-api-key');

        const body = JSON.parse(options.body);
        assert.strictEqual(body.model, "gpt-3.5-turbo");
        assert.strictEqual(body.temperature, 0.7);
        assert.strictEqual(body.max_tokens, 2000);
        assert.deepStrictEqual(body.messages, [{
            role: "user",
            content: "test prompt"
        }]);

        assert.deepStrictEqual(response, mockResponseData);
    });

    test("Should handle API errors", async () => {
        const mockErrorResponse = new Response("Not Found", { status: 404 });
        fetchStub.resolves(mockErrorResponse);

        await assert.rejects(() => aiClient.sendRequest("test prompt", { model: "gpt-3.5-turbo" }), {
            message: "AI request failed: 404 Not Found"
        });
    });

    test("Should show error message if API key is not set on startup", async () => {
        const configStub = {
            get: sinon.stub().returns("")
        };

        const workspaceStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(configStub as any);

        const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
        
        const client = new AiClient();

        assert.strictEqual(showErrorMessageStub.calledOnce, true);
        assert.strictEqual(showErrorMessageStub.calledWith('OpenAI API key is not set. Please configure it in settings.'), true);

        workspaceStub.restore();
        showErrorMessageStub.restore();
    });
});
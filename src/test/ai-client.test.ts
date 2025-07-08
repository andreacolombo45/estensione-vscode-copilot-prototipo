import * as sinon from 'sinon';
import * as assert from 'assert';
import { AiClient } from "../services/AiClient";

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
});
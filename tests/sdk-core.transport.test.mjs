import assert from "node:assert/strict";
import test from "node:test";

import {
  VoyantApiError,
  VoyantTransport,
} from "../packages/sdk-core/dist/index.js";

test("VoyantTransport serializes auth, query params, and JSON bodies", async () => {
  let requestUrl;
  let requestInit;

  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async (url, init) => {
      requestUrl = String(url);
      requestInit = init;

      return new Response(JSON.stringify({ data: { ok: true } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
    userAgent: "voyant-sdk-tests",
  });

  const result = await transport.request("/v1/example", {
    body: { hello: "world" },
    method: "POST",
    query: {
      limit: 10,
      markets: ["ro", "us"],
      skip: undefined,
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(
    requestUrl,
    "https://api.voyantjs.com/v1/example?limit=10&markets=ro&markets=us",
  );
  assert.equal(requestInit.method, "POST");
  assert.equal(requestInit.body, JSON.stringify({ hello: "world" }));

  const headers = new Headers(requestInit.headers);
  assert.equal(headers.get("authorization"), "Bearer test_key");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("x-voyant-sdk"), "voyant-sdk-tests");
});

test("VoyantTransport can return the raw response envelope", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(JSON.stringify({ data: { ok: true }, meta: { page: 1 } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
  });

  const result = await transport.request("/v1/example", {
    unwrapData: false,
  });

  assert.deepEqual(result, { data: { ok: true }, meta: { page: 1 } });
});

test("VoyantTransport default fetch preserves the global receiver", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let sawGlobalReceiver = false;

  try {
    globalThis.fetch = async function receiverSensitiveFetch(url) {
      sawGlobalReceiver = this === globalThis;
      requestUrl = String(url);

      if (!sawGlobalReceiver) {
        throw new TypeError("Illegal invocation");
      }

      return new Response(JSON.stringify({ data: { ok: true } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const transport = new VoyantTransport({
      apiKey: "test_key",
    });

    const result = await transport.request("/v1/example");

    assert.deepEqual(result, { ok: true });
    assert.equal(sawGlobalReceiver, true);
    assert.equal(requestUrl, "https://api.voyantjs.com/v1/example");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("VoyantTransport throws VoyantApiError for non-2xx responses", async () => {
  const transport = new VoyantTransport({
    apiKey: "test_key",
    fetch: async () =>
      new Response(JSON.stringify({ message: "Nope" }), {
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_123",
        },
        status: 400,
      }),
  });

  await assert.rejects(
    () => transport.request("/v1/example"),
    (error) => {
      assert.ok(error instanceof VoyantApiError);
      assert.equal(error.message, "Nope");
      assert.equal(error.status, 400);
      assert.equal(error.requestId, "req_123");
      assert.deepEqual(error.body, { message: "Nope" });
      return true;
    },
  );
});

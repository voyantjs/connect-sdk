import assert from "node:assert/strict";
import test from "node:test";

import { createVoyantConnectClient } from "../packages/connect-sdk/dist/index.js";

function createRecorder({ responseBody = { data: [] } } = {}) {
  const calls = [];

  return {
    calls,
    fetch: async (url, init) => {
      calls.push({
        body: init?.body,
        headers: new Headers(init?.headers),
        method: init?.method ?? "GET",
        url: String(url),
      });

      return new Response(JSON.stringify(responseBody), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  };
}

test("connect client unwraps `data` for control-plane reads", async () => {
  const recorder = createRecorder({
    responseBody: { data: [{ id: "op_1", slug: "alpine", name: "Alpine" }] },
  });
  const client = createVoyantConnectClient({
    apiKey: "connect_key",
    fetch: recorder.fetch,
  });

  const operators = await client.operators.list();
  assert.deepEqual(operators, [
    { id: "op_1", slug: "alpine", name: "Alpine" },
  ]);
  assert.equal(recorder.calls[0].url, "https://api.voyantjs.com/v1/operators");
  assert.equal(recorder.calls[0].method, "GET");
  assert.equal(
    recorder.calls[0].headers.get("authorization"),
    "Bearer connect_key",
  );
});

test("connect client composes nested operator and connection routes", async () => {
  const recorder = createRecorder({ responseBody: { data: { id: "conn_1" } } });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await client.connections.list("op_1");
  await client.connections.create("op_1", { supplierName: "Alpine" });
  await client.connections.rotateWebhookSecret("op_1", "conn_1");

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/v1/operators/op_1/connections",
  );
  assert.equal(recorder.calls[0].method, "GET");

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/v1/operators/op_1/connections",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    supplierName: "Alpine",
  });

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/v1/operators/op_1/connections/conn_1/webhook-secret/rotate",
  );
  assert.equal(recorder.calls[2].method, "POST");
});

test("connect client preserves `{ data, pagination }` envelope for audit logs", async () => {
  const recorder = createRecorder({
    responseBody: {
      data: [{ id: "log_1" }],
      pagination: { nextCursor: "cur_2" },
    },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  const result = await client.auditLogs.list({ limit: 5 });
  assert.deepEqual(result, {
    data: [{ id: "log_1" }],
    pagination: { nextCursor: "cur_2" },
  });
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/v1/audit-logs?limit=5",
  );
});

test("connect client returns raw shape for gateway data plane and forwards idempotency key", async () => {
  const recorder = createRecorder({
    responseBody: { id: "book_1", status: "reserved" },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await client.gateway.listProducts("conn_1");
  const booking = await client.gateway.createBooking(
    "conn_1",
    {
      productId: "prod_1",
      optionId: "opt_1",
      unitItems: [{ unitId: "u_1", quantity: 2 }],
    },
    { idempotencyKey: "key-123" },
  );

  assert.deepEqual(booking, { id: "book_1", status: "reserved" });
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/v1/connections/conn_1/products",
  );
  assert.equal(recorder.calls[0].method, "POST");

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/v1/connections/conn_1/bookings",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.equal(recorder.calls[1].headers.get("idempotency-key"), "key-123");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    productId: "prod_1",
    optionId: "opt_1",
    unitItems: [{ unitId: "u_1", quantity: 2 }],
  });
});

test("connect client composes Connect-normalized read routes", async () => {
  const recorder = createRecorder({ responseBody: [] });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await client.connect.listProducts("conn_1", { supplierId: "sup_1" });
  await client.connect.listOptionUnits("conn_1", "opt_1");
  await client.connect.listAvailability("conn_1", {
    productId: "prod_1",
    localDateStart: "2026-05-01",
    localDateEnd: "2026-05-31",
  });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/v1/connect/connections/conn_1/products?supplierId=sup_1",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/v1/connect/connections/conn_1/options/opt_1/units",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/v1/connect/connections/conn_1/availability?productId=prod_1&localDateStart=2026-05-01&localDateEnd=2026-05-31",
  );
});

test("connect client OAuth issueToken sends client_credentials body", async () => {
  const recorder = createRecorder({
    responseBody: {
      access_token: "tok_xyz",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "operators:read",
    },
  });
  const client = createVoyantConnectClient({
    apiKey: "unused",
    authScheme: null,
    fetch: recorder.fetch,
  });

  const token = await client.oauth.issueToken({
    clientId: "ci",
    clientSecret: "cs",
    scope: "operators:read",
  });

  assert.deepEqual(token, {
    access_token: "tok_xyz",
    token_type: "Bearer",
    expires_in: 3600,
    scope: "operators:read",
  });
  assert.equal(recorder.calls[0].url, "https://api.voyantjs.com/v1/oauth/token");
  assert.equal(recorder.calls[0].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    client_id: "ci",
    client_secret: "cs",
    grant_type: "client_credentials",
    scope: "operators:read",
  });
});

test("connect client flights.searchStream returns the raw response", async () => {
  const recorder = createRecorder({
    responseBody: { type: "ready", connectionIds: ["c_1"] },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  const response = await client.flights.searchStream({
    origin: "DUB",
    destination: "JFK",
    departureDate: "2026-06-01",
    passengers: [{ type: "adult", count: 1 }],
  });

  assert.equal(response instanceof Response, true);
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/v1/flights/search-stream",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.equal(recorder.calls[0].headers.get("accept"), "text/event-stream");
});

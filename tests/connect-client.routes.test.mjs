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
  assert.deepEqual(operators, [{ id: "op_1", slug: "alpine", name: "Alpine" }]);
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/operators",
  );
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
    "https://api.voyantjs.com/connect/v1/operators/op_1/connections",
  );
  assert.equal(recorder.calls[0].method, "GET");

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/operators/op_1/connections",
  );
  assert.equal(recorder.calls[1].method, "POST");
  assert.deepEqual(JSON.parse(recorder.calls[1].body), {
    supplierName: "Alpine",
  });

  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/connect/v1/operators/op_1/connections/conn_1/webhook-secret/rotate",
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
    "https://api.voyantjs.com/connect/v1/audit-logs?limit=5",
  );
});

test("connect client per-connection bookings.create forwards idempotency key", async () => {
  const recorder = createRecorder({
    responseBody: { id: "book_1", status: "reserved" },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  const booking = await client.bookings.create(
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
    "https://api.voyantjs.com/connect/v1/connections/conn_1/bookings",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.equal(recorder.calls[0].headers.get("idempotency-key"), "key-123");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    productId: "prod_1",
    optionId: "opt_1",
    unitItems: [{ unitId: "u_1", quantity: 2 }],
  });
});

test("connect client domain namespaces target Connect-normalized routes", async () => {
  const recorder = createRecorder({ responseBody: [] });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await client.products.listOnConnection("conn_1", { supplierId: "sup_1" });
  await client.options.listUnits("conn_1", "opt_1");
  await client.availability.list("conn_1", {
    productId: "prod_1",
    localDateStart: "2026-05-01",
    localDateEnd: "2026-05-31",
  });
  await client.health.get("conn_1");

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/products?supplierId=sup_1",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/options/opt_1/units",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/availability?productId=prod_1&localDateStart=2026-05-01&localDateEnd=2026-05-31",
  );
  assert.equal(
    recorder.calls[3].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/health",
  );
});

test("cruises namespace targets sailing pricing and promotions routes", async () => {
  const recorder = createRecorder({ responseBody: [] });
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await client.cruises.listSailingPricing("conn_1", "sail_1", {
    fareCode: "EARLY",
    occupancySignature: "2a",
    limit: 50,
  });
  await client.cruises.listSailingPromotions("conn_1", "sail_1", {
    fareCode: "EARLY",
    limit: 10,
  });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/sailings/sail_1/pricing?fareCode=EARLY&occupancySignature=2a&limit=50",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/sailings/sail_1/promotions?fareCode=EARLY&limit=10",
  );
});

test("products.list resolves operatorId from client default and serializes filters", async () => {
  const recorder = createRecorder({
    responseBody: { data: [{ id: "prod_1" }] },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    operatorId: "op_default",
    fetch: recorder.fetch,
  });

  await client.products.list();
  await client.products.list({
    connectionId: ["conn_a", "conn_b"],
    providerKey: "ventrata",
  });
  await client.products.list({ operatorId: "op_override" });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/products",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/products?connectionId=conn_a&connectionId=conn_b&providerKey=ventrata",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/connect/v1/operators/op_override/products",
  );
});

test("bookings.listAll fans out across connections via operator route", async () => {
  const recorder = createRecorder({
    responseBody: { data: [{ id: "book_1", connectionId: "conn_a" }] },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    operatorId: "op_default",
    fetch: recorder.fetch,
  });

  await client.bookings.listAll({
    providerKey: ["ventrata", "fareharbor"],
    localDateStart: "2026-05-01",
  });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/bookings?providerKey=ventrata&providerKey=fareharbor&localDateStart=2026-05-01",
  );
});

test("accommodations namespace targets the new accommodations routes", async () => {
  const recorder = createRecorder({ responseBody: { data: [] } });
  const client = createVoyantConnectClient({
    apiKey: "k",
    operatorId: "op_default",
    fetch: recorder.fetch,
  });

  await client.accommodations.list({ providerKey: "tui", minStars: 4 });
  await client.accommodations.get("acc_1");
  await client.accommodations.listOnConnection("conn_1");
  await client.accommodations.getOnConnection("conn_1", "acc_1");
  await client.accommodations.listRoomTypes("conn_1", "TUI_HOTEL_X");
  await client.accommodations.listRatePlans("conn_1", "TUI_HOTEL_X", {
    roomTypeId: "TUI_HOTEL_X:STANDARD",
  });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/accommodations?providerKey=tui&minStars=4",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/accommodations/acc_1",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/accommodations",
  );
  assert.equal(
    recorder.calls[3].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/accommodations/acc_1",
  );
  assert.equal(
    recorder.calls[4].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/accommodations/TUI_HOTEL_X/room-types",
  );
  assert.equal(
    recorder.calls[5].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/accommodations/TUI_HOTEL_X/rate-plans?roomTypeId=TUI_HOTEL_X%3ASTANDARD",
  );
});

test("stays namespace targets search/lock/confirm/cancel routes", async () => {
  const recorder = createRecorder({
    responseBody: { offers: [], connectionDiagnostics: [] },
  });
  const client = createVoyantConnectClient({
    apiKey: "k",
    operatorId: "op_default",
    fetch: recorder.fetch,
  });

  await client.stays.search("conn_1", {
    checkIn: "2026-06-01",
    checkOut: "2026-06-05",
    rooms: [{ adults: 2, childrenAges: [8] }],
    destination: { city: "Marrakech" },
  });
  await client.stays.searchAcrossProviders(
    {
      checkIn: "2026-06-01",
      checkOut: "2026-06-05",
      rooms: [{ adults: 2 }],
      accommodationIds: ["TUI_HOTEL_X"],
    },
    { providerKey: "tui" },
  );
  const offer = {
    id: "tui:offer_123",
    connectionId: "conn_1",
    accommodationId: "HX",
    rooms: [],
    totals: {
      subtotal: { amountMinor: 0, currency: "EUR", currencyPrecision: 2 },
      taxes: { amountMinor: 0, currency: "EUR", currencyPrecision: 2 },
      fees: { amountMinor: 0, currency: "EUR", currencyPrecision: 2 },
      total: { amountMinor: 0, currency: "EUR", currencyPrecision: 2 },
    },
    expiresAt: "2026-06-01T00:00:00.000Z",
  };
  await client.stays.lock("conn_1", offer, { ttlMinutes: 25 });
  await client.stays.confirm(
    "conn_1",
    {
      holdId: "h_1",
      leadGuest: { type: "adult", firstName: "Jane", lastName: "Doe" },
      contact: { email: "jane@example.com" },
      guestsByRoom: [
        [
          { type: "adult", firstName: "Jane", lastName: "Doe" },
          { type: "adult", firstName: "John", lastName: "Doe" },
        ],
      ],
    },
    { idempotencyKey: "confirm-001" },
  );
  await client.stays.cancel("conn_1", "b_1", { reason: "guest changed plans" });
  await client.stays.get("conn_1", "b_1");
  await client.stays.list("conn_1", { status: ["confirmed", "pending"] });
  await client.stays.listAll({ providerKey: "tui", checkInFrom: "2026-06-01" });
  await client.stays.releaseLock("conn_1", "h_1");

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/search",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/stays/search",
  );
  assert.equal(
    recorder.calls[2].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/lock",
  );
  assert.equal(
    recorder.calls[3].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/bookings",
  );
  assert.equal(recorder.calls[3].headers.get("idempotency-key"), "confirm-001");
  assert.equal(
    recorder.calls[4].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/bookings/b_1",
  );
  assert.equal(recorder.calls[4].method, "DELETE");
  assert.equal(
    recorder.calls[5].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/bookings/b_1",
  );
  assert.equal(
    recorder.calls[6].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/bookings?status=confirmed&status=pending",
  );
  assert.equal(
    recorder.calls[7].url,
    "https://api.voyantjs.com/connect/v1/operators/op_default/stays/bookings?providerKey=tui&checkInFrom=2026-06-01",
  );
  assert.equal(
    recorder.calls[8].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/holds/h_1",
  );
  assert.equal(recorder.calls[8].method, "DELETE");
});

test("products.list throws when neither client nor scope provides operatorId", async () => {
  const recorder = createRecorder();
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });

  await assert.rejects(() => client.products.list(), /operatorId is required/);
  assert.equal(recorder.calls.length, 0);
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
  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/oauth/token",
  );
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
    "https://api.voyantjs.com/connect/v1/flights/search-stream",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.equal(recorder.calls[0].headers.get("accept"), "text/event-stream");
});

import assert from "node:assert/strict";
import test from "node:test";

import { createVoyantConnectClient } from "../packages/connect-sdk/dist/index.js";
import {
  createVoyantConnectSourceAdapter,
  mapSearchDocumentToProjection,
  resolveVoyantConnectAdapterContext,
} from "../packages/connect-adapter/dist/index.js";

function createRecorder(responses) {
  const calls = [];
  const queue = [...responses];

  return {
    calls,
    fetch: async (url, init) => {
      calls.push({
        body: init?.body,
        headers: new Headers(init?.headers),
        method: init?.method ?? "GET",
        url: String(url),
      });

      const responseBody = queue.shift() ?? {};
      return new Response(JSON.stringify(responseBody), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  };
}

test("connect adapter maps Connect search documents to catalog projections with provenance", async () => {
  const updatedAt = "2026-05-29T16:00:00.000Z";
  const recorder = createRecorder([
    {
      data: [
        {
          id: "doc_1",
          operatorId: "op_1",
          connectionId: "conn_1",
          market: "ro",
          updatedAt,
          payload: {
            id: "prod_1",
            productId: "prod_1",
            optionId: "opt_1",
            category: "experience",
            title: "Danube tour",
            summary: "Half-day tour",
            searchableText: "Danube tour",
            destinations: ["Tulcea"],
            imageUrl: "https://example.com/tour.jpg",
            source: {
              connectionId: "conn_1",
              adapterKey: "tui",
              providerKey: "tui",
            },
            freshness: {
              refreshedAt: updatedAt,
            },
          },
        },
      ],
    },
  ]);
  const client = createVoyantConnectClient({
    apiKey: "k",
    operatorId: "op_1",
    fetch: recorder.fetch,
  });
  const adapter = createVoyantConnectSourceAdapter({ client });

  const page = await adapter.discover({ connection_id: "conn_1" });

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/operators/op_1/search-documents?connectionId=conn_1",
  );
  assert.equal(page.projections.length, 1);
  assert.deepEqual(page.projections[0].provenance, {
    source_kind: "voyant-connect",
    source_provider: "tui",
    source_connection_id: "conn_1",
    source_ref: "prod_1:opt_1",
    source_freshness: "sync",
    last_sourced_at: new Date(updatedAt),
  });
  assert.equal(page.projections[0].entity_module, "products");
  assert.equal(page.projections[0].fields.name, "Danube tour");
  assert.equal(page.projections[0].fields["source.kind"], "voyant-connect");
  assert.equal(page.projections[0].fields["source.ref"], "prod_1:opt_1");
  assert.equal(page.projections[0].fields["seller.operator_id"], "op_1");
  assert.equal(
    page.projections[0].fields.thumbnailUrl,
    "https://example.com/tour.jpg",
  );
  assert.equal(page.projections[0].fields.title, "Danube tour");
});

test("mapSearchDocumentToProjection preserves OSS-shaped projection payloads", () => {
  const projection = mapSearchDocumentToProjection(
    {
      id: "doc_1",
      operatorId: "op_1",
      connectionId: "conn_1",
      market: null,
      updatedAt: "2026-05-29T16:00:00.000Z",
      payload: {
        entity_module: "cruises",
        entity_id: "cruise_1",
        provenance: {
          source_kind: "voyant-connect",
          source_ref: "VIKING-1",
          source_freshness: "sync",
        },
        fields: {
          title: "Rhine sailing",
        },
      },
    },
    {
      sourceKind: "voyant-connect",
      sourceProvider: "viking",
      connectionId: "conn_1",
    },
  );

  assert.equal(projection.provenance.source_connection_id, "conn_1");
  assert.equal(projection.provenance.source_provider, "viking");
  assert.equal(projection.provenance.source_ref, "VIKING-1");
});

test("connect adapter liveResolve uses fresh stay search when requested", async () => {
  const recorder = createRecorder([
    {
      offers: [
        {
          id: "offer_1",
          connectionId: "conn_1",
          accommodationId: "acc_1",
          totals: {
            total: {
              amountMinor: 12300,
              currency: "EUR",
              currencyPrecision: 2,
            },
          },
          expiresAt: "2026-05-29T17:00:00.000Z",
        },
      ],
    },
  ]);
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });
  const adapter = createVoyantConnectSourceAdapter({
    client,
    operatorId: "op_1",
  });

  const result = await adapter.liveResolve(
    { connection_id: "conn_1" },
    {
      ids: ["acc_1"],
      scope: {
        locale: "en",
        audience: "public",
        market: "RO",
        currency: "EUR",
      },
      parameters: {
        connectRoute: "stays",
        checkIn: "2026-06-01",
        checkOut: "2026-06-03",
        rooms: [{ adults: 2 }],
      },
    },
  );

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/stays/search",
  );
  assert.equal(recorder.calls[0].method, "POST");
  assert.equal(result.values.acc_1.available, true);
  assert.deepEqual(result.values.acc_1.price, {
    amountMinor: 12300,
    currency: "EUR",
    currencyPrecision: 2,
  });
});

test("connect adapter generic liveResolve includes price hints from availability", async () => {
  const recorder = createRecorder([
    [
      {
        id: "slot_1",
        available: true,
        priceFrom: {
          amountMinor: 12500,
          currency: "EUR",
          currencyPrecision: 2,
        },
      },
      {
        id: "slot_2",
        available: true,
        priceFrom: { amountMinor: 9900, currency: "EUR", currencyPrecision: 2 },
      },
    ],
  ]);
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });
  const adapter = createVoyantConnectSourceAdapter({
    client,
    operatorId: "op_1",
  });

  const result = await adapter.liveResolve(
    { connection_id: "conn_1" },
    {
      ids: ["prod_1"],
      scope: {
        locale: "en",
        audience: "public",
        market: "RO",
        currency: "EUR",
      },
      parameters: {
        localDateStart: "2026-06-01",
        localDateEnd: "2026-06-03",
      },
    },
  );

  assert.equal(result.values.prod_1.available, true);
  assert.deepEqual(result.values.prod_1.price, {
    amountMinor: 9900,
    currency: "EUR",
    currencyPrecision: 2,
  });
  assert.equal(result.values.prod_1.lowestPriceCached, "99.00");
  assert.equal(result.values.prod_1.lowestPriceCachedCurrency, "EUR");
});

test("connect adapter reserve forwards generic bookings with the source connection id", async () => {
  const recorder = createRecorder([
    {
      id: "book_1",
      status: "reserved",
    },
  ]);
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });
  const adapter = createVoyantConnectSourceAdapter({
    client,
    operatorId: "op_1",
  });

  const result = await adapter.reserve(
    { connection_id: "conn_1" },
    {
      entity_module: "products",
      entity_id: "prod_1",
      parameters: {
        optionId: "opt_1",
        unitItems: [{ unitId: "unit_1", quantity: 2 }],
      },
      party: {
        contact: { email: "guest@example.com" },
      },
      idempotency_key: "idem_1",
    },
  );

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/bookings",
  );
  assert.equal(recorder.calls[0].headers.get("idempotency-key"), "idem_1");
  assert.deepEqual(JSON.parse(recorder.calls[0].body), {
    productId: "prod_1",
    optionId: "opt_1",
    unitItems: [{ unitId: "unit_1", quantity: 2 }],
    contact: { email: "guest@example.com" },
  });
  assert.deepEqual(result, {
    upstream_ref: "booking:book_1",
    status: "held",
    upstream_payload: { id: "book_1", status: "reserved" },
  });
});

test("connect adapter rejects engine context for booking dispatch", async () => {
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: async () => new Response("{}"),
  });
  const adapter = createVoyantConnectSourceAdapter({
    client,
    operatorId: "op_1",
  });

  await assert.rejects(
    () =>
      adapter.reserve(
        { connection_id: "engine" },
        {
          entity_module: "products",
          entity_id: "prod_1",
          parameters: { unitItems: [] },
        },
      ),
    /source_connection_id/,
  );
});

test("resolveVoyantConnectAdapterContext builds catalog route contexts from provenance", () => {
  assert.deepEqual(
    resolveVoyantConnectAdapterContext({
      sourceKind: "voyant-connect",
      sourceConnectionId: "conn_1",
      correlationId: "req_1",
    }),
    {
      connection_id: "conn_1",
      correlation_id: "req_1",
    },
  );

  assert.throws(
    () =>
      resolveVoyantConnectAdapterContext({
        sourceKind: "engine",
        fallbackConnectionId: "engine",
      }),
    /source_connection_id/,
  );
});

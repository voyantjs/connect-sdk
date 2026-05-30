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
      const status = responseBody.__status ?? 200;
      const body = responseBody.__body ?? responseBody;
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status,
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

test("connect adapter maps flat live API search document rows", () => {
  const updatedAt = "2026-05-29T17:39:33.021Z";
  const projection = mapSearchDocumentToProjection(
    {
      id: "sdoc_1",
      operatorId: "op_1",
      connectionId: "conn_1",
      market: "US",
      documentExternalId: "cruise:173_54-from-2027:en",
      category: "cruise",
      title: "A Portrait of Majestic France",
      summary: "This picture-perfect journey blends your passion.",
      searchableText: "A Portrait of Majestic France Uniworld river France",
      destinations: ["France"],
      countryCodes: null,
      tags: ["French river cruise"],
      imageUrl: "https://example.com/cruise.jpg",
      priceFrom: null,
      availabilityStatus: null,
      marketContext: null,
      source: {
        connectionId: "conn_1",
        adapterKey: "uniworld",
        providerKey: "uniworld",
      },
      freshness: {
        refreshedAt: updatedAt,
      },
      sourceUpdatedAt: updatedAt,
      updatedAt,
    },
    {
      sourceKind: "voyant-connect",
      operatorId: "op_1",
      connectionId: "conn_1",
    },
  );

  assert.equal(projection.entity_module, "cruises");
  assert.equal(projection.entity_id, "cruise:173_54-from-2027:en");
  assert.equal(projection.provenance.source_provider, "uniworld");
  assert.equal(projection.provenance.source_connection_id, "conn_1");
  assert.equal(projection.fields.title, "A Portrait of Majestic France");
  assert.equal(
    projection.fields.thumbnailUrl,
    "https://example.com/cruise.jpg",
  );
  assert.deepEqual(projection.fields.destinations, ["France"]);
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

test("connect adapter getContent returns normalized cruise content for flat search docs", async () => {
  const recorder = createRecorder([
    {
      __status: 404,
      __body: { error: { code: "NOT_FOUND", message: "Cruise not found" } },
    },
    [
      {
        id: "ccr_01kstcv2hefah8sg4p5myhq63v",
        externalId: "308_54-until-2026",
        connectionId: "conn_1",
        cruiseLineExternalId: "uniworld",
        shipExternalId: "ss_joy",
        name: "Wine Roads of France & Portugal",
        cruiseType: "river",
        nights: 12,
        embarkationPortCode: "BOD",
        disembarkationPortCode: "LIS",
        locale: "en",
        updatedAt: "2026-05-29T18:30:00.000Z",
        media: [{ url: "https://example.com/cruise.jpg" }],
        payload: {
          description:
            "A wine-focused river cruise through France and Portugal.",
          highlights: ["Bordeaux tastings", "Douro Valley"],
          inclusions: [{ label: "All meals onboard" }],
          embarkationPort: { name: "Bordeaux" },
          disembarkationPort: { name: "Lisbon" },
        },
      },
    ],
    [],
    [
      {
        id: "ccs_1",
        externalId: "ss_joy",
        name: "S.S. Joie de Vivre",
        capacityGuests: 128,
        deckCount: 4,
        yearBuilt: 2017,
        payload: { description: "Boutique river ship" },
      },
    ],
    [
      {
        id: "cab_1",
        externalId: "balcony",
        code: "BAL",
        name: "Balcony",
        roomType: "balcony",
        maxOccupancy: { adults: 2, total: 2 },
        payload: { description: "Balcony cabin" },
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

  const result = await adapter.getContent(
    { connection_id: "conn_1" },
    {
      entity_module: "cruises",
      entity_id: "cruise:308_54-until-2026:en",
      locale: "en",
      market: "US",
    },
  );

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/cruises/308_54-until-2026?locale=en",
  );
  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/cruises?locale=en&limit=500",
  );
  assert.equal(result.content_schema_version, "cruises/v1");
  assert.equal(result.source_ref, "308_54-until-2026");
  assert.equal(
    result.content.cruise.description,
    "A wine-focused river cruise through France and Portugal.",
  );
  assert.equal(
    result.content.cruise.hero_image_url,
    "https://example.com/cruise.jpg",
  );
  assert.equal(result.content.cruise.embarkation_port, "Bordeaux");
  assert.equal(result.content.ship.name, "S.S. Joie de Vivre");
  assert.deepEqual(result.content.sailings, []);
  assert.equal(result.content.cabin_categories[0].capacity_max, 2);
  assert.deepEqual(result.content.itinerary_stops, []);
  assert.equal(result.content.policies[0].kind, "supplier_notes");
});

test("connect adapter getContent prefers canonical cruise projection fields", async () => {
  const recorder = createRecorder([
    {
      id: "ccr_01kstcv2hefah8sg4p5myhq63v",
      externalId: "308_54-until-2026",
      sourceKind: "voyant-connect",
      sourceProvider: "uniworld",
      sourceConnectionId: "conn_1",
      sourceRef: "cruise:308_54-until-2026:en",
      sourceFreshness: "sync",
      lastSourcedAt: "2026-05-29T18:00:00.000Z",
      projectionSchemaVersion: "cruises/v1",
      projectionEtag: "proj_1",
      projectionSeenAt: "2026-05-29T18:05:00.000Z",
      market: "US",
      currency: "USD",
      connectionId: "conn_1",
      cruiseLineExternalId: "uniworld",
      shipExternalId: "ss_joy",
      name: "Legacy row name",
      cruiseType: "river",
      nights: 11,
      locale: "en",
      payload: {
        description: "Legacy payload description",
        embarkationPort: { name: "Legacy embark" },
      },
      projection: {
        source_ref: "cruise:308_54-until-2026:en",
        name: "Wine Roads of France & Portugal",
        status: "active",
        description: "Projection description",
        cruiseType: "river",
        heroImageUrl: "https://example.com/projected-cruise.jpg",
        highlights: ["Bordeaux tastings"],
        cruiseLine: "Uniworld",
        nights: 12,
        embarkationPort: "Bordeaux",
        disembarkationPort: "Lisbon",
      },
    },
    [
      {
        id: "sail_1",
        externalId: "sail_1",
        departureDate: "2026-06-01",
        returnDate: "2026-06-13",
        nights: 12,
        salesStatus: "available",
        priceFromAmountMinor: 240000,
        priceFromCurrency: "EUR",
        payload: {
          itinerary: [{ dayNumber: 1, portName: "Bordeaux" }],
        },
      },
    ],
    [
      {
        externalId: "ss_joy",
        name: "S.S. Joie de Vivre",
      },
    ],
    [
      {
        externalId: "balcony",
        code: "BAL",
        name: "Balcony",
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

  const result = await adapter.getContent(
    { connection_id: "conn_1" },
    {
      entity_module: "cruises",
      entity_id: "cruise:308_54-until-2026:en",
      locale: "en",
      market: "US",
    },
  );

  assert.equal(
    recorder.calls[1].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/sailings?cruiseExternalId=308_54-until-2026&limit=200",
  );
  assert.equal(result.source_ref, "cruise:308_54-until-2026:en");
  assert.deepEqual(
    result.source_updated_at,
    new Date("2026-05-29T18:00:00.000Z"),
  );
  assert.equal(result.content.cruise.name, "Wine Roads of France & Portugal");
  assert.equal(result.content.cruise.description, "Projection description");
  assert.equal(
    result.content.cruise.hero_image_url,
    "https://example.com/projected-cruise.jpg",
  );
  assert.deepEqual(result.content.cruise.highlights, ["Bordeaux tastings"]);
  assert.equal(result.content.cruise.cruise_line, "Uniworld");
  assert.equal(result.content.cruise.duration_nights, 12);
  assert.equal(result.content.cruise.embarkation_port, "Bordeaux");
  assert.equal(result.content.cruise.disembarkation_port, "Lisbon");
  assert.equal(result.content.sailings.length, 1);
  assert.equal(result.content.sailings[0].lowestPriceCached, "2400.00");
  assert.equal(result.content.sailings[0].lowestPriceCachedCurrency, "EUR");
  assert.equal(result.content.cabin_categories[0].name, "Balcony");
});

test("connect adapter keeps cruise itinerary variants scoped to sailings", async () => {
  const recorder = createRecorder([
    {
      id: "ccr_204",
      externalId: "204_81-from-2027",
      connectionId: "conn_1",
      cruiseLineExternalId: "uniworld",
      shipExternalId: "ship_1",
      name: "Castles along the Rhine",
      cruiseType: "river",
      nights: 7,
      locale: "en",
      payload: {
        description: "Rhine cruise with alternating directions.",
      },
    },
    [
      {
        id: "sail_1",
        externalId: "204_24940_74684_81",
        departureDate: "2027-11-25",
        returnDate: "2027-12-02",
        nights: 7,
        salesStatus: "available",
        embarkationPortCode: "BSL",
        disembarkationPortCode: "CGN",
        priceFrom: {
          amountMinor: 240000,
          currency: "EUR",
          currencyPrecision: 2,
        },
        payload: {
          itinerary: [
            { dayNumber: 1, portName: "Basel (Embark)" },
            { dayNumber: 2, portName: "Strasbourg" },
          ],
        },
      },
      {
        id: "sail_2",
        externalId: "204_24947_74802_81",
        departureDate: "2027-12-16",
        returnDate: "2027-12-23",
        nights: 7,
        salesStatus: "available",
        embarkationPortCode: "CGN",
        disembarkationPortCode: "BSL",
        payload: {
          itinerary: [
            { dayNumber: 1, portName: "Cologne (Embark)" },
            { dayNumber: 2, portName: "Rudesheim" },
          ],
        },
      },
    ],
    [
      {
        externalId: "ship_1",
        name: "S.S. Victoria",
      },
    ],
    [],
  ]);
  const client = createVoyantConnectClient({
    apiKey: "k",
    fetch: recorder.fetch,
  });
  const adapter = createVoyantConnectSourceAdapter({
    client,
    operatorId: "op_1",
  });

  const result = await adapter.getContent(
    { connection_id: "conn_1" },
    {
      entity_module: "cruises",
      entity_id: "cruise:204_81-from-2027:en",
      locale: "en",
    },
  );

  assert.equal(result.content.sailings.length, 2);
  assert.deepEqual(
    result.content.itinerary_stops.map((stop) => stop.port_name),
    ["Basel (Embark)", "Strasbourg"],
  );
  assert.deepEqual(
    result.content.sailings[0].itinerary_stops.map((stop) => stop.port_name),
    ["Basel (Embark)", "Strasbourg"],
  );
  assert.deepEqual(
    result.content.sailings[1].itinerary_stops.map((stop) => stop.port_name),
    ["Cologne (Embark)", "Rudesheim"],
  );
  assert.equal(result.content.sailings[0].lowestPriceCached, "2400.00");
  assert.equal(result.content.sailings[0].lowestPriceCachedCurrency, "EUR");
  assert.equal(result.content.sailings[1].lowestPriceCached, null);
  assert.equal(result.content.sailings[1].lowestPriceCachedCurrency, null);
});

test("connect adapter fetches endpoint itinerary variants for every sailing", async () => {
  const recorder = createRecorder([
    {
      id: "ccr_204",
      externalId: "204_81-from-2027",
      connectionId: "conn_1",
      cruiseLineExternalId: "uniworld",
      shipExternalId: "ship_1",
      name: "Castles along the Rhine",
      cruiseType: "river",
      nights: 7,
      locale: "en",
      payload: {},
    },
    [
      {
        id: "sail_1",
        externalId: "204_24940_74684_81",
        departureDate: "2027-11-25",
        returnDate: "2027-12-02",
        nights: 7,
        salesStatus: "available",
      },
      {
        id: "sail_2",
        externalId: "204_24947_74802_81",
        departureDate: "2027-12-16",
        returnDate: "2027-12-23",
        nights: 7,
        salesStatus: "available",
      },
    ],
    [
      {
        externalId: "ship_1",
        name: "S.S. Victoria",
      },
    ],
    [],
    [
      { dayNumber: 1, portName: "Basel (Embark)" },
      { dayNumber: 2, portName: "Strasbourg" },
    ],
    [
      { dayNumber: 1, portName: "Cologne (Embark)" },
      { dayNumber: 2, portName: "Rudesheim" },
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

  const result = await adapter.getContent(
    { connection_id: "conn_1" },
    {
      entity_module: "cruises",
      entity_id: "cruise:204_81-from-2027:en",
      locale: "en",
    },
  );

  assert.equal(
    recorder.calls[4].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/sailings/204_24940_74684_81/itinerary",
  );
  assert.equal(
    recorder.calls[5].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/sailings/204_24947_74802_81/itinerary",
  );
  assert.deepEqual(
    result.content.sailings[0].itinerary_stops.map((stop) => stop.port_name),
    ["Basel (Embark)", "Strasbourg"],
  );
  assert.deepEqual(
    result.content.sailings[1].itinerary_stops.map((stop) => stop.port_name),
    ["Cologne (Embark)", "Rudesheim"],
  );
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

test("connect adapter listReservations filters by updated time, status, and limit", async () => {
  const recorder = createRecorder([
    [
      {
        id: "book_old",
        status: "confirmed",
        updatedAt: "2026-05-29T10:00:00.000Z",
      },
      {
        id: "book_pending",
        status: "pending",
        updatedAt: "2026-05-29T12:30:00.000Z",
      },
      {
        id: "book_new",
        status: "confirmed",
        updatedAt: "2026-05-29T13:00:00.000Z",
      },
      {
        id: "book_newer",
        status: "confirmed",
        updatedAt: "2026-05-29T14:00:00.000Z",
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

  const result = await adapter.listReservations(
    { connection_id: "conn_1" },
    {
      updated_after: new Date("2026-05-29T12:00:00.000Z"),
      status: ["confirmed"],
      limit: 1,
    },
  );

  assert.equal(
    recorder.calls[0].url,
    "https://api.voyantjs.com/connect/v1/connections/conn_1/bookings",
  );
  assert.deepEqual(
    result.reservations.map((reservation) => reservation.upstream_ref),
    ["booking:book_new"],
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

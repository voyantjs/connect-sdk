# Connect Adapter

`@voyantjs/connect-adapter` is the Voyant app integration layer for consuming
Connect inventory through the OSS catalog plane.

Use it when a Voyant operator template should register Connect as a catalog
`SourceAdapter`. The raw `@voyantjs/connect-sdk` remains the right package for
non-Voyant consumers and low-level tools that call `/connect/v1/...` directly.

## Install

```sh
pnpm add @voyantjs/connect-adapter @voyantjs/connect-sdk @voyantjs/catalog
```

## Usage

```ts
import { createSourceAdapterRegistry } from "@voyantjs/catalog/booking-engine";
import {
  createVoyantConnectSourceAdapter,
  resolveVoyantConnectAdapterContext,
} from "@voyantjs/connect-adapter";

const registry = createSourceAdapterRegistry();
const adapter = createVoyantConnectSourceAdapter({
  connect: {
    apiKey: process.env.VOYANT_API_KEY!,
    operatorId: "op_123",
    baseUrl: "https://api.voyantjs.com",
  },
});

registry.register("conn_123", adapter);
```

## Booking Route Context

Connect booking dispatch must receive the connection that produced the quote.
When wiring catalog booking routes, configure `resolveAdapterContext` from the
quote or sourced-row provenance instead of using the route default `"engine"`
context:

```ts
import { resolveVoyantConnectAdapterContext } from "@voyantjs/connect-adapter";

const resolveAdapterContext = (input: {
  sourceKind?: string | null;
  sourceConnectionId?: string | null;
  correlationId?: string;
}) =>
  resolveVoyantConnectAdapterContext({
    sourceKind: input.sourceKind,
    sourceConnectionId: input.sourceConnectionId,
    correlationId: input.correlationId,
  });
```

The helper throws when `sourceConnectionId` is missing. That is intentional:
quote, reserve, cancel, and reservation status must route to the same Connect
connection that emitted the projection.

## Routing

- Voyant app consuming Connect inventory: use `@voyantjs/connect-adapter`.
- Non-Voyant app consuming Connect APIs: use `@voyantjs/connect-sdk`.
- Voyant app publishing owned inventory through Connect: use the publisher or
  channel package once available.

## Behavior

Discovery reads Connect search documents and emits catalog projections with
stable provenance plus field-policy-aligned keys such as `name`, `source.kind`,
`source.ref`, `seller.operator_id`, `thumbnailUrl`, `cruiseType`, `nights`, and
`price_from` where Connect provides the underlying minor-unit money data.
`source_connection_id` is always populated from the Connect connection so
quote, reserve, cancel, and status calls route back to the same registered
connection that produced the projection.

Rich content reads go through `SourceAdapter.getContent`. For cruises, the
default adapter resolves Connect search-document ids such as
`cruise:308_54-until-2026:en` back to the Connect cruise source ref, fetches the
available related Connect cruise rows, and returns the Voyant cruises content
shape with `content_schema_version: "cruises/v1"`:

- `cruise`
- `ship`
- `sailings`
- `cabin_categories`
- `itinerary_stops`
- `policies`

Each sailing emits flattened sourced-content browse price fields:
`lowest_price_cents` and `currency`. Both are populated from the same Connect
minor-unit money object when a browse price is available; otherwise both are
`null`.

When Connect has no sailings or prices for a cruise, those arrays remain empty
while the durable cruise description, media, ship, and policy content still
flows through the catalog content plane.

Live resolution uses Connect's fresher routes instead of relying only on stale
search documents and returns price hints when Connect provides them:

- default products: `client.availability.list`
- stays: set `parameters.connectRoute = "stays"` to call `client.stays.search`
- cruises: set `parameters.connectRoute = "cruises"` to call
  `client.cruises.search`

Booking dispatch supports generic Connect bookings by default and can route to
stays or cruises with the same `parameters.connectRoute` convention. Apps with
vertical-specific payloads can provide `liveResolve`, `reserve`, `cancel`, or
`getContent` overrides while keeping the same `SourceAdapter` registration.

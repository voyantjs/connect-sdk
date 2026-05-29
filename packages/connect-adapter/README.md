# `@voyantjs/connect-adapter`

Voyant Connect catalog SourceAdapter for Voyant apps.

Use this package in a Voyant operator template that wants Connect-sourced
inventory to flow through the OSS catalog plane: sourced entries, indexing,
quote/book/cancel dispatch, and booking snapshots.

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

// In catalog booking routes, resolve adapter context from quote provenance:
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

## Notes

- Use `@voyantjs/connect-adapter` for Voyant apps consuming Connect inventory
  through the OSS catalog.
- Use `@voyantjs/connect-sdk` directly for non-Voyant apps and low-level tools
  calling `/connect/v1/...`.
- `source_connection_id` is always populated from the Connect connection that
  produced the projection so quote, book, cancel, and status dispatch resolve
  the same registered connection.
- `getContent()` returns normalized cruise content as `cruises/v1`. It resolves
  flat Connect search-document ids back to the Connect cruise source ref and
  returns `{ cruise, ship, sailings, cabin_categories, itinerary_stops,
policies }` instead of a raw Connect row.
- Catalog route wiring must pass the quote or sourced row
  `source_connection_id` into `SourceAdapterContext.connection_id`. The adapter
  rejects `"engine"` contexts for booking dispatch because Connect cannot route
  quote/book/cancel without the original connection id.

For repo-level context, see [../../docs/connect-adapter.md](../../docs/connect-adapter.md).

# Connect SDK

`@voyantjs/connect-sdk` is the raw typed HTTP client for `/connect/v1/...`.
Use it for non-Voyant apps and low-level tools. Voyant operator templates that
want Connect inventory inside the OSS catalog plane should use
`@voyantjs/connect-adapter` instead.

`@voyantjs/connect-sdk` is the public TypeScript client for the Voyant Connect
product — the operator/connection control plane plus the Connect-normalized
data plane for inventory, bookings, and flights.

## Current shape

**Control plane**

- `oauth` — exchange client credentials for a short-lived bearer token
- `operators` — CRUD plus per-operator usage and search projections
- `connectorProviders` — list providers, manage applications, and per-operator
  provider registrations (including TUI settings and revalidation)
- `connections` — CRUD plus webhook secret rotation, projection sync runs,
  webhook events, health events, and request logs
- `links` — partner relationships and per-link capability toggles
- `oauthClients` — provision and revoke M2M client credentials per operator
- `grants` — issue, update, revoke, and inspect access grants
- `auditLogs` — paginated organization-wide audit trail
- `inviteTokens` — create and revoke invite tokens, look up, and redeem them
- `webhookSubscriptions` — create, list, update, delete, deliver tests, and
  replay deliveries
- `customConnectionRequests` — capture inbound requests for new supplier
  integrations

**Data plane (Connect-normalized)**

- `products` — cross-connection `list` / `get` plus per-connection
  `listOnConnection`, `getOnConnection`, `listOptions`, `listExtras`
- `options` — per-connection `listUnits`, `listExtraConfigs`
- `suppliers` — cross-connection `list` plus per-connection `listOnConnection`
- `availability` — per-connection `list` and `calendar`
- `bookings` — cross-connection `listAll` plus per-connection `list`, `get`,
  `create`, `confirm`, `cancel`, `listActivities`
- `cruises` / `cruiseBookings` — cruise catalog, search, lock, inquiry, and
  booking lifecycle routes, including sailing pricing and promotions
- `health` — per-connection sync status

Per-connection cruise reads return `ConnectCruiseRow` records, including
canonical projection/provenance fields such as `sourceRef`, `projection`,
`projectionSchemaVersion`, `lastSourcedAt`, `market`, and `currency` when the
Connect API includes them.

**Flights**

- `flights` — multi-connection and per-connection search, price, book, manage
  orders, seats, ancillaries, exchanges, refunds, check-in, SSRs

## Cross-connection methods

`products.list`, `suppliers.list`, and `bookings.listAll` aggregate across
every connection in an operator's catalog. They use the client-level
`operatorId` as default and accept a per-call `{ operatorId }` override.
Both `connectionId` and `providerKey` accept a scalar or an array.

```ts
import { createVoyantConnectClient } from "@voyantjs/connect-sdk";

const client = createVoyantConnectClient({
  apiKey: process.env.VOYANT_API_KEY!,
  operatorId: "op_123",
});

await client.products.list(); // all connections
await client.products.list({ providerKey: "ventrata" }); // filter by provider
await client.products.list({
  // multiple values
  connectionId: ["conn_a", "conn_b"],
});
```

## Auth

- a static API key in `Authorization: Bearer <key>` is the default
- for M2M flows use `client.oauth.issueToken({...})` to exchange the OAuth
  client credentials for a short-lived bearer token; the response shape is the
  raw OAuth response (`access_token`, `expires_in`, `scope`)
- both flows authenticate with the same scope-checked routes; the access
  token's `scope` claim must include the scope the route declares

## Idempotency

`bookings.create` accepts `{ idempotencyKey }`, which is sent as
`Idempotency-Key` and replayed against the server-side dedupe table.

## Streaming

`flights.searchStream` returns the raw `Response` so callers can stream
Server-Sent Events without the SDK opining on a parser. Each `connection-result`
event corresponds to one provider settling; the `final` event carries the
merged and paginated response.

## Example

```ts
import { createVoyantConnectClient } from "@voyantjs/connect-sdk";

const client = createVoyantConnectClient({
  apiKey: process.env.VOYANT_API_KEY!,
});

const operator = await client.operators.create({
  slug: "alpine-tours",
  name: "Alpine Tours",
  contactEmail: "ops@alpine.example",
});

const connection = await client.connections.create(operator.id, {
  supplierName: "Alpine Adventures",
  providerKey: "tui",
});

const products = await client.products.listOnConnection(connection.id);
void products;
```

# `@voyantjs/connect-sdk`

Public TypeScript client for Voyant Connect APIs — the operator/connection
control plane plus the Connect-normalized data plane for products,
availability, bookings, suppliers, options, cruises, stays, accommodations,
and flights.

## Scope

- operators, connections, links, grants, oauth-clients, oauth tokens
- connector providers and per-operator provider registrations
- webhook subscriptions, deliveries, test events, and replays
- audit logs, usage, invite tokens, custom connection requests
- Connect-normalized data plane: `products`, `options`, `suppliers`,
  `availability`, `bookings`, `cruises`, `stays`, `accommodations`, `health`
- cross-connection list methods (`products.list`, `suppliers.list`,
  `bookings.listAll`) with `connectionId` / `providerKey` filters
- flights: search, price, book, manage orders, seats, ancillaries, exchanges,
  refunds, check-in, SSRs

## Install

```sh
pnpm add @voyantjs/connect-sdk
```

## Usage

```ts
import { createVoyantConnectClient } from "@voyantjs/connect-sdk";

const client = createVoyantConnectClient({
  apiKey: process.env.VOYANT_API_KEY!,
  operatorId: "op_123", // default operator for org-scoped reads
});

// Cross-connection — list every product in the operator's catalog,
// optionally filtered by provider or connection.
const everything = await client.products.list();
const byProvider = await client.products.list({ providerKey: "ventrata" });

// Per-connection — Connect-normalized reads.
const productsOnConn = await client.products.listOnConnection("conn_456");
const options = await client.products.listOptions("conn_456", "prod_789");

// Bookings (per connection) — `idempotencyKey` becomes `Idempotency-Key`.
const booking = await client.bookings.create(
  "conn_456",
  {
    productId: "prod_789",
    optionId: "opt_1",
    unitItems: [{ unitId: "unit_a", quantity: 2 }],
  },
  { idempotencyKey: "order-2026-04-25-001" },
);
```

For M2M flows, exchange OAuth client credentials for a short-lived bearer
token first:

```ts
import { createVoyantConnectClient } from "@voyantjs/connect-sdk";

const tokenClient = createVoyantConnectClient({
  apiKey: "unused",
  authScheme: null,
});
const { access_token } = await tokenClient.oauth.issueToken({
  clientId: process.env.VOYANT_CONNECT_CLIENT_ID!,
  clientSecret: process.env.VOYANT_CONNECT_CLIENT_SECRET!,
  scope: "operators:read connections:read bookings:read",
});

const client = createVoyantConnectClient({ apiKey: access_token });
const me = await client.grants.listReceived();
void me;
```

## Shape

Root groups on `VoyantConnectClient`:

**Control plane**

- `oauth`
- `operators`
- `connectorProviders`
- `connections`
- `links`
- `oauthClients`
- `grants`
- `auditLogs`
- `inviteTokens`
- `webhookSubscriptions`
- `customConnectionRequests`

**Data plane (Connect-normalized)**

- `products` — cross-connection `list` / `get` plus per-connection
  `listOnConnection`, `getOnConnection`, `listOptions`, `listExtras`
- `options` — `listUnits`, `listExtraConfigs`
- `suppliers` — cross-connection `list` plus `listOnConnection`
- `availability` — `list`, `calendar`
- `bookings` — cross-connection `listAll` plus per-connection `list`,
  `get`, `create`, `confirm`, `cancel`, `listActivities`
- `cruises` / `cruiseBookings` — cruise catalog, search, lock, inquiry,
  sailing pricing/promotions, and booking lifecycle routes
- `health` — `get`

**Flights**

- `flights`

## Notes

- default base URL is `https://api.voyantjs.com`; the SDK targets the
  `/connect/v1/...` path namespace under it
- request auth defaults to `authorization: Bearer <apiKey>`
- response envelopes of the form `{ data: ... }` are unwrapped by default;
  paginated and per-connection Connect reads return their raw shape
- OAuth M2M tokens carry scopes (e.g. `operators:read`, `connections:write`,
  `bookings:write`, `flights:read`); requests fail with `403` if the token
  does not include the required scope
- `bookings.create` accepts an `idempotencyKey` option that is sent as
  the `Idempotency-Key` header
- cross-connection `products.list` / `suppliers.list` / `bookings.listAll`
  use the client-level `operatorId` as default; pass `{ operatorId }` to
  override per call. Both `connectionId` and `providerKey` filters accept
  scalar or array values.
- `flights.searchStream` returns the raw `Response` so callers can stream the
  Server-Sent Events with whichever parser they prefer
- per-connection cruise reads return `ConnectCruiseRow` records with canonical
  cruise projection/provenance fields such as `sourceRef`, `projection`,
  `projectionSchemaVersion`, `lastSourcedAt`, `market`, and `currency` when
  present

For repo-level context, see [../../docs/connect.md](../../docs/connect.md).

# `@voyantjs/connect-sdk`

Public TypeScript client for Voyant Connect APIs — the operator/connection
control plane plus the gateway data plane for products, availability,
bookings, suppliers, flights, and Connect-normalized inventory reads.

## Scope

- operators, connections, links, grants, oauth-clients, oauth tokens
- connector providers and per-operator provider registrations
- webhook subscriptions, deliveries, test events, and replays
- audit logs, usage, invite tokens, custom connection requests
- gateway data plane: products, availability, bookings, suppliers
- Connect-normalized inventory reads (`/v1/connect/...`)
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
});

const operators = await client.operators.list();
const connections = await client.connections.list("op_123");
const booking = await client.gateway.createBooking(
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

const tokenClient = createVoyantConnectClient({ apiKey: "unused", authScheme: null });
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
- `gateway`
- `connect`
- `flights`

## Notes

- default base URL is `https://api.voyantjs.com`
- request auth defaults to `authorization: Bearer <apiKey>`
- response envelopes of the form `{ data: ... }` are unwrapped by default;
  paginated and gateway endpoints return their raw shape
- OAuth M2M tokens carry scopes (e.g. `operators:read`, `connections:write`,
  `bookings:write`, `flights:read`); requests fail with `403` if the token
  does not include the required scope
- `gateway.createBooking` accepts an `idempotencyKey` option that is sent as
  the `Idempotency-Key` header
- `flights.searchStream` returns the raw `Response` so callers can stream the
  Server-Sent Events with whichever parser they prefer

For repo-level context, see [../../docs/connect.md](../../docs/connect.md).

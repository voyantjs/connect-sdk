# Connect SDK

`@voyantjs/connect-sdk` is the public TypeScript client for the Voyant Connect
product — the operator/connection control plane plus the gateway data plane
for inventory, bookings, and flights.

## Current shape

- `oauth` — exchange client credentials for a short-lived bearer token
- `operators` — CRUD plus per-operator usage, products, suppliers, and search
  projections
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
- `gateway` — connection-scoped data plane: products, availability, bookings,
  suppliers, plus booking activity audit trail
- `connect` — Connect-normalized inventory reads from the synced replica
  (suppliers, products, options, units, extras, availability, bookings)
- `flights` — multi-connection and per-connection search, price, book, manage
  orders, seats, ancillaries, exchanges, refunds, check-in, SSRs

## Auth

- a static API key in `Authorization: Bearer <key>` is the default
- for M2M flows use `client.oauth.issueToken({...})` to exchange the OAuth
  client credentials for a short-lived bearer token; the response shape is the
  raw OAuth response (`access_token`, `expires_in`, `scope`)
- both flows authenticate with the same scope-checked routes; the access
  token's `scope` claim must include the scope the route declares

## Idempotency

`gateway.createBooking` accepts `{ idempotencyKey }`, which is sent as
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

const products = await client.connect.listProducts(connection.id);
void products;
```

# Auth And Transport

`@voyantjs/connect-sdk` is built on an internal transport layer shared with
sibling SDK packages.

## Default behavior

- default base URL: `https://api.voyantjs.com`
- default auth header: `authorization`
- default auth scheme: `Bearer`
- default user agent marker: `x-voyant-sdk: voyant-sdk`

## Client options

`@voyantjs/connect-sdk` accepts transport-level options such as:

- `apiKey`
- `baseUrl`
- `authHeader`
- `authScheme`
- `headers`
- `fetch`
- `userAgent`

## Request behavior

- query params skip `null` and `undefined`
- arrays are serialized as repeated query params
- non-`BodyInit` objects are JSON-encoded automatically
- `content-type: application/json` is set for JSON request bodies

## Response behavior

- JSON responses are parsed automatically
- plain text that looks like JSON is parsed defensively
- `{ data: ... }` envelopes are unwrapped by default
- callers can opt out with `unwrapData: false`

## Errors

Non-2xx responses throw `VoyantApiError`, which includes:

- `status`
- `requestId`
- `body`

The request ID should be preserved in logs and support requests whenever
possible.

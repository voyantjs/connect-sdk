# Testing

This repo publishes an SDK package, so tests should focus on client behavior
rather than application behavior.

## What to test

- auth header construction
- query parameter serialization
- JSON request body encoding
- response envelope unwrapping
- non-JSON response handling
- API error construction
- package export shape

## What not to test here

- private business logic from `voyant-cloud`
- database behavior
- product UI behavior
- implementation details that belong to server-side tests

## Recommended layers

- unit tests for `sdk-core` transport behavior
- package tests for Connect client method wiring
- fixture-based response tests for common endpoint shapes
- publish verification tests for package exports and built files

## Current baseline

The repo includes Node-native smoke tests under `tests/` that exercise:

- `sdk-core` transport behavior against mocked `fetch`
- Connect route composition
- raw envelope handling for endpoints that opt out of default unwrapping

## Good test boundaries

- `sdk-core` should be tested with mocked `fetch`
- `@voyantjs/connect-sdk` should verify route composition and option forwarding

## Contract drift

When a route or response contract changes in `voyant-cloud`, update the SDK
tests at the same time so contract drift is visible immediately.

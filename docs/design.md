# SDK Design

This repo should optimize for a clear public SDK, not for mirroring internal
app structure.

## Design goals

- product-scoped packages
- predictable auth and transport behavior
- explicit method names
- stable entrypoints
- easy future split into separate repos if needed

## Client shape

Current design:

- `@voyantjs/connect-sdk` has a root client plus operation-scoped groups
  (`operators`, `connections`, `gateway`, `connect`, `flights`, …)
- shared request machinery lives in `sdk-core`

## Why not one client type for everything

One giant client would make package boundaries and auth stories less clear.

## Naming rule

Prefer names that describe the public action:

- `listConnections`
- `createBooking`
- `searchStream`

Avoid leaking internal route or job terminology unless it is already part of
the public API language.

## Shared runtime rule

If code in `sdk-core` needs to know what a connection, grant, or booking
response means semantically, it probably does not belong in `sdk-core`.
